import {
  Activity,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileCode2,
  GitBranch,
  Globe2,
  Hammer,
  Laptop,
  Link2,
  Loader2,
  Menu,
  MessageSquareText,
  Network,
  Plus,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Profile = "dev" | "security";
type Provider = "local" | "openrouter";
type Panel = "models" | "skills" | "mcp" | "connections" | null;
type Message = { id: number; role: "user" | "assistant" | "system"; content: string; time: string; kind?: "install" | "tool"; pending?: boolean };
type Model = { id: string; name: string; author: string; downloads?: number; pipeline_tag?: string; installed?: boolean; context_length?: number; description?: string; pricing?: { prompt?: string; completion?: string } };

async function readJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(raw.trim().startsWith("<!doctype") || raw.trim().startsWith("<html")
      ? "O servidor retornou HTML em vez de JSON. A rota da API não está disponível neste APK."
      : "Resposta inesperada do servidor (HTTP " + response.status + ").");
  }
  try { return JSON.parse(raw); } catch { throw new Error("A resposta da API contém JSON inválido."); }
}

const now = () => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
const formatDownloads = (value?: number) => !value ? "—" : value > 1000000 ? `${(value / 1000000).toFixed(1)}M` : value > 1000 ? `${Math.round(value / 1000)}k` : String(value);

const profileCopy = {
  dev: {
    label: "Programação & Desenvolvimento",
    short: "DEV",
    title: "Construa sem trocar de contexto.",
    subtitle: "Codifique, instale modelos locais e conecte ferramentas no mesmo chat.",
    system: "Você é uma IA especialista em programação, arquitetura, debugging, DevOps e desenvolvimento seguro. Responda com exemplos práticos e código quando útil.",
    starters: ["Revise este código e encontre bugs", "Crie uma API REST com TypeScript", "Instale um modelo de código local"],
  },
  security: {
    label: "Cibersegurança & Defesa",
    short: "SEC",
    title: "Teste com escopo e controle.",
    subtitle: "Defenda sistemas e conduza pentests autorizados com escopo declarado, aprovação por etapa e rastreabilidade.",
    system: "Você é uma IA especialista em cibersegurança defensiva e pentest autorizado. Antes de qualquer ação ativa, exija alvo, autorização, janela, regras de engajamento e impacto permitido. Priorize threat modeling, hardening, validação segura, evidências e remediação; não ajude abuso, persistência, evasão, roubo de credenciais ou exploração fora do escopo.",
    starters: ["Defina o escopo de um pentest autorizado", "Crie um checklist de hardening", "Conecte um MCP de segurança"],
  },
};

const localModels: Model[] = [
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct", name: "Qwen 2.5 Coder 7B", author: "Qwen", pipeline_tag: "code", installed: false },
  { id: "microsoft/Phi-3.5-mini-instruct", name: "Phi 3.5 Mini", author: "Microsoft", pipeline_tag: "text", installed: false },
  { id: "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct", name: "DeepSeek Coder V2 Lite", author: "DeepSeek AI", pipeline_tag: "code", installed: false },
];

function BrandMark() { return <span className="brand-mark"><img src="/lumina-icon.jpg" alt="Lumina" /></span>; }

export default function Home() {
  const [profile, setProfile] = useState<Profile>("dev");
  const [provider, setProvider] = useState<Provider>("local");
  const [model, setModel] = useState("Qwen/Qwen2.5-Coder-7B-Instruct");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [hfModels, setHfModels] = useState<Model[]>(localModels);
  const [installed, setInstalled] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpServers, setMcpServers] = useState<string[]>(["filesystem · local", "git-tools · local"]);
  const [openRouterModels, setOpenRouterModels] = useState<Model[]>([]);
  const [apiKey, setApiKey] = useState(() => { try { return window.localStorage.getItem("lumina.openrouter.key") || ""; } catch { return ""; } });
  const [openRouterReady, setOpenRouterReady] = useState(false);
  const [hfReady, setHfReady] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<number | null>(null);
  const t = profileCopy[profile];

  useEffect(() => {
    setOpenRouterReady(Boolean(apiKey));
    fetch("/api/ai/status").then(readJsonResponse).then((status) => { setOpenRouterReady(Boolean(apiKey) || Boolean(status.openRouterConfigured)); setHfReady(Boolean(status.huggingFaceConfigured)); }).catch(() => undefined);
  }, [apiKey]);

  useEffect(() => { composerRef.current?.focus(); }, [profile]);

  const visibleModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = provider === "openrouter" ? openRouterModels : hfModels;
    return query ? source.filter((item) => (item.id + " " + item.name + " " + item.author).toLowerCase().includes(query)) : source;
  }, [hfModels, openRouterModels, search, provider]);

  const localReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.startsWith("/install")) return `Entendi. Vou preparar a instalação do modelo local. Abra “Modelos” para escolher o repositório do Hugging Face e iniciar o download dos metadados pelo chat.`;
    if (lower.includes("mcp")) return `O MCP conecta esta IA a dados, ferramentas e fluxos externos. Já deixei dois servidores locais disponíveis. Abra “MCP” para adicionar outro endpoint e controlar o que cada perfil pode usar.`;
    if (profile === "security") return `Para um pentest autorizado, começo pelo escopo, autorização, janela, regras de engajamento, ativos críticos e sinais observáveis. Posso transformar isso em um plano de teste seguro, threat model, checklist de hardening ou runbook de resposta.`;
    if (lower.includes("código") || lower.includes("codigo") || lower.includes("api")) return `Posso trabalhar nisso em etapas: entender o contrato, propor a estrutura, escrever uma primeira implementação e revisar edge cases. Cole o arquivo ou descreva o runtime que você está usando.`;
    return `Estou no modo ${t.short}. Posso executar esse raciocínio com um modelo local, usar o OpenRouter ou chamar ferramentas conectadas por MCP. Diga o resultado que você quer obter.`;
  };

  const addMessage = (message: Message) => setMessages((current) => [...current, message]);

  const installModel = async (repoId: string) => {
    setModel(repoId);
    setProvider("local");
    setPanel(null);
    addMessage({ id: Date.now(), role: "system", content: "Modelo selecionado: " + repoId + ". Selecionar um repositório não baixa os pesos nem habilita inferência offline; esta versão Android ainda precisa de um runtime local compatível para executar modelos.", time: now(), kind: "install" });
    try { window.open("https://huggingface.co/" + repoId, "_blank", "noopener,noreferrer"); } catch { /* WebView may block popups */ }
  };

  const searchHuggingFace = async () => {
    try {
      const query = search.trim();
      const url = "https://huggingface.co/api/models?" + (query ? "search=" + encodeURIComponent(query) + "&" : "") + "sort=downloads&direction=-1&limit=100&full=true";
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error || ("Hugging Face respondeu HTTP " + response.status));
      if (!Array.isArray(payload)) throw new Error("Formato inesperado na busca do Hugging Face.");
      setHfModels(payload.map((item: any) => ({ id: item.id, name: item.id?.split("/").pop() || item.id, author: item.id?.split("/")[0] || "Hugging Face", downloads: item.downloads, pipeline_tag: item.pipeline_tag, description: item.cardData?.description } as Model)));
    } catch (error) {
      addMessage({ id: Date.now(), role: "system", content: "Falha na busca do Hugging Face: " + (error instanceof Error ? error.message : "erro desconhecido"), time: now() });
    }
  };

  const searchOpenRouter = async () => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Accept: "application/json" } });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error?.message || ("OpenRouter respondeu HTTP " + response.status));
      const models = Array.isArray(payload.data) ? payload.data : [];
      const normalized = models.map((item: any) => ({ id: item.id, name: item.name || item.id, author: item.id?.split("/")[0] || "OpenRouter", context_length: item.context_length, description: item.description, pricing: item.pricing } as Model));
      setOpenRouterModels(normalized);
      setModel((current) => current.includes("Qwen/") || current.includes("microsoft/") || current.includes("deepseek-ai/") ? (normalized.find((item: Model) => item.id === "openai/gpt-4o-mini")?.id || normalized[0]?.id || current) : current);
    } catch (error) {
      addMessage({ id: Date.now(), role: "system", content: "Falha ao buscar modelos do OpenRouter: " + (error instanceof Error ? error.message : "erro desconhecido"), time: now() });
    }
  };

  const saveApiKey = (value: string) => {
    setApiKey(value);
    setOpenRouterReady(Boolean(value.trim()));
    try { if (value.trim()) window.localStorage.setItem("lumina.openrouter.key", value.trim()); else window.localStorage.removeItem("lumina.openrouter.key"); } catch { /* storage may be disabled */ }
  };

  const send = async (value = draft) => {
    const text = value.trim();
    if (!text || isThinking) return;
    const userMessage: Message = { id: Date.now(), role: "user", content: text, time: now() };
    addMessage(userMessage); setDraft(""); setIsThinking(true);
    if (text.toLowerCase().startsWith("/install ")) {
      setIsThinking(false); await installModel(text.slice(9).trim()); return;
    }
    const pendingId = Date.now() + 1;
    addMessage({ id: pendingId, role: "assistant", content: "", time: now(), pending: true });
    try {
      let content = "";
      if (provider === "openrouter") {
        if (!apiKey.trim()) throw new Error("Configure sua chave de API do OpenRouter em Conexões antes de enviar mensagens.");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey.trim(), "HTTP-Referer": window.location.origin, "X-OpenRouter-Title": "Lumina Studio" }, body: JSON.stringify({ model, messages: [{ role: "system", content: t.system }, ...messages.filter((item) => item.role !== "system").slice(-10).map((item) => ({ role: item.role, content: item.content })), { role: "user", content: text }] }) });
        const payload = await readJsonResponse(response);
        if (!response.ok) throw new Error(payload.error?.message || payload.error || ("OpenRouter respondeu HTTP " + response.status));
        content = payload.choices?.[0]?.message?.content || "O modelo não retornou texto.";
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 560));
        content = localReply(text);
      }
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content, pending: false, time: now() } : item));
    } catch (error) {
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content: `${error instanceof Error ? error.message : "Falha no provedor"}. Você pode voltar para o modo Local e continuar sem chave externa.`, pending: false } : item));
    } finally { setIsThinking(false); }
  };

  const clearChat = () => { setMessages([]); setDraft(""); setPanel(null); setMobileMenu(false); };
  const copyMessage = async (message: Message) => { try { await navigator.clipboard.writeText(message.content); } catch { /* Preview can block clipboard */ } setCopiedId(message.id); if (copyTimer.current) window.clearTimeout(copyTimer.current); copyTimer.current = window.setTimeout(() => setCopiedId(null), 1400); };
  const connectMcp = () => { const value = mcpUrl.trim(); if (!value) return; setMcpServers((current) => [...current, value]); setMcpUrl(""); };

  return <div className="lumina-app studio-app">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="sidebar-top"><button className="wordmark" onClick={clearChat}><BrandMark /><span>lumina</span></button><button className="sidebar-collapse" onClick={() => setMobileMenu(false)}><X size={17} /></button></div>
      <button className="new-chat-button" onClick={clearChat}><Plus size={17} /><span>Nova sessão</span><span className="shortcut">⌘ K</span></button>
      <nav className="sidebar-nav">
        <button className={`nav-item ${panel === null ? "nav-item-active" : ""}`} onClick={() => setPanel(null)}><MessageSquareText size={17} /><span>Chat</span></button>
        <button className={`nav-item ${panel === "models" ? "nav-item-active" : ""}`} onClick={() => setPanel("models")}><Download size={17} /><span>Modelos locais</span><span className="nav-badge">HF</span></button>
        <button className={`nav-item ${panel === "skills" ? "nav-item-active" : ""}`} onClick={() => setPanel("skills")}><Wrench size={17} /><span>Skills</span></button>
        <button className={`nav-item ${panel === "mcp" ? "nav-item-active" : ""}`} onClick={() => setPanel("mcp")}><Network size={17} /><span>MCP</span><span className="nav-badge nav-badge-green">{mcpServers.length}</span></button>
        <button className={`nav-item ${panel === "connections" ? "nav-item-active" : ""}`} onClick={() => setPanel("connections")}><Link2 size={17} /><span>Conexões</span></button>
      </nav>
      <div className="sidebar-section-label">Sessões recentes</div><div className="recent-list">{messages.length ? <button className="recent-item" onClick={() => setPanel(null)}><span className="recent-dot" /><span className="recent-text">Sessão {profile === "dev" ? "de desenvolvimento" : "de defesa"}</span></button> : <p className="empty-recent">Suas sessões aparecem aqui.</p>}</div>
      <div className="sidebar-bottom"><div className="runtime-card"><div className="runtime-head"><span className="live-dot" /> Runtime local <span className="runtime-ready">pronto</span></div><div className="runtime-row"><Laptop size={14} /> <span>Modelos instalados</span><strong>{installed.length}</strong></div><div className="runtime-row"><TerminalSquare size={14} /> <span>MCP ativo</span><strong>{mcpServers.length}</strong></div></div><button className="profile-row" onClick={() => setPanel("connections")}><span className="avatar">LU</span><span className="profile-copy"><strong>Lumina</strong><small>Cybersecurity local-first</small></span><Settings2 size={16} /></button></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}
    <main className="main-panel">
      <header className="topbar studio-topbar"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="workspace-switcher"><button className={profile === "dev" ? "workspace-active workspace-dev" : ""} onClick={() => setProfile("dev")}><Code2 size={15} /><span>DEV</span><small>Programação</small></button><button className={profile === "security" ? "workspace-active workspace-sec" : ""} onClick={() => setProfile("security")}><ShieldCheck size={15} /><span>SEC</span><small>Cibersegurança</small></button></div><div className="topbar-tools"><span className="free-pill"><span className="live-dot" /> local-first</span><button className="icon-button" onClick={() => setPanel("connections")} title="Conexões"><Link2 size={17} /></button><button className="icon-button" onClick={() => setPanel("mcp")} title="MCP"><Network size={17} /></button></div></header>
      <div className="studio-body">
        {panel ? <PanelView panel={panel} profile={profile} provider={provider} setProvider={setProvider} model={model} setModel={setModel} search={search} setSearch={setSearch} visibleModels={visibleModels} hfReady={hfReady} installed={installed} installing={installing} installModel={installModel} searchHuggingFace={searchHuggingFace} searchOpenRouter={searchOpenRouter} openRouterReady={openRouterReady} apiKey={apiKey} saveApiKey={saveApiKey} mcpUrl={mcpUrl} setMcpUrl={setMcpUrl} mcpServers={mcpServers} connectMcp={connectMcp} setPanel={setPanel} /> : <section className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {!messages.length ? <div className="welcome-state studio-welcome"><div className="welcome-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className={`welcome-mark ${profile === "security" ? "security-mark" : ""}`}>{profile === "security" ? <ShieldCheck size={30} /> : <Code2 size={30} />}</div></div><p className={`eyebrow ${profile === "security" ? "security-eyebrow" : ""}`}>{t.label}</p><h1>{t.title}</h1><p className="welcome-copy">{t.subtitle}</p><div className="mode-pills"><span><span className="live-dot" /> Modelo: {provider === "local" ? "local" : "OpenRouter"}</span><span><Network size={12} /> {mcpServers.length} MCP conectados</span><span><Wrench size={12} /> Skills disponíveis</span></div><div className="starter-actions"><button className="starter-card" onClick={() => setPanel("models")}><span className="starter-icon"><Download size={18} /></span><span className="starter-card-copy"><strong>Instalar modelo local</strong><small>Hugging Face direto no chat</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("connections")}><span className="starter-icon"><Globe2 size={18} /></span><span className="starter-card-copy"><strong>Conectar OpenRouter</strong><small>Use qualquer modelo da API</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("mcp")}><span className="starter-icon"><Network size={18} /></span><span className="starter-card-copy"><strong>Adicionar MCP</strong><small>Ferramentas e dados externos</small></span><ArrowUp size={15} className="starter-arrow" /></button></div></div> : <div className="messages-wrap"><div className="conversation-heading"><div><span className="eyebrow">Sessão {t.short} · {provider === "local" ? "Runtime local" : "OpenRouter"}</span><h2>{t.label}</h2></div><button className="quiet-action" onClick={clearChat}><Plus size={15} /> Nova sessão</button></div><div className="messages-list">{messages.map((message) => <article key={message.id} className={`message-row message-${message.role}`}><div className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : message.role === "system" ? "system-avatar" : "user-avatar"}`}>{message.role === "assistant" ? <BrandMark /> : message.role === "system" ? <Download size={14} /> : "LS"}</div><div className="message-content"><div className="message-meta"><strong>{message.role === "assistant" ? (provider === "local" ? "Local AI" : "OpenRouter") : message.role === "system" ? "Runtime" : "Você"}</strong><span>{message.time}</span></div>{message.pending ? <div className="typing-bubble"><span /><span /><span /></div> : <p className="message-text">{message.content}</p>}{message.role === "user" && <div className="message-actions"><button onClick={() => copyMessage(message)}>{copiedId === message.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === message.id ? "Copiado" : "Copiar"}</button><button onClick={() => { setDraft(message.content); composerRef.current?.focus(); }}><RotateCcw size={13} /> Reusar</button></div>}</div></article>)}</div></div>}
        </section>}
      </div>
      <div className="composer-area"><div className="composer"><div className="composer-toolbar"><button className="composer-plus" onClick={() => setPanel("models")}><Plus size={19} /></button><div className="runtime-selector"><span className={provider === "local" ? "selector-active" : ""} onClick={() => setProvider("local")}><Laptop size={12} /> Local</span><span className={provider === "openrouter" ? "selector-active" : ""} onClick={() => setProvider("openrouter")}><Globe2 size={12} /> OpenRouter</span></div><span className="composer-spacer" /><button className="model-selector" onClick={() => setPanel("models")}><Bot size={13} /> {model.split("/").pop()} <ChevronDown size={13} /></button></div><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={profile === "dev" ? "Pergunte, cole código ou use /install autor/modelo…" : "Analise um risco, log ou cenário defensivo…"} rows={2} /><div className="composer-bottom"><div className="composer-hint"><Activity size={13} /> {provider === "local" ? "Execução local · sem plano pago" : openRouterReady ? "OpenRouter conectado" : "Configure OPENROUTER_API_KEY em Conexões"}</div><button className={`send-button ${draft.trim() ? "send-ready" : ""}`} onClick={() => void send()} disabled={!draft.trim() || isThinking}>{isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}</button></div></div><p className="composer-disclaimer">Ações externas devem ser autorizadas. Modelos e ferramentas ficam sob seu controle.</p></div>
    </main>
  </div>;
}

function PanelView(props: { panel: Exclude<Panel, null>; profile: Profile; provider: Provider; setProvider: (value: Provider) => void; model: string; setModel: (value: string) => void; search: string; setSearch: (value: string) => void; visibleModels: Model[]; hfReady: boolean; installed: string[]; installing: string | null; installModel: (repoId: string) => Promise<void>; searchHuggingFace: () => Promise<void>; searchOpenRouter: () => Promise<void>; openRouterReady: boolean; apiKey: string; saveApiKey: (value: string) => void; mcpUrl: string; setMcpUrl: (value: string) => void; mcpServers: string[]; connectMcp: () => void; setPanel: (panel: Panel) => void }) {
  const { panel, provider, setProvider, model, setModel, search, setSearch, visibleModels, hfReady, installed, installing, installModel, searchHuggingFace, searchOpenRouter, openRouterReady, apiKey, saveApiKey, mcpUrl, setMcpUrl, mcpServers, connectMcp, setPanel } = props;
  if (panel === "models") return <section className="control-panel"><PanelHeader icon={<Download size={19} />} eyebrow={provider === "local" ? "Hugging Face Hub" : "OpenRouter Catalog"} title={provider === "local" ? "Modelos locais" : "Modelos de API"} description={provider === "local" ? "Pesquise até 100 repositórios por consulta no catálogo público do Hugging Face." : "Catálogo completo de modelos disponíveis no OpenRouter; pesquise por nome ou provedor."} onClose={() => setPanel(null)} /><div className="panel-callout"><Laptop size={16} /><span><strong>{provider === "local" ? "Atenção: runtime local" : "API na nuvem"}</strong><small>{provider === "local" ? "A busca encontra repositórios, mas esta versão Android ainda não instala pesos nem executa inferência offline. Selecione um modelo para abrir sua página oficial." : "Escolha um modelo e envie mensagens usando sua chave pessoal do OpenRouter, configurada em Conexões."}</small></span><span className={provider === "openrouter" && openRouterReady ? "status-good" : "status-muted"}>{provider === "openrouter" ? (openRouterReady ? "API pronta" : "sem chave") : (hfReady ? "token ativo" : "públicos")}</span></div><div className="runtime-selector"><span className={provider === "local" ? "selector-active" : ""} onClick={() => setProvider("local")}>Hugging Face</span><span className={provider === "openrouter" ? "selector-active" : ""} onClick={() => { setProvider("openrouter"); void searchOpenRouter(); }}>OpenRouter</span></div><div className="search-row"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void (provider === "local" ? searchHuggingFace() : searchOpenRouter()); }} placeholder={provider === "local" ? "Buscar qualquer modelo: Qwen, Llama, GGUF…" : "Buscar modelo ou provedor: anthropic, openai…"} /><button onClick={() => void (provider === "local" ? searchHuggingFace() : searchOpenRouter())}>Buscar</button></div><div className="model-grid">{visibleModels.map((item) => <article className="model-card" key={item.id}><div className="model-card-top"><span className="model-icon"><Code2 size={17} /></span><span className="model-tag">{item.pipeline_tag || (item.context_length ? item.context_length.toLocaleString() + " tokens" : "model")}</span></div><strong>{item.name || item.id}</strong><small>{item.author || item.id.split("/")[0]}</small><div className="model-stats"><span>{item.downloads !== undefined ? formatDownloads(item.downloads) + " downloads" : (item.pricing ? "Entrada: $" + (item.pricing.prompt || "?") + " / token" : "Modelo disponível")}</span><span>{item.id}</span></div><button className="install-button" onClick={() => { if (provider === "local") void installModel(item.id); else { setModel(item.id); setPanel(null); } }}>{provider === "local" ? "Ver / selecionar modelo" : (model === item.id ? "Modelo selecionado" : "Usar este modelo")}</button></article>)}</div></section>;
  if (panel === "skills") return <section className="control-panel"><PanelHeader icon={<Wrench size={19} />} eyebrow="Skills" title="Habilidades do agente" description="Ative instruções especializadas por sessão sem trocar de aplicativo." onClose={() => setPanel(null)} /><div className="skill-list">{[{ icon: Code2, title: "Code Architect", text: "Arquitetura, TypeScript, testes e revisão de código." }, { icon: ShieldCheck, title: "Authorized Pentest", text: "Reconhecimento e validação somente com escopo, autorização e aprovação por etapa." }, { icon: ShieldCheck, title: "Defensive Security", text: "Threat modeling, hardening, SOC e resposta a incidentes." }, { icon: GitBranch, title: "Git Operator", text: "Branches, commits, diffs e automações com confirmação." }, { icon: TerminalSquare, title: "Terminal Safe Mode", text: "Comandos rastreáveis, sem execução destrutiva por padrão." }].map(({ icon: Icon, title, text }) => <button className="skill-card" key={title}><span className="skill-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{text}</small></span><span className="toggle toggle-on"><span /></span></button>)}</div><div className="panel-note"><ShieldCheck size={15} /> Pentest ativo exige escopo declarado e confirmação humana. Skills são instruções; MCPs fornecem ferramentas e dados.</div></section>;
  if (panel === "mcp") return <section className="control-panel"><PanelHeader icon={<Network size={19} />} eyebrow="Model Context Protocol" title="Servidores MCP" description="Conecte ferramentas e dados externos para os dois perfis de IA." onClose={() => setPanel(null)} /><div className="mcp-list">{mcpServers.map((server) => <div className="mcp-row" key={server}><span className="mcp-status"><span className="live-dot" /></span><span><strong>{server.split(" · ")[0]}</strong><small>{server.includes("local") ? "servidor local · ferramentas autorizadas" : "endpoint conectado"}</small></span><button><Settings2 size={15} /></button></div>)}</div><div className="mcp-add"><label>Endpoint MCP</label><div className="search-row"><Server size={16} /><input value={mcpUrl} onChange={(event) => setMcpUrl(event.target.value)} placeholder="http://localhost:3001/mcp" /><button onClick={connectMcp}>Conectar</button></div></div><div className="panel-note"><ShieldCheck size={15} /> Conecte apenas servidores que você controla ou confia. A IA pedirá confirmação antes de ações sensíveis.</div></section>;
  return <section className="control-panel"><PanelHeader icon={<Link2 size={19} />} eyebrow="Runtime e provedores" title="Conexões" description="O app não tem planos pagos. Você escolhe onde executar cada sessão e mantém suas próprias chaves." onClose={() => setPanel(null)} /><div className="connection-card"><div className="connection-icon"><Laptop size={18} /></div><div><strong>Runtime local</strong><small>Disponível agora · respostas de fallback e modelos preparados no projeto</small></div><span className="connection-status"><span className="live-dot" /> ativo</span></div><div className="connection-card"><div className="connection-icon openrouter-icon"><Globe2 size={18} /></div><div className="connection-main"><strong>OpenRouter API</strong><small>{openRouterReady ? "Chave salva neste dispositivo" : "Cole sua chave para ativar o chat e os modelos da API"}</small><input type="password" autoComplete="off" value={apiKey} onChange={(event) => saveApiKey(event.target.value)} placeholder="sk-or-v1-…" aria-label="Chave de API do OpenRouter" /></div><span className={openRouterReady ? "connection-status" : "connection-status status-muted"}>{openRouterReady ? "conectado" : "sem chave"}</span></div><div className="connection-card"><div className="connection-icon"><Download size={18} /></div><div><strong>Hugging Face Hub</strong><small>Busca pública liberada; token opcional para repositórios privados</small></div><span className="connection-status"><span className="live-dot" /> pronto</span></div><div className="panel-note"><Zap size={15} /> Nenhum plano é cobrado pelo Lumina. O OpenRouter pode cobrar conforme a chave e o modelo que você escolher.</div></section>;
}

function PanelHeader({ icon, eyebrow, title, description, onClose }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; onClose: () => void }) { return <div className="panel-header"><div className="panel-heading"><span className="panel-icon">{icon}</span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button className="panel-close" onClick={onClose}><X size={18} /></button></div>; }
