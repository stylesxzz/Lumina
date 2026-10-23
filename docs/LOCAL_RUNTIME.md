# Lumina Android: runtime local e OpenRouter

## Estado real (2026-10-23)

- O catálogo Hugging Face pode ser pesquisado via API pública.
- O catálogo de modelos OpenRouter pode ser consultado e o chat remoto pode chamar `/api/v1/chat/completions` quando uma chave válida é fornecida.
- A inferência local ainda não existe no APK: a implementação anterior devolvia respostas de demonstração. O chat agora informa esse limite em vez de fingir que executou um modelo.
- Selecionar um repositório Hugging Face não equivale a baixar pesos nem a instalar um modelo.

## Próxima etapa obrigatória: runtime Android

O projeto atual é React + Vite + Capacitor, não React Native. Portanto, não se deve adicionar `llama.rn` esperando que funcione diretamente. A integração deve usar uma ponte Capacitor/Android para um runtime nativo compatível com GGUF (por exemplo, llama.cpp compilado para Android via JNI) ou uma biblioteca Android que já exponha essa API.

A ponte nativa deve expor operações assíncronas equivalentes a:

- `listModels()`: listar modelos baixados no diretório privado do aplicativo.
- `downloadModel({ url, destination, expectedSha256 })`: baixar somente arquivos de modelo compatíveis, reportando progresso e permitindo cancelar/retomar.
- `loadModel({ path, contextSize, threads })`: carregar o modelo e reportar erros de memória/formato.
- `generate({ prompt, maxTokens, temperature })`: gerar tokens e emitir eventos de progresso.
- `unloadModel()`: liberar memória nativa antes de trocar de modelo.

## Requisitos de produto e segurança

1. Filtrar resultados locais para repositórios com arquivos GGUF e mostrar o nome do arquivo, tamanho e licença antes do download.
2. Baixar para armazenamento privado do app, validar tamanho/hash quando disponível e nunca declarar instalação concluída antes da validação.
3. Tratar falta de espaço, cancelamento, rede interrompida e memória insuficiente; não carregar automaticamente modelos grandes em celulares com pouca RAM.
4. O modo local deve funcionar sem rede depois do download.
5. O modo OpenRouter deve manter o catálogo público e validar a chave e os erros da API; a chave inserida pelo usuário não deve ser incluída em logs nem em commits.
6. Não colocar chave secreta de desenvolvedor no APK. Para distribuição pública, use chave própria do usuário ou um backend autenticado com limites e controles de abuso.
7. A workflow `.github/workflows/android-apk.yml` compila um APK de debug, mas a compilação verde por si só não comprova a inferência local; adicionar testes instrumentados para download, carregamento e geração nativa.

## Critério de conclusão

A tarefa só estará concluída quando um modelo GGUF pequeno puder ser baixado, carregado e responder a uma mensagem com modo avião ativado, e quando o OpenRouter responder com uma chave válida. O seletor deve alternar entre ambos sem misturar histórico ou afirmar que um modelo está instalado quando não está.
