# Lumina

Copiloto local-first gratuito para desenvolvimento seguro, cybersecurity defensiva e pentest autorizado. A interface alterna entre os perfis DEV e SEC, permite escolher runtime local ou OpenRouter, buscar modelos no Hugging Face, ativar Skills e conectar servidores MCP com escopo e aprovação humana.

## Desenvolvimento web

```bash
pnpm install
pnpm dev
```

`pnpm check` valida os tipos. `pnpm build` gera o servidor e o frontend. `pnpm build:static` gera somente os assets web usados pelo Android.

O endpoint server-side do OpenRouter usa `OPENROUTER_API_KEY`. O Hugging Face é pesquisável sem token para modelos públicos; `HUGGINGFACE_TOKEN` pode ser configurado para repositórios privados. Nenhuma chave é embutida no frontend.

## APK Android

O projeto usa Capacitor. Para preparar os assets e sincronizar a plataforma Android localmente:

```bash
pnpm build:static
pnpm exec cap sync android
```

O workflow `.github/workflows/android-apk.yml` roda no GitHub Actions a cada push em `main`, instala Node, pnpm, Java e Android SDK, compila `app-debug.apk` e publica o arquivo como artefato `lumina-debug-apk` na execução do workflow.

O APK contém o frontend e o fallback local. Para usar OpenRouter e instalações Hugging Face dentro do APK, a aplicação deve apontar para um backend publicado que mantenha as chaves no servidor; o Preview web continua sendo a superfície completa server-side.
