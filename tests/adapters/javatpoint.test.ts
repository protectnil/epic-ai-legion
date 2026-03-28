import { describe, it, expect } from 'vitest';
import { JavatpointMCPServer } from '../../src/mcp-servers/javatpoint.js';

describe('JavatpointMCPServer', () => {
  const adapter = new JavatpointMCPServer({ accessToken: 'test-token' });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('send_message');
    expect(names).toContain('send_multicast');
    expect(names).toContain('send_topic_message');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('send_message returns error when project_id missing', async () => {
    const result = await adapter.callTool('send_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('project_id is required');
  });

  it('send_multicast returns error when project_id missing', async () => {
    const result = await adapter.callTool('send_multicast', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('project_id is required');
  });

  it('send_multicast returns error when tokens empty', async () => {
    const result = await adapter.callTool('send_multicast', { project_id: 'my-project', tokens: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tokens array is required');
  });

  it('send_topic_message returns error when project_id missing', async () => {
    const result = await adapter.callTool('send_topic_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('project_id is required');
  });

  it('send_topic_message returns error when topic missing', async () => {
    const result = await adapter.callTool('send_topic_message', { project_id: 'my-project' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('topic is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = JavatpointMCPServer.catalog();
    expect(cat.name).toBe('javatpoint');
    expect(cat.category).toBe('education');
    expect(cat.toolNames.length).toBe(3);
    expect(cat.author).toBe('protectnil');
  });
});
