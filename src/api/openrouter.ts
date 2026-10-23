import {OPENROUTER_DEFAULT_URL, OPENROUTER_REFERER, OPENROUTER_TITLE} from '../config/lumina';
import {streamChatCompletion, type StreamChatParams} from './openai';

export const OPENROUTER_URL = OPENROUTER_DEFAULT_URL;

export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': OPENROUTER_REFERER,
    'X-Title': OPENROUTER_TITLE,
  };
}

/** OpenRouter exposes an OpenAI-compatible /v1 API. */
export async function streamOpenRouterCompletion(
  apiKey: string,
  params: StreamChatParams,
): Promise<ReturnType<typeof streamChatCompletion>> {
  return streamChatCompletion({...params, endpoint: {...params.endpoint, url: OPENROUTER_URL, apiKey}});
}
