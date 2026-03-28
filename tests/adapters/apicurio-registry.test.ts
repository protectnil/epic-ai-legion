import { describe, it, expect } from 'vitest';
import { ApicurioRegistryMCPServer } from '../../src/mcp-servers/apicurio-registry.js';

describe('ApicurioRegistryMCPServer', () => {
  const adapter = new ApicurioRegistryMCPServer({ baseUrl: 'https://registry.example.com/apis/registry/v2' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_artifact requires groupId and artifactId', async () => {
    const result = await adapter.callTool('get_artifact', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('required');
  });

  it('create_artifact requires groupId, artifactType, and content', async () => {
    const result = await adapter.callTool('create_artifact', { groupId: 'default' });
    expect(result.isError).toBe(true);
  });

  it('get_group requires groupId', async () => {
    const result = await adapter.callTool('get_group', {});
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('required');
  });

  it('create_artifact_rule requires all fields', async () => {
    const result = await adapter.callTool('create_artifact_rule', { groupId: 'default', artifactId: 'test' });
    expect(result.isError).toBe(true);
  });

  it('static catalog returns correct metadata', () => {
    const cat = ApicurioRegistryMCPServer.catalog();
    expect(cat.name).toBe('apicurio-registry');
    expect(cat.category).toBe('devops');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog tool names match tools getter', () => {
    const cat = ApicurioRegistryMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
