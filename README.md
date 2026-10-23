# Lumina

Lumina é uma reconstrução React Native baseada no APK de referência enviado pelo projeto. A interface e a dinâmica principal permanecem as do app de referência: chat, histórico, modelos locais GGUF, busca e download de modelos, carregamento, streaming, multimodalidade e configurações de inferência.

A base usa `llama.rn` para inferência local e mantém o fluxo de modelos do APK original. O endpoint remoto gerenciado é o OpenRouter, compatível com a API OpenAI. A chave é armazenada no Keychain do dispositivo e não no banco de dados da aplicação.

## Cybersecurity e pentest autorizado

A identidade Lumina adiciona uma política de cybersecurity ao system prompt padrão e um catálogo inicial de Skills para inventário de ativos, análise de superfície, validação não destrutiva de vulnerabilidades, threat modeling e hardening. Ações que toquem ambientes reais exigem escopo, proprietário, referência de autorização, alvos, exclusões e janela de teste ativa.

O cliente MCP incluído expõe descoberta e execução de ferramentas por JSON-RPC. Uma chamada MCP só é aceita quando a aprovação humana corresponde ao servidor e à ferramenta solicitada. O aplicativo deve ser usado somente em ambientes próprios ou explicitamente autorizados.

## Desenvolvimento

A base requer Node 22.21.0 ou superior, Yarn 1.22.22, Java 17 e Android SDK/NDK. Para instalar as dependências e validar o projeto:

```bash
yarn install
yarn typecheck
yarn test --runInBand
```

Para gerar o APK Android:

```bash
yarn build:android
```

O workflow `.github/workflows/android-apk.yml` compila automaticamente o artefato `lumina-apk` no GitHub Actions.

## Fontes

A base React Native foi reconstruída a partir do [PocketPal AI](https://github.com/a-ghorbani/pocketpal-ai), publicado sob licença MIT. O binding local de inferência é o [llama.rn](https://github.com/mybigday/llama.rn), também sob MIT.
