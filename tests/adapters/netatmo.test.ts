import { describe, it, expect } from 'vitest';
import { NetatmoMCPServer } from '../../src/mcp-servers/netatmo.js';

describe('NetatmoMCPServer', () => {
  const adapter = new NetatmoMCPServer({ accessToken: 'test-access-token' });

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

  it('exposes expected tool categories', () => {
    const toolNames = adapter.tools.map((t) => t.name);
    expect(toolNames).toContain('get_user');
    expect(toolNames).toContain('get_stations_data');
    expect(toolNames).toContain('get_homecoach_data');
    expect(toolNames).toContain('get_measure');
    expect(toolNames).toContain('get_public_data');
    expect(toolNames).toContain('get_thermostats_data');
    expect(toolNames).toContain('set_therm_point');
    expect(toolNames).toContain('switch_schedule');
    expect(toolNames).toContain('get_home_data');
    expect(toolNames).toContain('set_persons_away');
    expect(toolNames).toContain('add_webhook');
  });

  it('missing required fields return error result without throwing', async () => {
    const result = await adapter.callTool('get_measure', { device_id: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('scale is required');
  });

  it('set_therm_point missing args returns error without throwing', async () => {
    const result = await adapter.callTool('set_therm_point', { device_id: 'test' });
    expect(result.isError).toBe(true);
  });

  it('get_public_data missing coords returns error without throwing', async () => {
    const result = await adapter.callTool('get_public_data', { lat_ne: 48.9 });
    expect(result.isError).toBe(true);
  });

  it('static catalog returns correct category and author', () => {
    const catalog = NetatmoMCPServer.catalog();
    expect(catalog.category).toBe('iot');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.name).toBe('netatmo');
    expect(catalog.keywords).toContain('netatmo');
    expect(catalog.keywords).toContain('weather');
    expect(catalog.keywords).toContain('thermostat');
  });
});
