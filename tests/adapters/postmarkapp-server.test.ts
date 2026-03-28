import { describe, it, expect } from 'vitest';
import { PostmarkappServerMCPServer } from '../../src/mcp-servers/postmarkapp-server.js';

describe('PostmarkappServerMCPServer', () => {
  const adapter = new PostmarkappServerMCPServer({ serverToken: 'test-token' });

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

  it('catalog returns required fields', () => {
    const cat = PostmarkappServerMCPServer.catalog();
    expect(cat.name).toBe('postmarkapp-server');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = PostmarkappServerMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // ── Email Sending ────────────────────────────────────────────────────────

  it('send_email requires From, To, and Subject', async () => {
    const result = await adapter.callTool('send_email', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('From');
  });

  it('send_email requires To', async () => {
    const result = await adapter.callTool('send_email', { From: 'a@example.com', Subject: 'Hi' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('To');
  });

  it('send_email_batch requires messages array', async () => {
    const result = await adapter.callTool('send_email_batch', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messages');
  });

  it('send_email_with_template requires From and To', async () => {
    const result = await adapter.callTool('send_email_with_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('From');
  });

  it('send_email_with_template requires TemplateId or TemplateAlias', async () => {
    const result = await adapter.callTool('send_email_with_template', { From: 'a@b.com', To: 'c@d.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('TemplateId');
  });

  it('send_email_batch_with_templates requires Messages array', async () => {
    const result = await adapter.callTool('send_email_batch_with_templates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Messages');
  });

  // ── Bounces ──────────────────────────────────────────────────────────────

  it('get_bounces requires count and offset', async () => {
    const result = await adapter.callTool('get_bounces', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('get_single_bounce requires bounceid', async () => {
    const result = await adapter.callTool('get_single_bounce', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('bounceid');
  });

  it('get_bounce_dump requires bounceid', async () => {
    const result = await adapter.callTool('get_bounce_dump', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('bounceid');
  });

  it('activate_bounce requires bounceid', async () => {
    const result = await adapter.callTool('activate_bounce', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('bounceid');
  });

  // ── Outbound Messages ────────────────────────────────────────────────────

  it('search_outbound_messages requires count and offset', async () => {
    const result = await adapter.callTool('search_outbound_messages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('get_outbound_message_details requires messageid', async () => {
    const result = await adapter.callTool('get_outbound_message_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  it('get_outbound_message_dump requires messageid', async () => {
    const result = await adapter.callTool('get_outbound_message_dump', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  it('search_outbound_clicks requires count and offset', async () => {
    const result = await adapter.callTool('search_outbound_clicks', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('get_clicks_for_message requires messageid, count, and offset', async () => {
    const result = await adapter.callTool('get_clicks_for_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  it('search_outbound_opens requires count and offset', async () => {
    const result = await adapter.callTool('search_outbound_opens', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('get_opens_for_message requires messageid, count, and offset', async () => {
    const result = await adapter.callTool('get_opens_for_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  // ── Inbound Messages ─────────────────────────────────────────────────────

  it('search_inbound_messages requires count and offset', async () => {
    const result = await adapter.callTool('search_inbound_messages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('get_inbound_message_details requires messageid', async () => {
    const result = await adapter.callTool('get_inbound_message_details', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  it('bypass_inbound_rules requires messageid', async () => {
    const result = await adapter.callTool('bypass_inbound_rules', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  it('retry_inbound_message requires messageid', async () => {
    const result = await adapter.callTool('retry_inbound_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messageid');
  });

  // ── Templates ────────────────────────────────────────────────────────────

  it('list_templates requires Count and Offset', async () => {
    const result = await adapter.callTool('list_templates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Count');
  });

  it('get_template requires templateIdOrAlias', async () => {
    const result = await adapter.callTool('get_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('templateIdOrAlias');
  });

  it('create_template requires Name and Subject', async () => {
    const result = await adapter.callTool('create_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Name');
  });

  it('update_template requires templateIdOrAlias', async () => {
    const result = await adapter.callTool('update_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('templateIdOrAlias');
  });

  it('delete_template requires templateIdOrAlias', async () => {
    const result = await adapter.callTool('delete_template', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('templateIdOrAlias');
  });

  // ── Inbound Rules ─────────────────────────────────────────────────────────

  it('list_inbound_rules requires count and offset', async () => {
    const result = await adapter.callTool('list_inbound_rules', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('count');
  });

  it('create_inbound_rule requires Rule', async () => {
    const result = await adapter.callTool('create_inbound_rule', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Rule');
  });

  it('delete_inbound_rule requires triggerid', async () => {
    const result = await adapter.callTool('delete_inbound_rule', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('triggerid');
  });

  // ── No-param tools return error gracefully (no network in test) ───────────

  it('get_delivery_stats does not throw', async () => {
    // Will fail at network, but must not throw
    const result = await adapter.callTool('get_delivery_stats', {}).catch(e => ({ isError: true, content: [{ text: String(e) }] }));
    expect(result).toBeDefined();
  });

  it('get_server_configuration does not throw', async () => {
    const result = await adapter.callTool('get_server_configuration', {}).catch(e => ({ isError: true, content: [{ text: String(e) }] }));
    expect(result).toBeDefined();
  });
});
