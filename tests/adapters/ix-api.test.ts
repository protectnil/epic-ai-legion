import { describe, it, expect } from 'vitest';
import { IxApiMCPServer } from '../../src/mcp-servers/ix-api.js';

describe('IxApiMCPServer', () => {
  const adapter = new IxApiMCPServer({
    accessToken: 'test-token',
    baseUrl: 'https://ix-api.example.com/api/v2',
  });

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
    const cat = IxApiMCPServer.catalog();
    expect(cat.name).toBe('ix-api');
    expect(cat.category).toBe('telecom');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = IxApiMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // -- Auth ------------------------------------------------------------------

  it('create_auth_token returns error without username', async () => {
    const result = await adapter.callTool('create_auth_token', { password: 'pass' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('username');
  });

  it('create_auth_token returns error without password', async () => {
    const result = await adapter.callTool('create_auth_token', { username: 'user' });
    expect(result.isError).toBe(true);
  });

  it('refresh_auth_token returns error without refresh token', async () => {
    const result = await adapter.callTool('refresh_auth_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('refresh');
  });

  // -- Accounts --------------------------------------------------------------

  it('get_account returns error without id', async () => {
    const result = await adapter.callTool('get_account', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_account returns error without name', async () => {
    const result = await adapter.callTool('create_account', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_account returns error without id', async () => {
    const result = await adapter.callTool('update_account', {});
    expect(result.isError).toBe(true);
  });

  it('patch_account returns error without id', async () => {
    const result = await adapter.callTool('patch_account', {});
    expect(result.isError).toBe(true);
  });

  it('delete_account returns error without id', async () => {
    const result = await adapter.callTool('delete_account', {});
    expect(result.isError).toBe(true);
  });

  // -- Contacts --------------------------------------------------------------

  it('get_contact returns error without id', async () => {
    const result = await adapter.callTool('get_contact', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_contact returns error without name', async () => {
    const result = await adapter.callTool('create_contact', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_contact returns error without id', async () => {
    const result = await adapter.callTool('update_contact', {});
    expect(result.isError).toBe(true);
  });

  it('patch_contact returns error without id', async () => {
    const result = await adapter.callTool('patch_contact', {});
    expect(result.isError).toBe(true);
  });

  it('delete_contact returns error without id', async () => {
    const result = await adapter.callTool('delete_contact', {});
    expect(result.isError).toBe(true);
  });

  // -- Roles -----------------------------------------------------------------

  it('get_role returns error without id', async () => {
    const result = await adapter.callTool('get_role', {});
    expect(result.isError).toBe(true);
  });

  it('create_role_assignment returns error without contact and role', async () => {
    const result = await adapter.callTool('create_role_assignment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('contact');
  });

  it('get_role_assignment returns error without assignment_id', async () => {
    const result = await adapter.callTool('get_role_assignment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('assignment_id');
  });

  it('delete_role_assignment returns error without assignment_id', async () => {
    const result = await adapter.callTool('delete_role_assignment', {});
    expect(result.isError).toBe(true);
  });

  // -- Infrastructure --------------------------------------------------------

  it('get_facility returns error without id', async () => {
    const result = await adapter.callTool('get_facility', {});
    expect(result.isError).toBe(true);
  });

  it('get_pop returns error without id', async () => {
    const result = await adapter.callTool('get_pop', {});
    expect(result.isError).toBe(true);
  });

  it('get_metro_area returns error without id', async () => {
    const result = await adapter.callTool('get_metro_area', {});
    expect(result.isError).toBe(true);
  });

  it('get_metro_area_network returns error without id', async () => {
    const result = await adapter.callTool('get_metro_area_network', {});
    expect(result.isError).toBe(true);
  });

  it('get_device returns error without id', async () => {
    const result = await adapter.callTool('get_device', {});
    expect(result.isError).toBe(true);
  });

  it('get_port returns error without id', async () => {
    const result = await adapter.callTool('get_port', {});
    expect(result.isError).toBe(true);
  });

  it('get_connection returns error without id', async () => {
    const result = await adapter.callTool('get_connection', {});
    expect(result.isError).toBe(true);
  });

  it('get_product_offering returns error without id', async () => {
    const result = await adapter.callTool('get_product_offering', {});
    expect(result.isError).toBe(true);
  });

  // -- Network Services ------------------------------------------------------

  it('create_network_service returns error without type', async () => {
    const result = await adapter.callTool('create_network_service', { managing_account: 'acct-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('type');
  });

  it('create_network_service returns error without managing_account', async () => {
    const result = await adapter.callTool('create_network_service', { type: 'ExchangeLanNetworkService' });
    expect(result.isError).toBe(true);
  });

  it('get_network_service returns error without id', async () => {
    const result = await adapter.callTool('get_network_service', {});
    expect(result.isError).toBe(true);
  });

  it('update_network_service returns error without id', async () => {
    const result = await adapter.callTool('update_network_service', {});
    expect(result.isError).toBe(true);
  });

  it('patch_network_service returns error without id', async () => {
    const result = await adapter.callTool('patch_network_service', {});
    expect(result.isError).toBe(true);
  });

  it('delete_network_service returns error without id', async () => {
    const result = await adapter.callTool('delete_network_service', {});
    expect(result.isError).toBe(true);
  });

  it('get_network_service_cancellation_policy returns error without id', async () => {
    const result = await adapter.callTool('get_network_service_cancellation_policy', {});
    expect(result.isError).toBe(true);
  });

  it('get_network_service_change_request returns error without id', async () => {
    const result = await adapter.callTool('get_network_service_change_request', {});
    expect(result.isError).toBe(true);
  });

  it('create_network_service_change_request returns error without id', async () => {
    const result = await adapter.callTool('create_network_service_change_request', {});
    expect(result.isError).toBe(true);
  });

  it('delete_network_service_change_request returns error without id', async () => {
    const result = await adapter.callTool('delete_network_service_change_request', {});
    expect(result.isError).toBe(true);
  });

  // -- Network Service Configs -----------------------------------------------

  it('create_network_service_config returns error without required fields', async () => {
    const result = await adapter.callTool('create_network_service_config', { type: 'ExchangeLanNetworkServiceConfig' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('connection');
  });

  it('get_network_service_config returns error without id', async () => {
    const result = await adapter.callTool('get_network_service_config', {});
    expect(result.isError).toBe(true);
  });

  it('update_network_service_config returns error without id', async () => {
    const result = await adapter.callTool('update_network_service_config', {});
    expect(result.isError).toBe(true);
  });

  it('patch_network_service_config returns error without id', async () => {
    const result = await adapter.callTool('patch_network_service_config', {});
    expect(result.isError).toBe(true);
  });

  it('delete_network_service_config returns error without id', async () => {
    const result = await adapter.callTool('delete_network_service_config', {});
    expect(result.isError).toBe(true);
  });

  it('get_network_service_config_cancellation_policy returns error without id', async () => {
    const result = await adapter.callTool('get_network_service_config_cancellation_policy', {});
    expect(result.isError).toBe(true);
  });

  // -- Network Features ------------------------------------------------------

  it('get_network_feature returns error without id', async () => {
    const result = await adapter.callTool('get_network_feature', {});
    expect(result.isError).toBe(true);
  });

  it('create_network_feature_config returns error without required fields', async () => {
    const result = await adapter.callTool('create_network_feature_config', { type: 'RouteServerConfig' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('service_config');
  });

  it('get_network_feature_config returns error without id', async () => {
    const result = await adapter.callTool('get_network_feature_config', {});
    expect(result.isError).toBe(true);
  });

  it('update_network_feature_config returns error without id', async () => {
    const result = await adapter.callTool('update_network_feature_config', {});
    expect(result.isError).toBe(true);
  });

  it('patch_network_feature_config returns error without id', async () => {
    const result = await adapter.callTool('patch_network_feature_config', {});
    expect(result.isError).toBe(true);
  });

  it('delete_network_feature_config returns error without id', async () => {
    const result = await adapter.callTool('delete_network_feature_config', {});
    expect(result.isError).toBe(true);
  });

  // -- IPs -------------------------------------------------------------------

  it('get_ip returns error without id', async () => {
    const result = await adapter.callTool('get_ip', {});
    expect(result.isError).toBe(true);
  });

  it('update_ip returns error without id', async () => {
    const result = await adapter.callTool('update_ip', {});
    expect(result.isError).toBe(true);
  });

  it('patch_ip returns error without id', async () => {
    const result = await adapter.callTool('patch_ip', {});
    expect(result.isError).toBe(true);
  });

  // -- MACs ------------------------------------------------------------------

  it('create_mac returns error without address', async () => {
    const result = await adapter.callTool('create_mac', { network_service_config: 'cfg-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('address');
  });

  it('create_mac returns error without network_service_config', async () => {
    const result = await adapter.callTool('create_mac', { address: 'aa:bb:cc:dd:ee:ff' });
    expect(result.isError).toBe(true);
  });

  it('get_mac returns error without id', async () => {
    const result = await adapter.callTool('get_mac', {});
    expect(result.isError).toBe(true);
  });

  it('delete_mac returns error without id', async () => {
    const result = await adapter.callTool('delete_mac', {});
    expect(result.isError).toBe(true);
  });

  // -- Member Joining Rules --------------------------------------------------

  it('create_member_joining_rule returns error without network_service', async () => {
    const result = await adapter.callTool('create_member_joining_rule', { type: 'AllowMemberJoiningRule' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('network_service');
  });

  it('get_member_joining_rule returns error without id', async () => {
    const result = await adapter.callTool('get_member_joining_rule', {});
    expect(result.isError).toBe(true);
  });

  it('update_member_joining_rule returns error without id', async () => {
    const result = await adapter.callTool('update_member_joining_rule', {});
    expect(result.isError).toBe(true);
  });

  it('patch_member_joining_rule returns error without id', async () => {
    const result = await adapter.callTool('patch_member_joining_rule', {});
    expect(result.isError).toBe(true);
  });

  it('delete_member_joining_rule returns error without id', async () => {
    const result = await adapter.callTool('delete_member_joining_rule', {});
    expect(result.isError).toBe(true);
  });
});
