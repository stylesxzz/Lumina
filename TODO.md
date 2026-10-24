# Lumina Studio — escopo atual

## Integrações visíveis

- [x] A única conexão de provedor na interface é a OpenRouter API.
- [x] MCP continua em um painel próprio e aceita endpoints HTTP/HTTPS reais, token opcional, `initialize` e `tools/list`.
- [x] O botão de clipe permite selecionar e enviar arquivos do Android/iPhone para o chat.
- [x] GitHub foi removido da interface e não faz mais parte da tela de conexões.

## Modelos

- [x] O painel de modelos busca no catálogo público do Hugging Face.
- [x] Cada modelo possui botão que abre diretamente `https://huggingface.co/autor/modelo`.
- [x] O Lumina não baixa nem instala pesos automaticamente; o usuário escolhe e instala o modelo no site oficial.
- [x] O comando `/install autor/modelo` abre diretamente a página do modelo no Hugging Face.

## Segurança e qualidade

- [x] A chave da OpenRouter é validada no servidor e não é exibida novamente no navegador.
- [x] Credenciais locais ficam em arquivo ignorado pelo Git.
- [x] `pnpm check` passa.
- [x] `pnpm build` passa.
- [x] Upload real e `/api/health` foram testados.
