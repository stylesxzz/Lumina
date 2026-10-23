# Luminous

Aplicativo baseado na estrutura do projeto Lumina Studio, com identidade Luminous, seleção de modelos, conexão OpenRouter e orientação de sistema para respostas profissionais em cibersegurança, engenharia e estratégia executiva.

## Desenvolvimento web

```bash
pnpm install
pnpm dev
```

`pnpm check` valida os tipos. `pnpm build` gera o servidor e o frontend. `pnpm build:static` gera somente os assets web usados pelo Android.

## OpenRouter

Selecione OpenRouter em Conexões, informe sua chave de API e escolha um modelo. O app consulta o catálogo público de modelos da OpenRouter e envia as mensagens ao endpoint de chat completions. A chave é guardada no armazenamento local do navegador/dispositivo; use apenas um dispositivo confiável e remova a chave ao compartilhar o aparelho.

Todos os modelos selecionados via OpenRouter recebem o prompt global em `client/src/lib/luminousSystemPrompt.ts`, combinado com o perfil DEV ou SEC. O prompt orienta o comportamento, mas não garante que todo modelo tenha as mesmas capacidades.

## Android

O projeto usa Capacitor. Para preparar assets e sincronizar a plataforma Android:

```bash
pnpm build:static
pnpm exec cap sync android
```

O workflow `.github/workflows/android-apk.yml` compila um APK de debug via GitHub Actions e publica-o como artefato da execução. O APK precisa ser construído e testado após as mudanças desta branch.

## Limitações conhecidas

A interface reconhece a opção Local, mas a inferência offline real depende de uma ponte nativa Android para um runtime compatível com GGUF, como llama.cpp/llama.rn. A busca no Hugging Face não significa que um modelo foi baixado ou instalado; não marcar como instalado até o download e a inferência nativa estarem implementados e validados.

## Base e licença

A arquitetura visual e parte da implementação deste repositório derivam de trabalho anterior neste projeto. Para reconstruir o aplicativo nativo completo com inferência local, consulte também o projeto de referência [PocketPal AI](https://github.com/a-ghorbani/pocketpal-ai) e mantenha os avisos de licença aplicáveis aos componentes reutilizados.
