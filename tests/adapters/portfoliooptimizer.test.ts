import { describe, it, expect } from 'vitest';
import { PortfolioOptimizerMCPServer } from '../../src/mcp-servers/portfoliooptimizer.js';

describe('PortfolioOptimizerMCPServer', () => {
  const adapter = new PortfolioOptimizerMCPServer({});
  const adapterWithKey = new PortfolioOptimizerMCPServer({ apiKey: 'test-api-key' });

  it('instantiates without error (no API key)', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates without error (with API key)', () => {
    expect(adapterWithKey).toBeDefined();
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

  it('exposes optimization tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('optimize_minimum_variance');
    expect(toolNames).toContain('optimize_maximum_sharpe_ratio');
    expect(toolNames).toContain('optimize_equal_risk_contributions');
    expect(toolNames).toContain('optimize_hierarchical_risk_parity');
    expect(toolNames).toContain('optimize_equal_weighted');
  });

  it('exposes analysis tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('compute_portfolio_sharpe_ratio');
    expect(toolNames).toContain('compute_portfolio_value_at_risk');
    expect(toolNames).toContain('compute_portfolio_cvar');
    expect(toolNames).toContain('compute_risk_contributions');
    expect(toolNames).toContain('compute_mean_variance_efficient_frontier');
  });

  it('exposes asset analysis tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('compute_absorption_ratio');
    expect(toolNames).toContain('compute_turbulence_index');
    expect(toolNames).toContain('compute_correlation_matrix');
    expect(toolNames).toContain('compute_covariance_matrix');
  });

  it('optimize_equal_weighted requires assets', () => {
    const tool = adapter.tools.find(t => t.name === 'optimize_equal_weighted');
    expect(tool?.inputSchema.required).toContain('assets');
  });

  it('optimize_maximum_sharpe_ratio requires assets, returns, covariance matrix, and risk-free rate', () => {
    const tool = adapter.tools.find(t => t.name === 'optimize_maximum_sharpe_ratio');
    expect(tool?.inputSchema.required).toContain('assets');
    expect(tool?.inputSchema.required).toContain('assets_returns');
    expect(tool?.inputSchema.required).toContain('assets_covariance_matrix');
    expect(tool?.inputSchema.required).toContain('risk_free_rate');
  });

  it('compute_absorption_ratio requires assets and covariance matrix', () => {
    const tool = adapter.tools.find(t => t.name === 'compute_absorption_ratio');
    expect(tool?.inputSchema.required).toContain('assets');
    expect(tool?.inputSchema.required).toContain('assets_covariance_matrix');
  });
});
