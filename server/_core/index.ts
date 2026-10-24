import "dotenv/config";
import express from "express";
import { createServer } from "http";
import fs from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

const secretsPath = path.resolve(process.cwd(), "runtime-secrets.json");
const readSecrets = (): { openRouterKey?: string } => {
  try { return JSON.parse(fs.readFileSync(secretsPath, "utf8")); } catch { return {}; }
};
const writeSecrets = (value: { openRouterKey?: string }) => fs.writeFileSync(secretsPath, JSON.stringify(value, null, 2), { mode: 0o600 });
const openRouterKey = () => readSecrets().openRouterKey || process.env.OPENROUTER_API_KEY;

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/manus-routes.json", (_req, res) => {
    const manifestPath = path.resolve(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist/public/manus-routes.json" : "public/manus-routes.json",
    );
    res.type("application/json").send(fs.readFileSync(manifestPath, "utf8"));
  });
  app.get("/api/ai/status", (_req, res) => {
    res.json({
      openRouterConfigured: Boolean(openRouterKey()),
      huggingFaceConfigured: Boolean(process.env.HUGGINGFACE_TOKEN),
      localModelsPath: path.resolve(process.cwd(), "models"),
    });
  });
  app.get("/api/connections/status", (_req, res) => {
    const secrets = readSecrets();
    res.json({ openRouter: Boolean(openRouterKey()) });
  });
  app.post("/api/connections/openrouter", async (req, res) => {
    const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (!apiKey) return res.status(400).json({ error: "Informe uma chave da OpenRouter." });
    try {
      const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!response.ok) return res.status(401).json({ error: "A chave da OpenRouter foi recusada." });
      writeSecrets({ ...readSecrets(), openRouterKey: apiKey });
      return res.json({ connected: true });
    } catch { return res.status(502).json({ error: "Não foi possível validar a OpenRouter agora." }); }
  });
  app.post("/api/openrouter/chat", async (req, res) => {
    if (!openRouterKey()) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY não configurada no ambiente do projeto." });
    }
    const { model, messages, temperature = 0.2 } = req.body ?? {};
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "model e messages são obrigatórios." });
    }
    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "Lumina Studio",
        },
        body: JSON.stringify({ model, messages: messages.slice(-30), temperature, stream: false }),
      });
      const payload = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: payload?.error?.message ?? "OpenRouter recusou a solicitação." });
      return res.json({ content: payload?.choices?.[0]?.message?.content ?? "O modelo não retornou texto.", model });
    } catch (error) {
      console.error("[OpenRouter] request failed", error);
      return res.status(502).json({ error: "Não foi possível alcançar o OpenRouter agora." });
    }
  });
  const mcpConnections = new Map<string, { name: string; url: string; tools: string[]; connectedAt: string }>();
  app.post("/api/files/upload", async (req, res) => {
    const { name, type = "application/octet-stream", data } = req.body ?? {};
    if (typeof name !== "string" || typeof data !== "string" || !data.startsWith("data:")) return res.status(400).json({ error: "name e data em formato data URL são obrigatórios." });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "arquivo";
    const uploadDirectory = path.resolve(process.cwd(), "uploads");
    fs.mkdirSync(uploadDirectory, { recursive: true });
    const match = data.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Arquivo inválido." });
    const buffer = Buffer.from(match[1], "base64");
    if (buffer.byteLength > 50 * 1024 * 1024) return res.status(413).json({ error: "O arquivo excede o limite de 50 MB." });
    const storedName = `${Date.now()}-${safeName}`;
    fs.writeFileSync(path.join(uploadDirectory, storedName), buffer);
    return res.json({ name, storedName, type, size: buffer.byteLength });
  });
  app.get("/api/mcp/servers", (_req, res) => res.json({ servers: Array.from(mcpConnections.values()) }));
  app.post("/api/mcp/connect", async (req, res) => {
    const { url, name, token } = req.body ?? {};
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Use um endpoint MCP HTTP/HTTPS válido." });
    try {
      const headers: Record<string, string> = { Accept: "application/json, text/event-stream", "Content-Type": "application/json" };
      if (typeof token === "string" && token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
      const initialize = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "Lumina Studio", version: "1.0.0" } } }) });
      const raw = await initialize.text();
      if (!initialize.ok) return res.status(initialize.status).json({ error: `MCP respondeu HTTP ${initialize.status}.`, details: raw.slice(0, 500) });
      const sessionId = initialize.headers.get("mcp-session-id");
      const parsed = raw.includes("data:") ? JSON.parse(raw.split("data:").pop()?.trim() || "{}") : JSON.parse(raw || "{}");
      if (parsed.error) return res.status(502).json({ error: parsed.error.message || "O MCP recusou a inicialização." });
      const toolsResponse = await fetch(url, { method: "POST", headers: { ...headers, ...(sessionId ? { "mcp-session-id": sessionId } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) });
      const toolsRaw = await toolsResponse.text();
      const toolsParsed = toolsRaw.includes("data:") ? JSON.parse(toolsRaw.split("data:").pop()?.trim() || "{}") : JSON.parse(toolsRaw || "{}");
      const tools = Array.isArray(toolsParsed?.result?.tools) ? toolsParsed.result.tools.map((tool: { name?: string }) => tool.name).filter(Boolean) : [];
      const connection = { name: typeof name === "string" && name.trim() ? name.trim() : new URL(url).hostname, url, tools, connectedAt: new Date().toISOString() };
      mcpConnections.set(url, connection);
      return res.json({ status: "connected", server: connection });
    } catch (error) {
      console.error("[MCP] connection failed", error);
      return res.status(502).json({ error: "Não foi possível inicializar esse servidor MCP. Confira URL, transporte e credencial." });
    }
  });
  app.get("/api/huggingface/models", async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : "text-generation";
    try {
      const upstream = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(search)}&sort=downloads&direction=-1&limit=12`, {
        headers: process.env.HUGGINGFACE_TOKEN ? { Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}` } : undefined,
      });
      const payload = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: payload?.error ?? "Hugging Face recusou a busca." });
      return res.json({ models: Array.isArray(payload) ? payload : [] });
    } catch (error) {
      console.error("[HuggingFace] search failed", error);
      return res.status(502).json({ error: "Não foi possível buscar modelos no Hugging Face agora." });
    }
  });
  app.post("/api/huggingface/install", async (req, res) => {
    const { repoId, revision = "main" } = req.body ?? {};
    if (typeof repoId !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoId)) {
      return res.status(400).json({ error: "repoId deve estar no formato autor/modelo." });
    }
    try {
      const segments = repoId.split("/").map(segment => encodeURIComponent(segment));
      const infoResponse = await fetch(`https://huggingface.co/api/models/${segments.join("/")}?revision=${encodeURIComponent(revision)}`, {
        headers: process.env.HUGGINGFACE_TOKEN ? { Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}` } : undefined,
      });
      const info = await infoResponse.json();
      if (!infoResponse.ok) return res.status(infoResponse.status).json({ error: info?.error ?? "Modelo não encontrado no Hugging Face." });
      const modelDirectory = path.resolve(process.cwd(), "models", repoId.replace("/", "__"));
      fs.mkdirSync(modelDirectory, { recursive: true });
      const siblings = Array.isArray(info.siblings) ? info.siblings : [];
      const metadataFiles = siblings.map((item: { rfilename?: string }) => item.rfilename).filter((filename: string | undefined) => filename && ["config.json", "tokenizer.json", "tokenizer_config.json", "generation_config.json"].includes(filename));
      const downloaded: string[] = [];
      for (const filename of metadataFiles) {
        const fileResponse = await fetch(`https://huggingface.co/${repoId}/resolve/${encodeURIComponent(revision)}/${filename}`, {
          headers: process.env.HUGGINGFACE_TOKEN ? { Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}` } : undefined,
        });
        if (!fileResponse.ok) continue;
        fs.writeFileSync(path.join(modelDirectory, filename), Buffer.from(await fileResponse.arrayBuffer()));
        downloaded.push(filename);
      }
      const manifest = { repoId, revision, downloaded, siblings: siblings.length, installedAt: new Date().toISOString(), note: "Metadados preparados. Baixe os pesos conforme o runtime local escolhido para este modelo." };
      fs.writeFileSync(path.join(modelDirectory, "lumina-model.json"), JSON.stringify(manifest, null, 2));
      return res.json({ status: "installed", repoId, revision, downloaded, localPath: modelDirectory, totalFiles: siblings.length });
    } catch (error) {
      console.error("[HuggingFace] install failed", error);
      return res.status(502).json({ error: "A instalação foi interrompida ao acessar o Hugging Face." });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
