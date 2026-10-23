import {MCP_DEFAULT_TIMEOUT_MS, MCP_PROTOCOL_VERSION} from '../../config/lumina';

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type McpServerConfig = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export type McpApproval = {
  serverId: string;
  toolName: string;
  reason: string;
  scope?: string;
  approved: boolean;
};

export class McpClient {
  constructor(private readonly server: McpServerConfig) {}

  async listTools(): Promise<McpTool[]> {
    const result = await this.request('tools/list', {});
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    approval: McpApproval,
  ): Promise<unknown> {
    if (!approval.approved) {
      throw new Error('MCP tool call requires explicit human approval.');
    }
    if (approval.serverId !== this.server.id || approval.toolName !== toolName) {
      throw new Error('MCP approval does not match the requested tool.');
    }
    return this.request('tools/call', {name: toolName, arguments: args});
  }

  private async request(method: string, params: Record<string, unknown>): Promise<any> {
    if (!this.server.enabled) {
      throw new Error(`MCP server ${this.server.name} is disabled.`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MCP_DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(this.server.url, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/event-stream',
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
        },
        body: JSON.stringify({jsonrpc: '2.0', id: Date.now(), method, params}),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`MCP request failed with HTTP ${response.status}.`);
      }
      const payload = await response.json();
      if (payload?.error) {
        throw new Error(payload.error.message || 'MCP server returned an error.');
      }
      return payload?.result;
    } finally {
      clearTimeout(timeout);
    }
  }
}
