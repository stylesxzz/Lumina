# Lumina Studio — entregas

## Interruptor de especialização
- [x] O topo alterna entre Programação & Desenvolvimento e Cibersegurança & Defesa.
- [x] Cada perfil muda contexto, título, sugestões e resposta local especializada.

## Runtime e modelos locais
- [x] O composer alterna entre Runtime local e OpenRouter.
- [x] O chat aceita `/install autor/modelo` e mostra o progresso da instalação.
- [x] O painel Modelos Locais busca modelos no Hugging Face e inicia preparação pelo botão no painel.
- [x] A API salva metadados e arquivos essenciais em uma pasta local de modelos.

## OpenRouter
- [x] A API server-side usa o endpoint compatível com OpenAI do OpenRouter.
- [x] A chave nunca é enviada ao navegador.
- [x] O app mostra se a variável `OPENROUTER_API_KEY` está configurada e mantém fallback local quando não estiver.

## Skills e MCP
- [x] Existe painel de Skills com habilidades de código, segurança defensiva, Git e terminal seguro.
- [x] Existe painel MCP com servidores locais, adição de endpoint e estado de conexão.
- [x] O chat deixa explícito que ações externas precisam de autorização.

## Produto gratuito
- [x] Planos, preços, checkout e chamada de upgrade foram removidos.
- [x] A interface comunica “sem plano pago” e separa custo do provedor externo de cobrança do Lumina.

## Qualidade e entrega
- [x] Interface responsiva para desktop e celular.
- [x] `/api/health` continua funcional.
- [x] `/manus-routes.json` continua servindo JSON válido.
