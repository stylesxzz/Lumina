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
type Model = { id: string; name: string; author: string; downloads?: number; pipeline_tag?: string; installed?: boolean };

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
    title: "Defenda com contexto e controle.",
    subtitle: "Analise riscos, fortaleça sistemas e use ferramentas defensivas com rastreabilidade.",
    system: "Você é uma IA especialista em cibersegurança defensiva, threat modeling, hardening, SOC, resposta a incidentes e privacidade. Recuse abuso e mantenha as orientações em defesa autorizada.",
    starters: ["Faça um threat model deste sistema", "Crie um checklist de hardening", "Conecte um MCP de segurança"],
  },
};

const localModels: Model[] = [
  { id: "Qwen/Qwen2.5-Coder-7B-Instruct", name: "Qwen 2.5 Coder 7B", author: "Qwen", pipeline_tag: "code", installed: false },
  { id: "microsoft/Phi-3.5-mini-instruct", name: "Phi 3.5 Mini", author: "Microsoft", pipeline_tag: "text", installed: false },
  { id: "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct", name: "DeepSeek Coder V2 Lite", author: "DeepSeek AI", pipeline_tag: "code", installed: false },
];

function BrandMark() { return <span className="brand-mark"><Sparkles size={17} /></span>; }

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
  const [openRouterReady, setOpenRouterReady] = useState(false);
  const [hfReady, setHfReady] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<number | null>(null);
  const t = profileCopy[profile];

  useEffect(() => {
    fetch("/api/ai/status").then((response) => response.json()).then((status) => { setOpenRouterReady(Boolean(status.openRouterConfigured)); setHfReady(Boolean(status.huggingFaceConfigured)); }).catch(() => undefined);
  }, []);

  useEffect(() => { composerRef.current?.focus(); }, [profile]);

  const visibleModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? hfModels.filter((item) => `${item.id} ${item.name}`.toLowerCase().includes(query)) : hfModels;
  }, [hfModels, search]);

  const localReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.startsWith("/install")) return `Entendi. Vou preparar a instalação do modelo local. Abra “Modelos” para escolher o repositório do Hugging Face e iniciar o download dos metadados pelo chat.`;
    if (lower.includes("mcp")) return `O MCP conecta esta IA a dados, ferramentas e fluxos externos. Já deixei dois servidores locais disponíveis. Abra “MCP” para adicionar outro endpoint e controlar o que cada perfil pode usar.`;
    if (profile === "security") return `Para uma análise defensiva, eu começaria pelo escopo, ativos críticos, trust boundaries e sinais observáveis. Posso transformar isso em um threat model, checklist de hardening ou runbook de resposta.`;
    if (lower.includes("código") || lower.includes("codigo") || lower.includes("api")) return `Posso trabalhar nisso em etapas: entender o contrato, propor a estrutura, escrever uma primeira implementação e revisar edge cases. Cole o arquivo ou descreva o runtime que você está usando.`;
    return `Estou no modo ${t.short}. Posso executar esse raciocínio com um modelo local, usar o OpenRouter ou chamar ferramentas conectadas por MCP. Diga o resultado que você quer obter.`;
  };

  const addMessage = (message: Message) => setMessages((current) => [...current, message]);

  const installModel = async (repoId: string) => {
    setInstalling(repoId);
    const pendingId = Date.now();
    addMessage({ id: pendingId, role: "system", content: `Instalando ${repoId} a partir do Hugging Face…`, time: now(), kind: "install", pending: true });
    try {
      const response = await fetch("/api/huggingface/install", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repoId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao instalar");
      setInstalled((current) => [...new Set([...current, repoId])]);
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content: `Modelo preparado: ${repoId}. ${payload.downloaded?.length ?? 0} arquivos de configuração foram baixados para o runtime local.`, pending: false } : item));
    } catch (error) {
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content: `Não consegui instalar agora. ${error instanceof Error ? error.message : "Verifique a conexão com o Hugging Face."}`, pending: false } : item));
    } finally { setInstalling(null); }
  };

  const searchHuggingFace = async () => {
    if (!search.trim()) return;
    try {
      const response = await fetch(`/api/huggingface/models?search=${encodeURIComponent(search)}`);
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.models)) setHfModels(payload.models.map((item: Model) => ({ ...item, name: item.id.split("/").pop() || item.id, author: item.id.split("/")[0] })));
    } catch { /* keep local catalog */ }
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
      if (provider === "openrouter" && openRouterReady) {
        const response = await fetch("/api/openrouter/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: t.system }, ...messages.filter((item) => item.role !== "system").slice(-10).map((item) => ({ role: item.role, content: item.content })), { role: "user", content: text }] }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "OpenRouter indisponível");
        content = payload.content;
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
      <div className="sidebar-top"><button className="wordmark" onClick={clearChat}><BrandMark /><span>lumina<span className="wordmark-suffix"> studio</span></span></button><button className="sidebar-collapse" onClick={() => setMobileMenu(false)}><X size={17} /></button></div>
      <button className="new-chat-button" onClick={clearChat}><Plus size={17} /><span>Nova sessão</span><span className="shortcut">⌘ K</span></button>
      <nav className="sidebar-nav">
        <button className={`nav-item ${panel === null ? "nav-item-active" : ""}`} onClick={() => setPanel(null)}><MessageSquareText size={17} /><span>Chat</span></button>
        <button className={`nav-item ${panel === "models" ? "nav-item-active" : ""}`} onClick={() => setPanel("models")}><Download size={17} /><span>Modelos locais</span><span className="nav-badge">HF</span></button>
        <button className={`nav-item ${panel === "skills" ? "nav-item-active" : ""}`} onClick={() => setPanel("skills")}><Wrench size={17} /><span>Skills</span></button>
        <button className={`nav-item ${panel === "mcp" ? "nav-item-active" : ""}`} onClick={() => setPanel("mcp")}><Network size={17} /><span>MCP</span><span className="nav-badge nav-badge-green">{mcpServers.length}</span></button>
        <button className={`nav-item ${panel === "connections" ? "nav-item-active" : ""}`} onClick={() => setPanel("connections")}><Link2 size={17} /><span>Conexões</span></button>
      </nav>
      <div className="sidebar-section-label">Sessões recentes</div><div className="recent-list">{messages.length ? <button className="recent-item" onClick={() => setPanel(null)}><span className="recent-dot" /><span className="recent-text">Sessão {profile === "dev" ? "de desenvolvimento" : "de defesa"}</span></button> : <p className="empty-recent">Suas sessões aparecem aqui.</p>}</div>
      <div className="sidebar-bottom"><div className="runtime-card"><div className="runtime-head"><span className="live-dot" /> Runtime local <span className="runtime-ready">pronto</span></div><div className="runtime-row"><Laptop size={14} /> <span>Modelos instalados</span><strong>{installed.length}</strong></div><div className="runtime-row"><TerminalSquare size={14} /> <span>MCP ativo</span><strong>{mcpServers.length}</strong></div></div><button className="profile-row" onClick={() => setPanel("connections")}><span className="avatar">LS</span><span className="profile-copy"><strong>Local Studio</strong><small>Sem planos pagos</small></span><Settings2 size={16} /></button></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}
    <main className="main-panel">
      <header className="topbar studio-topbar"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><div className="workspace-switcher"><button className={profile === "dev" ? "workspace-active workspace-dev" : ""} onClick={() => setProfile("dev")}><Code2 size={15} /><span>DEV</span><small>Programação</small></button><button className={profile === "security" ? "workspace-active workspace-sec" : ""} onClick={() => setProfile("security")}><ShieldCheck size={15} /><span>SEC</span><small>Cibersegurança</small></button></div><div className="topbar-tools"><span className="free-pill"><span className="live-dot" /> local-first</span><button className="icon-button" onClick={() => setPanel("connections")} title="Conexões"><Link2 size={17} /></button><button className="icon-button" onClick={() => setPanel("mcp")} title="MCP"><Network size={17} /></button></div></header>
      <div className="studio-body">
        {panel ? <PanelView panel={panel} profile={profile} search={search} setSearch={setSearch} visibleModels={visibleModels} hfReady={hfReady} installed={installed} installing={installing} installModel={installModel} searchHuggingFace={searchHuggingFace} openRouterReady={openRouterReady} mcpUrl={mcpUrl} setMcpUrl={setMcpUrl} mcpServers={mcpServers} connectMcp={connectMcp} setPanel={setPanel} /> : <section className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {!messages.length ? <div className="welcome-state studio-welcome"><div className="welcome-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className={`welcome-mark ${profile === "security" ? "security-mark" : ""}`}>{profile === "security" ? <ShieldCheck size={30} /> : <Code2 size={30} />}</div></div><p className={`eyebrow ${profile === "security" ? "security-eyebrow" : ""}`}>{t.label}</p><h1>{t.title}</h1><p className="welcome-copy">{t.subtitle}</p><div className="mode-pills"><span><span className="live-dot" /> Modelo: {provider === "local" ? "local" : "OpenRouter"}</span><span><Network size={12} /> {mcpServers.length} MCP conectados</span><span><Wrench size={12} /> Skills disponíveis</span></div><div className="starter-actions"><button className="starter-card" onClick={() => setPanel("models")}><span className="starter-icon"><Download size={18} /></span><span className="starter-card-copy"><strong>Instalar modelo local</strong><small>Hugging Face direto no chat</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("connections")}><span className="starter-icon"><Globe2 size={18} /></span><span className="starter-card-copy"><strong>Conectar OpenRouter</strong><small>Use qualquer modelo da API</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("mcp")}><span className="starter-icon"><Network size={18} /></span><span className="starter-card-copy"><strong>Adicionar MCP</strong><small>Ferramentas e dados externos</small></span><ArrowUp size={15} className="starter-arrow" /></button></div></div> : <div className="messages-wrap"><div className="conversation-heading"><div><span className="eyebrow">Sessão {t.short} · {provider === "local" ? "Runtime local" : "OpenRouter"}</span><h2>{t.label}</h2></div><button className="quiet-action" onClick={clearChat}><Plus size={15} /> Nova sessão</button></div><div className="messages-list">{messages.map((message) => <article key={message.id} className={`message-row message-${message.role}`}><div className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : message.role === "system" ? "system-avatar" : "user-avatar"}`}>{message.role === "assistant" ? <BrandMark /> : message.role === "system" ? <Download size={14} /> : "LS"}</div><div className="message-content"><div className="message-meta"><strong>{message.role === "assistant" ? (provider === "local" ? "Local AI" : "OpenRouter") : message.role === "system" ? "Runtime" : "Você"}</strong><span>{message.time}</span></div>{message.pending ? <div className="typing-bubble"><span /><span /><span /></div> : <p className="message-text">{message.content}</p>}{message.role === "user" && <div className="message-actions"><button onClick={() => copyMessage(message)}>{copiedId === message.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === message.id ? "Copiado" : "Copiar"}</button><button onClick={() => { setDraft(message.content); composerRef.current?.focus(); }}><RotateCcw size={13} /> Reusar</button></div>}</div></article>)}</div></div>}
        </section>}
      </div>
      <div className="composer-area"><div className="composer"><div className="composer-toolbar"><button className="composer-plus" onClick={() => setPanel("models")}><Plus size={19} /></button><div className="runtime-selector"><span className={provider === "local" ? "selector-active" : ""} onClick={() => setProvider("local")}><Laptop size={12} /> Local</span><span className={provider === "openrouter" ? "selector-active" : ""} onClick={() => setProvider("openrouter")}><Globe2 size={12} /> OpenRouter</span></div><span className="composer-spacer" /><button className="model-selector" onClick={() => setPanel("models")}><Bot size={13} /> {model.split("/").pop()} <ChevronDown size={13} /></button></div><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={profile === "dev" ? "Pergunte, cole código ou use /install autor/modelo…" : "Analise um risco, log ou cenário defensivo…"} rows={2} /><div className="composer-bottom"><div className="composer-hint"><Activity size={13} /> {provider === "local" ? "Execução local · sem plano pago" : openRouterReady ? "OpenRouter conectado" : "Configure OPENROUTER_API_KEY em Conexões"}</div><button className={`send-button ${draft.trim() ? "send-ready" : ""}`} onClick={() => void send()} disabled={!draft.trim() || isThinking}>{isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}</button></div></div><p className="composer-disclaimer">Ações externas devem ser autorizadas. Modelos e ferramentas ficam sob seu controle.</p></div>
    </main>
  </div>;
}

function PanelView(props: { panel: Exclude<Panel, null>; profile: Profile; search: string; setSearch: (value: string) => void; visibleModels: Model[]; hfReady: boolean; installed: string[]; installing: string | null; installModel: (repoId: string) => Promise<void>; searchHuggingFace: () => Promise<void>; openRouterReady: boolean; mcpUrl: string; setMcpUrl: (value: string) => void; mcpServers: string[]; connectMcp: () => void; setPanel: (panel: Panel) => void }) {
  const { panel, search, setSearch, visibleModels, hfReady, installed, installing, installModel, searchHuggingFace, openRouterReady, mcpUrl, setMcpUrl, mcpServers, connectMcp, setPanel } = props;
  if (panel === "models") return <section className="control-panel"><PanelHeader icon={<Download size={19} />} eyebrow="Hugging Face Hub" title="Modelos locais" description="Busque repositórios e prepare modelos para o runtime local diretamente nesta conversa." onClose={() => setPanel(null)} /><div className="panel-callout"><Laptop size={16} /><span><strong>Instalação local</strong><small>Metadados e arquivos essenciais são baixados para a pasta de modelos do projeto. Pesos grandes dependem do runtime escolhido.</small></span><span className={hfReady ? "status-good" : "status-muted"}>{hfReady ? "token ativo" : "públicos"}</span></div><div className="search-row"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchHuggingFace(); }} placeholder="Buscar Qwen, Llama, Coder…" /><button onClick={() => void searchHuggingFace()}>Buscar</button></div><div className="model-grid">{visibleModels.map((item) => <article className="model-card" key={item.id}><div className="model-card-top"><span className="model-icon"><Code2 size={17} /></span><span className="model-tag">{item.pipeline_tag || "model"}</span></div><strong>{item.name || item.id}</strong><small>{item.author || item.id.split("/")[0]}</small><div className="model-stats"><span>{formatDownloads(item.downloads)} downloads</span><span>{item.id}</span></div><button className={`install-button ${installed.includes(item.id) ? "installed-button" : ""}`} onClick={() => void installModel(item.id)} disabled={installing === item.id || installed.includes(item.id)}>{installing === item.id ? <Loader2 size={14} className="spin" /> : installed.includes(item.id) ? <Check size={14} /> : <Download size={14} />} {installed.includes(item.id) ? "Preparado" : installing === item.id ? "Instalando…" : "Instalar pelo chat"}</button></article>)}</div></section>;
  if (panel === "skills") return <section className="control-panel"><PanelHeader icon={<Wrench size={19} />} eyebrow="Skills" title="Habilidades do agente" description="Ative instruções especializadas por sessão sem trocar de aplicativo." onClose={() => setPanel(null)} /><div className="skill-list">{[{ icon: Code2, title: "Code Architect", text: "Arquitetura, TypeScript, testes e revisão de código." }, { icon: ShieldCheck, title: "Defensive Security", text: "Threat modeling, hardening, SOC e resposta a incidentes." }, { icon: GitBranch, title: "Git Operator", text: "Branches, commits, diffs e automações com confirmação." }, { icon: TerminalSquare, title: "Terminal Safe Mode", text: "Comandos rastreáveis, sem execução destrutiva por padrão." }].map(({ icon: Icon, title, text }) => <button className="skill-card" key={title}><span className="skill-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{text}</small></span><span className="toggle toggle-on"><span /></span></button>)}</div><div className="panel-note"><Sparkles size={15} /> Skills são instruções reutilizáveis. MCPs fornecem ferramentas e dados.</div></section>;
  if (panel === "mcp") return <section className="control-panel"><PanelHeader icon={<Network size={19} />} eyebrow="Model Context Protocol" title="Servidores MCP" description="Conecte ferramentas e dados externos para os dois perfis de IA." onClose={() => setPanel(null)} /><div className="mcp-list">{mcpServers.map((server) => <div className="mcp-row" key={server}><span className="mcp-status"><span className="live-dot" /></span><span><strong>{server.split(" · ")[0]}</strong><small>{server.includes("local") ? "servidor local · ferramentas autorizadas" : "endpoint conectado"}</small></span><button><Settings2 size={15} /></button></div>)}</div><div className="mcp-add"><label>Endpoint MCP</label><div className="search-row"><Server size={16} /><input value={mcpUrl} onChange={(event) => setMcpUrl(event.target.value)} placeholder="http://localhost:3001/mcp" /><button onClick={connectMcp}>Conectar</button></div></div><div className="panel-note"><ShieldCheck size={15} /> Conecte apenas servidores que você controla ou confia. A IA pedirá confirmação antes de ações sensíveis.</div></section>;
  return <section className="control-panel"><PanelHeader icon={<Link2 size={19} />} eyebrow="Runtime e provedores" title="Conexões" description="O app não tem planos pagos. Você escolhe onde executar cada sessão e mantém suas próprias chaves." onClose={() => setPanel(null)} /><div className="connection-card"><div className="connection-icon"><Laptop size={18} /></div><div><strong>Runtime local</strong><small>Disponível agora · respostas de fallback e modelos preparados no projeto</small></div><span className="connection-status"><span className="live-dot" /> ativo</span></div><div className="connection-card"><div className="connection-icon openrouter-icon"><Globe2 size={18} /></div><div><strong>OpenRouter API</strong><small>{openRouterReady ? "Chave configurada no ambiente seguro do projeto" : "Configure OPENROUTER_API_KEY no ambiente do projeto"}</small></div><span className={openRouterReady ? "connection-status" : "connection-status status-muted"}>{openRouterReady ? "conectado" : "não configurado"}</span></div><div className="connection-card"><div className="connection-icon"><Download size={18} /></div><div><strong>Hugging Face Hub</strong><small>Busca pública liberada; token opcional para repositórios privados</small></div><span className="connection-status"><span className="live-dot" /> pronto</span></div><div className="panel-note"><Zap size={15} /> Nenhum plano é cobrado pelo Lumina. O OpenRouter pode cobrar conforme a chave e o modelo que você escolher.</div></section>;
}

function PanelHeader({ icon, eyebrow, title, description, onClose }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; onClose: () => void }) { return <div className="panel-header"><div className="panel-heading"><span className="panel-icon">{icon}</span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button className="panel-close" onClick={onClose}><X size={18} /></button></div>; }
