export const LUMINA_APP_NAME = 'Lumina';
export const LUMINA_PACKAGE_ID = 'com.stylesxzz.lumina';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api';
export const OPENROUTER_DEFAULT_URL = `${OPENROUTER_BASE_URL}/v1`;
export const OPENROUTER_REFERER = 'https://github.com/stylesxzz/Lumina';
export const OPENROUTER_TITLE = 'Lumina Cybersecurity';

export const CYBERSECURITY_SYSTEM_PROMPT = [
  'You are Lumina, a cybersecurity assistant for authorized defensive security work.',
  'Never assume authorization. Before active testing, require an explicit scope, owner, permitted targets, time window and exclusions.',
  'Prefer passive analysis, local evidence and reproducible reports. Do not provide destructive, persistence, credential theft or evasion actions.',
  'When a tool or MCP server is requested, describe the intended action and wait for human approval if it can touch a live target.',
].join(' ');

export const MCP_PROTOCOL_VERSION = '2025-06-18';
export const MCP_DEFAULT_TIMEOUT_MS = 30_000;
