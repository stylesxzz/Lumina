# Lumina — plano atualizado

## Objetivo
Transformar o Lumina em um copiloto gratuito e local-first para desenvolvimento seguro e cybersecurity. O produto não terá planos pagos. A tela principal alterna entre Programação & Desenvolvimento e Cibersegurança & Defesa, incluindo pentest apenas quando houver escopo declarado, autorização e confirmação humana.

## Capacidades
O chat usa um runtime local com fallback funcional, pode chamar o endpoint compatível com OpenAI do OpenRouter quando `OPENROUTER_API_KEY` estiver configurada e pode buscar/preparar modelos do Hugging Face por `repo_id`. O app também expõe Skills reutilizáveis e servidores MCP conectados para ferramentas e dados externos.

## Fluxos
- `/install autor/modelo` instala metadados essenciais diretamente pelo chat e grava um manifesto do modelo em `models/autor__modelo`.
- O painel Modelos Locais busca o catálogo público do Hugging Face e inicia a instalação de um repositório.
- A seleção Local/OpenRouter fica no composer, com o modelo atual sempre visível.
- OpenRouter usa o endpoint `/api/v1/chat/completions` no servidor, sem expor a chave no navegador.
- O painel MCP permite adicionar endpoints e mostra servidores conectados; ações ativas exigem aprovação.
- Skills ativas aparecem como instruções especializadas de programação, defesa, pentest autorizado, Git e terminal seguro.

## Design
A estética é um cockpit calmo de engenharia: grafite quase preto, violeta Lumina para desenvolvimento, verde esmeralda para defesa e chips de estado para indicar runtime, MCP e conexão. A navegação usa sidebar compacta no desktop e gaveta no mobile. O topo concentra o interruptor DEV/SEC para tornar a especialização explícita em todos os momentos.

## Arquivos principais
- `client/src/pages/Home.tsx`: chat, interruptor de perfis, composer, catálogo de modelos, Skills, MCP e conexões.
- `client/src/index.css`: visual local-first, estados, responsividade e painéis.
- `server/_core/index.ts`: status, OpenRouter, busca Hugging Face e preparação de modelos.
- `public/manus-routes.json`: rotas do Preview.

## Limitações honestas
A entrega prepara modelos e baixa arquivos de configuração essenciais; pesos de muitos gigabytes dependem do runtime local e do espaço disponível. OpenRouter depende da chave do usuário e do limite configurado na própria chave. O Lumina não cria planos nem cobra pelo uso.
