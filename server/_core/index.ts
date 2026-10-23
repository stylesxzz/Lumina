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
      openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      huggingFaceConfigured: Boolean(process.env.HUGGINGFACE_TOKEN),
      localModelsPath: path.resolve(process.cwd(), "models"),
    });
  });
  app.post("/api/openrouter/chat", async (req, res) => {
    if (!process.env.OPENROUTER_API_KEY) {
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
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
