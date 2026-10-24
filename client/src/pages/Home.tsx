import {
  Activity,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
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
  Paperclip,
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
type Attachment = { name: string; type: string; size: number; excerpt?: string; storedName?: string };
type McpServer = { name: string; url: string; tools: string[]; connectedAt?: string };

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
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [hfModels, setHfModels] = useState<Model[]>(localModels);
  const [installed, setInstalled] = useState<string[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openRouterReady, setOpenRouterReady] = useState(false);
  const [openRouterInput, setOpenRouterInput] = useState("");
  const [savingConnection, setSavingConnection] = useState<"openrouter" | null>(null);
  const [hfReady, setHfReady] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<number | null>(null);
  const t = profileCopy[profile];

  useEffect(() => {
    // Static Capacitor APK has no relative /api backend. OpenRouter is called directly from the device.
    try { setOpenRouterReady(Boolean(window.localStorage.getItem("lumina.openrouter.key"))); } catch { setOpenRouterReady(false); }
  }, []);

  useEffect(() => { composerRef.current?.focus(); }, [profile]);

  const visibleModels = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? hfModels.filter((item) => `${item.id} ${item.name}`.toLowerCase().includes(query)) : hfModels;
  }, [hfModels, search]);

  const localReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.startsWith("/install")) return `Abra Modelos Hugging Face para escolher o repositório oficial e fazer o download diretamente no site.`;
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
    const attachmentText = attachments.length ? `\n\nArquivos anexados:\n${attachments.map((item) => `- ${item.name}${item.excerpt ? `\n${item.excerpt}` : ""}`).join("\n")}` : "";
    const userMessage: Message = { id: Date.now(), role: "user", content: `${text}${attachmentText}`, time: now() };
    addMessage(userMessage); setDraft(""); setIsThinking(true);
    setAttachments([]);
    if (text.toLowerCase().startsWith("/install ")) {
      const repoId = text.slice(9).trim();
      if (repoId.includes("/")) window.open(`https://huggingface.co/${repoId}`, "_blank", "noopener,noreferrer");
      setIsThinking(false); return;
    }
    const pendingId = Date.now() + 1;
    addMessage({ id: pendingId, role: "assistant", content: "", time: now(), pending: true });
    try {
      let content = "";
      if (provider === "openrouter") {
        const key = window.localStorage.getItem("lumina.openrouter.key");
        if (!key || !openRouterReady) throw new Error("OpenRouter não conectada. Abra Conexões e valide sua chave.");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "X-OpenRouter-Title": "Lumina Studio" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: t.system }, ...messages.filter((item) => item.role !== "system").slice(-10).map((item) => ({ role: item.role, content: item.content })), { role: "user", content: text + attachmentText }], temperature: 0.2 })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "OpenRouter HTTP " + response.status);
        content = payload?.choices?.[0]?.message?.content || "O modelo não retornou texto.";
      } else {
        throw new Error("O runtime GGUF local ainda não está integrado a este APK. Não vou simular uma resposta de IA.");
      }
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content, pending: false, time: now() } : item));
    } catch (error) {
      setMessages((current) => current.map((item) => item.id === pendingId ? { ...item, content: `${error instanceof Error ? error.message : "Falha no provedor"}. Você pode voltar para o modo Local e continuar sem chave externa.`, pending: false } : item));
    } finally { setIsThinking(false); }
  };

  const clearChat = () => { setMessages([]); setDraft(""); setAttachments([]); setPanel(null); setMobileMenu(false); };
  const copyMessage = async (message: Message) => { try { await navigator.clipboard.writeText(message.content); } catch { /* Preview can block clipboard */ } setCopiedId(message.id); if (copyTimer.current) window.clearTimeout(copyTimer.current); copyTimer.current = window.setTimeout(() => setCopiedId(null), 1400); };
  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
        const excerpt = file.type.startsWith("text/") || /\.(md|json|ts|tsx|js|jsx|py|java|go|rs|html|css|yaml|yml|csv|log)$/i.test(file.name) ? await file.text().then((value) => value.slice(0, 12000)) : undefined;
        const response = await fetch("/api/files/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, data }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Falha no upload");
        return { name: file.name, type: file.type, size: file.size, excerpt, storedName: payload.storedName } as Attachment;
      }));
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error) { addMessage({ id: Date.now(), role: "system", content: error instanceof Error ? error.message : "Não foi possível anexar o arquivo.", time: now() }); }
    finally { setUploading(false); event.target.value = ""; }
  };
  const connectMcp = async () => { const value = mcpUrl.trim(); if (!value) return; try { const response = await fetch("/api/mcp/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: value, token: mcpToken }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Falha ao conectar"); setMcpServers((current) => [...current.filter((item) => item.url !== value), payload.server]); setMcpUrl(""); setMcpToken(""); } catch (error) { addMessage({ id: Date.now(), role: "system", content: error instanceof Error ? error.message : "Não foi possível conectar o MCP.", time: now(), kind: "tool" }); } };
  const connectOpenRouter = async () => {
    const apiKey = openRouterInput.trim();
    if (!apiKey) return;
    setSavingConnection("openrouter");
    try {
      const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: "Bearer " + apiKey } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "A chave foi recusada pela OpenRouter.");
      window.localStorage.setItem("lumina.openrouter.key", apiKey);
      setOpenRouterReady(true); setOpenRouterInput("");
      addMessage({ id: Date.now(), role: "system", content: "OpenRouter validada e salva neste dispositivo.", time: now() });
    } catch (error) {
      addMessage({ id: Date.now(), role: "system", content: error instanceof Error ? error.message : "Falha na OpenRouter.", time: now() });
    } finally { setSavingConnection(null); }
  };

  return <div className="lumina-app studio-app">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="sidebar-top"><button className="wordmark" onClick={clearChat}><BrandMark /><span>lumina<span className="wordmark-suffix"> studio</span></span></button><button className="sidebar-collapse" onClick={() => setMobileMenu(false)}><X size={17} /></button></div>
      <button className="new-chat-button" onClick={clearChat}><Plus size={17} /><span>Nova sessão</span><span className="shortcut">⌘ K</span></button>
      <nav className="sidebar-nav">
        <button className={`nav-item ${panel === null ? "nav-item-active" : ""}`} onClick={() => setPanel(null)}><MessageSquareText size={17} /><span>Chat</span></button>
        <button className={`nav-item ${panel === "models" ? "nav-item-active" : ""}`} onClick={() => setPanel("models")}><Download size={17} /><span>Modelos Hugging Face</span><span className="nav-badge">HF</span></button>
        <button className={`nav-item ${panel === "skills" ? "nav-item-active" : ""}`} onClick={() => setPanel("skills")}><Wrench size={17} /><span>Skills</span></button>
        <button className={`nav-item ${panel === "mcp" ? "nav-item-active" : ""}`} onClick={() => setPanel("mcp")}><Network size={17} /><span>MCP</span><span className="nav-badge nav-badge-green">{mcpServers.length}</span></button>
        <button className={`nav-item ${panel === "connections" ? "nav-item-active" : ""}`} onClick={() => setPanel("connections")}><Link2 size={17} /><span>Conexões</span></button>
      </nav>
      <div className="sidebar-section-label">Sessões recentes</div><div className="recent-list">{messages.length ? <button className="recent-item" onClick={() => setPanel(null)}><span className="recent-dot" /><span className="recent-text">Sessão {profile === "dev" ? "de desenvolvimento" : "de defesa"}</span></button> : <p className="empty-recent">Suas sessões aparecem aqui.</p>}</div>
      <div className="sidebar-bottom"><div className="runtime-card"><div className="runtime-head"><span className="live-dot" /> Runtime local <span className="runtime-ready">pronto</span></div><div className="runtime-row"><Laptop size={14} /> <span>Modelos instalados</span><strong>{installed.length}</strong></div><div className="runtime-row"><TerminalSquare size={14} /> <span>MCP ativo</span><strong>{mcpServers.length}</strong></div></div><button className="profile-row" onClick={() => setPanel("connections")}><span className="avatar">LS</span><span className="profile-copy"><strong>Local Studio</strong><small>Sem planos pagos</small></span><Settings2 size={16} /></button></div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}
    <main className="main-panel">
  return <section className="control-panel"><PanelHeader icon={<Link2 size={19} />} eyebrow="Conexão principal" title="OpenRouter API" description="A Lumina usa a OpenRouter para conversar com os modelos escolhidos. MCP e upload de arquivos ficam nos painéis próprios." onClose={() => setPanel(null)} /><div className="connection-card"><div className="connection-icon openrouter-icon"><Globe2 size={18} /></div><div><strong>OpenRouter API</strong><small>{openRouterReady ? "Conectada e pronta para os modelos" : "Cole sua chave para habilitar a API"}</small></div><span className={openRouterReady ? "connection-status" : "connection-status status-muted"}>{openRouterReady ? "conectado" : "pendente"}</span></div><div className="connection-form"><input className="mcp-token-input" value={openRouterInput} onChange={(event) => setOpenRouterInput(event.target.value)} placeholder="Chave da OpenRouter" type="password" /><button className="install-button" onClick={() => void connectOpenRouter()} disabled={savingConnection === "openrouter"}>{savingConnection === "openrouter" ? <Loader2 size={14} className="spin" /> : <Globe2 size={14} />} Validar e conectar</button></div><div className="panel-note"><ShieldCheck size={15} /> A chave é validada no servidor e não aparece novamente na interface.</div></section>;
      <div className="studio-body">
        {panel ? <PanelView panel={panel} profile={profile} search={search} setSearch={setSearch} visibleModels={visibleModels} hfReady={hfReady} installed={installed} installing={installing} installModel={installModel} searchHuggingFace={searchHuggingFace} openRouterReady={openRouterReady} openRouterInput={openRouterInput} setOpenRouterInput={setOpenRouterInput} savingConnection={savingConnection} connectOpenRouter={connectOpenRouter} mcpUrl={mcpUrl} setMcpUrl={setMcpUrl} mcpToken={mcpToken} setMcpToken={setMcpToken} mcpServers={mcpServers} connectMcp={connectMcp} setPanel={setPanel} /> : <section className={`conversation ${messages.length ? "conversation-active" : ""}`}>
          {!messages.length ? <div className="welcome-state studio-welcome"><div className="welcome-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className={`welcome-mark ${profile === "security" ? "security-mark" : ""}`}>{profile === "security" ? <ShieldCheck size={30} /> : <Code2 size={30} />}</div></div><p className={`eyebrow ${profile === "security" ? "security-eyebrow" : ""}`}>{t.label}</p><h1>{t.title}</h1><p className="welcome-copy">{t.subtitle}</p><div className="mode-pills"><span><span className="live-dot" /> Modelo: {provider === "local" ? "local" : "OpenRouter"}</span><span><Network size={12} /> {mcpServers.length} MCP conectados</span><span><Wrench size={12} /> Skills disponíveis</span></div><div className="starter-actions"><button className="starter-card" onClick={() => setPanel("models")}><span className="starter-icon"><Download size={18} /></span><span className="starter-card-copy"><strong>Escolher modelo no Hugging Face</strong><small>Hugging Face direto no chat</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("connections")}><span className="starter-icon"><Globe2 size={18} /></span><span className="starter-card-copy"><strong>Conectar OpenRouter</strong><small>Use qualquer modelo da API</small></span><ArrowUp size={15} className="starter-arrow" /></button><button className="starter-card" onClick={() => setPanel("mcp")}><span className="starter-icon"><Network size={18} /></span><span className="starter-card-copy"><strong>Adicionar MCP</strong><small>Ferramentas e dados externos</small></span><ArrowUp size={15} className="starter-arrow" /></button></div></div> : <div className="messages-wrap"><div className="conversation-heading"><div><span className="eyebrow">Sessão {t.short} · {provider === "local" ? "Runtime local" : "OpenRouter"}</span><h2>{t.label}</h2></div><button className="quiet-action" onClick={clearChat}><Plus size={15} /> Nova sessão</button></div><div className="messages-list">{messages.map((message) => <article key={message.id} className={`message-row message-${message.role}`}><div className={`message-avatar ${message.role === "assistant" ? "assistant-avatar" : message.role === "system" ? "system-avatar" : "user-avatar"}`}>{message.role === "assistant" ? <BrandMark /> : message.role === "system" ? <Download size={14} /> : "LS"}</div><div className="message-content"><div className="message-meta"><strong>{message.role === "assistant" ? (provider === "local" ? "Local AI" : "OpenRouter") : message.role === "system" ? "Runtime" : "Você"}</strong><span>{message.time}</span></div>{message.pending ? <div className="typing-bubble"><span /><span /><span /></div> : <p className="message-text">{message.content}</p>}{message.role === "user" && <div className="message-actions"><button onClick={() => copyMessage(message)}>{copiedId === message.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === message.id ? "Copiado" : "Copiar"}</button><button onClick={() => { setDraft(message.content); composerRef.current?.focus(); }}><RotateCcw size={13} /> Reusar</button></div>}</div></article>)}</div></div>}
        </section>}
      </div>
      <div className="composer-area"><div className="composer"><div className="composer-toolbar"><input ref={fileInputRef} type="file" multiple hidden onChange={(event) => void handleFiles(event)} /><button className="composer-plus" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo"><Paperclip size={18} /></button><div className="runtime-selector"><span className={provider === "local" ? "selector-active" : ""} onClick={() => setProvider("local")}><Laptop size={12} /> Local</span><span className={provider === "openrouter" ? "selector-active" : ""} onClick={() => setProvider("openrouter")}><Globe2 size={12} /> OpenRouter</span></div><span className="composer-spacer" /><button className="model-selector" onClick={() => setPanel("models")}><Bot size={13} /> {model.split("/").pop()} <ChevronDown size={13} /></button></div>{attachments.length > 0 && <div className="attachment-chips">{attachments.map((item) => <span className="attachment-chip" key={item.storedName || item.name}><FileText size={12} /> {item.name}</span>)}</div>}{uploading && <div className="uploading-label"><Loader2 size={12} className="spin" /> Enviando arquivo…</div>}<textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={profile === "dev" ? "Pergunte, cole código ou use /install autor/modelo…" : "Analise um risco, log ou cenário defensivo…"} rows={2} /><div className="composer-bottom"><div className="composer-hint"><Activity size={13} /> {provider === "local" ? "Execução local · sem plano pago" : openRouterReady ? "OpenRouter conectado" : "Configure OPENROUTER_API_KEY em Conexões"}</div><button className={`send-button ${draft.trim() ? "send-ready" : ""}`} onClick={() => void send()} disabled={!draft.trim() || isThinking}>{isThinking ? <Loader2 size={18} className="spin" /> : <Send size={18} />}</button></div></div><p className="composer-disclaimer">Ações externas devem ser autorizadas. Modelos e ferramentas ficam sob seu controle.</p></div>
    </main>
  </div>;
}

function PanelView(props: { panel: Exclude<Panel, null>; profile: Profile; search: string; setSearch: (value: string) => void; visibleModels: Model[]; hfReady: boolean; installed: string[]; installing: string | null; installModel: (repoId: string) => Promise<void>; searchHuggingFace: () => Promise<void>; openRouterReady: boolean; openRouterInput: string; setOpenRouterInput: (value: string) => void; savingConnection: "openrouter" | null; connectOpenRouter: () => Promise<void>; mcpUrl: string; setMcpUrl: (value: string) => void; mcpToken: string; setMcpToken: (value: string) => void; mcpServers: McpServer[]; connectMcp: () => void; setPanel: (panel: Panel) => void }) {
  const { panel, search, setSearch, visibleModels, hfReady, installed, installing, installModel, searchHuggingFace, openRouterReady, openRouterInput, setOpenRouterInput, savingConnection, connectOpenRouter, mcpUrl, setMcpUrl, mcpToken, setMcpToken, mcpServers, connectMcp, setPanel } = props;
  if (panel === "models") return <section className="control-panel"><PanelHeader icon={<Download size={19} />} eyebrow="Hugging Face Hub" title="Escolher modelo" description="Abra o Hugging Face, escolha o modelo que quiser e faça o download por lá. Depois, use o arquivo pelo botão de anexo do chat." onClose={() => setPanel(null)} /><div className="panel-callout"><Globe2 size={16} /><span><strong>Download direto no Hugging Face</strong><small>O Lumina não força um modelo específico. Cada botão abre a página oficial do repositório para você escolher arquivos, licença e runtime.</small></span><span className="status-good">site oficial</span></div><div className="search-row"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchHuggingFace(); }} placeholder="Buscar Qwen, Llama, Coder…" /><button onClick={() => void searchHuggingFace()}>Buscar</button></div><div className="model-grid">{visibleModels.map((item) => <article className="model-card" key={item.id}><div className="model-card-top"><span className="model-icon"><Code2 size={17} /></span><span className="model-tag">{item.pipeline_tag || "model"}</span></div><strong>{item.name || item.id}</strong><small>{item.author || item.id.split("/")[0]}</small><div className="model-stats"><span>{formatDownloads(item.downloads)} downloads</span><span>{item.id}</span></div><a className="install-button" href={`https://huggingface.co/${item.id}`} target="_blank" rel="noreferrer"><Globe2 size={14} /> Abrir no Hugging Face</a></article>)}</div></section>;
  if (panel === "skills") return <section className="control-panel"><PanelHeader icon={<Wrench size={19} />} eyebrow="Skills" title="Habilidades do agente" description="Ative instruções especializadas por sessão sem trocar de aplicativo." onClose={() => setPanel(null)} /><div className="skill-list">{[{ icon: Code2, title: "Code Architect", text: "Arquitetura, TypeScript, testes e revisão de código." }, { icon: ShieldCheck, title: "Defensive Security", text: "Threat modeling, hardening, SOC e resposta a incidentes." }, { icon: GitBranch, title: "Git Operator", text: "Branches, commits, diffs e automações com confirmação." }, { icon: TerminalSquare, title: "Terminal Safe Mode", text: "Comandos rastreáveis, sem execução destrutiva por padrão." }].map(({ icon: Icon, title, text }) => <button className="skill-card" key={title}><span className="skill-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{text}</small></span><span className="toggle toggle-on"><span /></span></button>)}</div><div className="panel-note"><Sparkles size={15} /> Skills são instruções reutilizáveis. MCPs fornecem ferramentas e dados.</div></section>;
  if (panel === "mcp") return <section className="control-panel"><PanelHeader icon={<Network size={19} />} eyebrow="Model Context Protocol" title="Servidores MCP reais" description="Conecte endpoints HTTP MCP e descubra as ferramentas disponíveis." onClose={() => setPanel(null)} /><div className="mcp-list">{mcpServers.map((server) => <div className="mcp-row" key={server.url}><span className="mcp-status"><span className="live-dot" /></span><span><strong>{server.name}</strong><small>{server.url} · {server.tools.length} ferramentas: {server.tools.slice(0, 4).join(", ") || "nenhuma listada"}</small></span><button title="Endpoint conectado"><Settings2 size={15} /></button></div>)}</div><div className="mcp-add"><label>Endpoint MCP HTTP/SSE</label><div className="search-row"><Server size={16} /><input value={mcpUrl} onChange={(event) => setMcpUrl(event.target.value)} placeholder="https://seu-servidor/mcp" /><button onClick={() => void connectMcp()}>Conectar</button></div><input className="mcp-token-input" value={mcpToken} onChange={(event) => setMcpToken(event.target.value)} placeholder="Token Bearer opcional" type="password" /></div><div className="panel-note"><ShieldCheck size={15} /> O Lumina faz initialize e tools/list para validar a conexão. Você pode conectar quantos endpoints MCP precisar; o limite prático depende da memória e da rede.</div></section>;
  return <section className="control-panel"><PanelHeader icon={<Link2 size={19} />} eyebrow="Conexão principal" title="OpenRouter API" description="A Lumina usa a OpenRouter para conversar com os modelos escolhidos. MCP e upload de arquivos ficam nos painéis próprios." onClose={() => setPanel(null)} /><div className="connection-card"><div className="connection-icon openrouter-icon"><Globe2 size={18} /></div><div><strong>OpenRouter API</strong><small>{openRouterReady ? "Conectada e pronta para os modelos" : "Cole sua chave para habilitar a API"}</small></div><span className={openRouterReady ? "connection-status" : "connection-status status-muted"}>{openRouterReady ? "conectado" : "pendente"}</span></div><div className="connection-form"><input className="mcp-token-input" value={openRouterInput} onChange={(event) => setOpenRouterInput(event.target.value)} placeholder="Chave da OpenRouter" type="password" /><button className="install-button" onClick={() => void connectOpenRouter()} disabled={savingConnection === "openrouter"}>{savingConnection === "openrouter" ? <Loader2 size={14} className="spin" /> : <Globe2 size={14} />} Validar e conectar</button></div><div className="panel-note"><ShieldCheck size={15} /> A chave é validada no servidor e não aparece novamente na interface.</div></section>;
}

function PanelHeader({ icon, eyebrow, title, description, onClose }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; onClose: () => void }) { return <div className="panel-header"><div className="panel-heading"><span className="panel-icon">{icon}</span><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button className="panel-close" onClick={onClose}><X size={18} /></button></div>; }
