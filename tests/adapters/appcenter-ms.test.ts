import { describe, it, expect } from 'vitest';
import { AppCenterMCPServer } from '../../src/mcp-servers/appcenter-ms.js';

describe('AppCenterMCPServer', () => {
  const adapter = new AppCenterMCPServer({ apiToken: 'test-token' });

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

  it('includes core mobile devops tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_apps');
    expect(names).toContain('trigger_build');
    expect(names).toContain('list_releases');
    expect(names).toContain('get_app_crashes_info');
    expect(names).toContain('list_distribution_groups');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('trigger_build requires owner_name, app_name, and branch', async () => {
    const result = await adapter.callTool('trigger_build', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('add_distribution_group_members validates user_emails is array', async () => {
    const result = await adapter.callTool('add_distribution_group_members', {
      owner_name: 'myorg',
      app_name: 'myapp',
      distribution_group_name: 'Testers',
      user_emails: 'not-an-array',
    });
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = AppCenterMCPServer.catalog();
    expect(catalog.name).toBe('appcenter-ms');
    expect(catalog.category).toBe('devops');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
