/**
 * Portfolio Optimizer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Portfolio Optimizer MCP server was found on GitHub or the vendor site.
//
// Base URL: https://api.portfoliooptimizer.io/v1
// Auth: X-API-Key header (optional; API key required only for higher rate limits)
// Docs: https://portfoliooptimizer.io/api/
// Rate limits: Without API key: 1 req/second, 10 req/min. With key: higher limits per tier.
// Note: All endpoints are HTTP POST with JSON request bodies. Computationally intensive —
//       pass numeric arrays for assets, covariance matrices, and return series.

import { ToolDefinition, ToolResult } from './types.js';

interface PortfolioOptimizerConfig {
  /** Optional Portfolio Optimizer API key (X-API-Key header) for higher rate limits */
  apiKey?: string;
  /** Optional base URL override (default: https://api.portfoliooptimizer.io/v1) */
  baseUrl?: string;
}

export class PortfolioOptimizerMCPServer {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: PortfolioOptimizerConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.portfoliooptimizer.io/v1';
  }

  static catalog() {
    return {
      name: 'portfoliooptimizer',
      displayName: 'Portfolio Optimizer',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'portfoliooptimizer', 'portfolio', 'optimization', 'finance', 'investment',
        'mean variance', 'sharpe ratio', 'risk', 'covariance', 'correlation',
        'minimum variance', 'maximum return', 'diversification', 'rebalancing',
        'risk parity', 'hierarchical', 'efficient frontier', 'volatility',
        'value at risk', 'cvar', 'drawdown', 'alpha', 'beta', 'tracking error',
        'equal weight', 'market cap', 'assets', 'returns', 'simulation',
      ],
      toolNames: [
        'compute_absorption_ratio',
        'compute_turbulence_index',
        'compute_correlation_matrix',
        'compute_denoised_correlation_matrix',
        'compute_covariance_matrix',
        'compute_asset_returns',
        'compute_asset_volatility',
        'compute_asset_variance',
        'compute_portfolio_return',
        'compute_portfolio_volatility',
        'compute_portfolio_sharpe_ratio',
        'compute_portfolio_value_at_risk',
        'compute_portfolio_cvar',
        'compute_portfolio_drawdowns',
        'compute_portfolio_alpha',
        'compute_portfolio_beta',
        'compute_portfolio_tracking_error',
        'compute_risk_contributions',
        'compute_return_contributions',
        'compute_mean_variance_efficient_frontier',
        'optimize_equal_weighted',
        'optimize_equal_risk_contributions',
        'optimize_minimum_variance',
        'optimize_maximum_sharpe_ratio',
        'optimize_maximum_return',
        'optimize_hierarchical_risk_parity',
        'optimize_equal_volatility_weighted',
        'optimize_inverse_variance_weighted',
        'optimize_market_cap_weighted',
        'optimize_most_diversified',
        'optimize_mean_variance_efficient',
        'simulate_portfolio_rebalancing',
        'construct_random_portfolio',
      ],
      description: 'Quantitative portfolio optimization and analysis: mean-variance optimization, risk parity, Sharpe ratio, VaR, CVaR, correlation/covariance matrices, efficient frontier, and portfolio simulation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Assets / Analysis ─────────────────────────────────────────────────
      {
        name: 'compute_absorption_ratio',
        description: 'Compute the absorption ratio for a universe of assets using a covariance matrix to measure systemic risk concentration',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets in the universe (integer >= 2)' },
            assets_covariance_matrix: {
              type: 'array',
              description: 'NxN covariance matrix as nested arrays: assets_covariance_matrix[i][j] = covariance between asset i and j',
            },
            eigenvectors_retained: { type: 'number', description: 'Number of eigenvectors to retain in the numerator; defaults to 1/5 of asset count' },
          },
          required: ['assets', 'assets_covariance_matrix'],
        },
      },
      {
        name: 'compute_turbulence_index',
        description: 'Compute the Mahalanobis distance turbulence index for a set of asset returns to detect market stress',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            assets_average_returns: { type: 'array', description: 'Array of average returns per asset (length N)' },
            assets_returns: { type: 'array', description: 'Array of current period returns per asset (length N)' },
          },
          required: ['assets', 'assets_covariance_matrix', 'assets_average_returns', 'assets_returns'],
        },
      },

      // ── Assets / Correlation & Covariance ─────────────────────────────────
      {
        name: 'compute_correlation_matrix',
        description: 'Compute the Pearson correlation matrix from asset returns time series, with optional shrinkage or factor model',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset return series objects, each with a returns array' },
            computation_method: { type: 'string', description: 'Computation method: pearson (default), spearman, kendall' },
          },
        },
      },
      {
        name: 'compute_denoised_correlation_matrix',
        description: 'Compute a denoised correlation matrix using random matrix theory to remove noise from financial data',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_correlation_matrix: { type: 'array', description: 'NxN correlation matrix as nested arrays' },
            assets_correlation_matrix_aspect_ratio: { type: 'number', description: 'Aspect ratio T/N where T = number of observations, N = number of assets' },
            denoising_method: { type: 'string', description: 'Denoising method: eigenvalue-clipping (default), targeted-shrinkage' },
          },
          required: ['assets', 'assets_correlation_matrix', 'assets_correlation_matrix_aspect_ratio'],
        },
      },
      {
        name: 'compute_covariance_matrix',
        description: 'Compute the covariance matrix from asset return time series, with optional shrinkage or exponential weighting',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset objects, each with a returns array (time series)' },
            computation_method: { type: 'string', description: 'Method: covariance (default), shrinkage-ledoit-wolf, shrinkage-oracle-approximating' },
          },
        },
      },

      // ── Assets / Returns & Statistics ─────────────────────────────────────
      {
        name: 'compute_asset_returns',
        description: 'Compute arithmetic or logarithmic returns from asset price time series',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset objects, each with a prices array (price time series)' },
            returns_type: { type: 'string', description: 'Returns type: arithmetic (default), logarithmic' },
          },
          required: ['assets'],
        },
      },
      {
        name: 'compute_asset_volatility',
        description: 'Compute annualized volatility (standard deviation of returns) for each asset from a return series',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset objects, each with a returns array' },
          },
        },
      },
      {
        name: 'compute_asset_variance',
        description: 'Compute variance of returns for each asset from a return series or covariance matrix diagonal',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset objects, each with a returns array' },
          },
        },
      },

      // ── Portfolio Analysis ─────────────────────────────────────────────────
      {
        name: 'compute_portfolio_return',
        description: 'Compute arithmetic return of one or more portfolios from asset weights and asset returns',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects, each with assets array (weights and returns)' },
          },
        },
      },
      {
        name: 'compute_portfolio_volatility',
        description: 'Compute portfolio volatility (annualized standard deviation) from weights and covariance matrix',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects, each with assets array and covariance matrix' },
          },
        },
      },
      {
        name: 'compute_portfolio_sharpe_ratio',
        description: 'Compute Sharpe ratio for one or more portfolios given asset weights, returns, and a risk-free rate',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with weights and return series' },
            risk_free_rate: { type: 'number', description: 'Risk-free rate (annualized, e.g. 0.02 = 2%)' },
          },
        },
      },
      {
        name: 'compute_portfolio_value_at_risk',
        description: 'Compute Value at Risk (VaR) for portfolios at a given confidence level from historical returns',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with weights and return series' },
            alpha: { type: 'number', description: 'VaR confidence level (e.g. 0.05 for 95% VaR, 0.01 for 99% VaR)' },
          },
          required: ['portfolios', 'alpha'],
        },
      },
      {
        name: 'compute_portfolio_cvar',
        description: 'Compute Conditional Value at Risk (CVaR / Expected Shortfall) for portfolios at a given confidence level',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with weights and return series' },
            alpha: { type: 'number', description: 'CVaR confidence level (e.g. 0.05 for 95% CVaR)' },
          },
          required: ['portfolios', 'alpha'],
        },
      },
      {
        name: 'compute_portfolio_drawdowns',
        description: 'Compute maximum drawdown and drawdown series for portfolios from portfolio return time series',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects, each with a portfolioReturns array (time series)' },
          },
          required: ['portfolios'],
        },
      },
      {
        name: 'compute_portfolio_alpha',
        description: 'Compute Jensen alpha for a portfolio relative to a benchmark from return series',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with returns and benchmark returns' },
            risk_free_rate: { type: 'number', description: 'Risk-free rate (annualized)' },
          },
        },
      },
      {
        name: 'compute_portfolio_beta',
        description: 'Compute portfolio beta relative to a market benchmark from return time series',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with returns' },
            benchmark_returns: { type: 'array', description: 'Benchmark return series array (same length as portfolio returns)' },
          },
        },
      },
      {
        name: 'compute_portfolio_tracking_error',
        description: 'Compute tracking error (annualized standard deviation of excess returns) vs. a benchmark',
        inputSchema: {
          type: 'object',
          properties: {
            portfolios: { type: 'array', description: 'Array of portfolio objects with weight and return series' },
            benchmark_returns: { type: 'array', description: 'Benchmark return series: benchmarkReturns[t] is return at time t' },
          },
          required: ['portfolios', 'benchmark_returns'],
        },
      },
      {
        name: 'compute_risk_contributions',
        description: 'Compute marginal and percentage risk contributions of each asset to total portfolio risk',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            portfolios: { type: 'array', description: 'Array of portfolio objects with asset weights' },
          },
          required: ['assets', 'assets_covariance_matrix', 'portfolios'],
        },
      },
      {
        name: 'compute_return_contributions',
        description: 'Compute the return contribution of each asset position to total portfolio return',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_returns: { type: 'array', description: 'Array of asset arithmetic returns (length N)' },
            portfolios: { type: 'array', description: 'Array of portfolio objects with asset weights' },
          },
          required: ['assets', 'assets_returns', 'portfolios'],
        },
      },
      {
        name: 'compute_mean_variance_efficient_frontier',
        description: 'Compute the mean-variance efficient frontier as a set of optimal risk-return portfolios',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_returns: { type: 'array', description: 'Expected return for each asset (length N)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            portfolios: { type: 'number', description: 'Number of portfolios to compute on the frontier (default: 100)' },
            constraints: { type: 'object', description: 'Optional weight constraints object (e.g. assetsWeights min/max bounds)' },
          },
          required: ['assets', 'assets_returns', 'assets_covariance_matrix'],
        },
      },

      // ── Portfolio Optimization ─────────────────────────────────────────────
      {
        name: 'optimize_equal_weighted',
        description: 'Compute the equal-weighted (1/N) portfolio for a given number of assets',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 1)' },
          },
          required: ['assets'],
        },
      },
      {
        name: 'optimize_equal_risk_contributions',
        description: 'Compute the equal risk contributions (risk parity) portfolio from a covariance matrix',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            constraints: { type: 'object', description: 'Optional weight constraints (min/max per asset or group)' },
          },
          required: ['assets', 'assets_covariance_matrix'],
        },
      },
      {
        name: 'optimize_minimum_variance',
        description: 'Compute the global minimum variance portfolio from a covariance matrix with optional constraints',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            assets_returns: { type: 'array', description: 'Optional expected returns array (length N) for constrained optimization' },
            constraints: { type: 'object', description: 'Optional weight constraints object' },
          },
          required: ['assets', 'assets_covariance_matrix'],
        },
      },
      {
        name: 'optimize_maximum_sharpe_ratio',
        description: 'Compute the maximum Sharpe ratio (tangency) portfolio from returns, covariance matrix, and risk-free rate',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_returns: { type: 'array', description: 'Expected return for each asset (length N)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            risk_free_rate: { type: 'number', description: 'Risk-free rate (e.g. 0.02 for 2%)' },
            constraints: { type: 'object', description: 'Optional weight constraints object' },
          },
          required: ['assets', 'assets_returns', 'assets_covariance_matrix', 'risk_free_rate'],
        },
      },
      {
        name: 'optimize_maximum_return',
        description: 'Compute the maximum return portfolio given expected returns and optional volatility or weight constraints',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_returns: { type: 'array', description: 'Expected return for each asset (length N)' },
            assets_covariance_matrix: { type: 'array', description: 'Optional NxN covariance matrix for variance constraints' },
            constraints: { type: 'object', description: 'Optional weight or risk constraints object' },
          },
          required: ['assets', 'assets_returns'],
        },
      },
      {
        name: 'optimize_hierarchical_risk_parity',
        description: 'Compute the Hierarchical Risk Parity (HRP) portfolio using hierarchical clustering on a covariance matrix',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            clustering_method: { type: 'string', description: 'Hierarchical clustering linkage: ward (default), single, complete, average' },
            clustering_ordering: { type: 'string', description: 'Leaf ordering method: optimal (default), inverse' },
            constraints: { type: 'object', description: 'Optional weight constraints object' },
          },
          required: ['assets', 'assets_covariance_matrix'],
        },
      },
      {
        name: 'optimize_equal_volatility_weighted',
        description: 'Compute equal volatility weighted portfolio from per-asset volatilities (inverse-vol scaled to equal vol)',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_volatilities: { type: 'array', description: 'Array of per-asset volatilities (length N)' },
          },
          required: ['assets', 'assets_volatilities'],
        },
      },
      {
        name: 'optimize_inverse_variance_weighted',
        description: 'Compute inverse variance weighted portfolio allocating proportionally to 1/variance per asset',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_variances: { type: 'array', description: 'Array of per-asset variances (length N)' },
          },
          required: ['assets', 'assets_variances'],
        },
      },
      {
        name: 'optimize_market_cap_weighted',
        description: 'Compute market capitalization weighted portfolio from per-asset market capitalizations',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_market_capitalizations: { type: 'array', description: 'Array of market capitalizations per asset (length N)' },
          },
          required: ['assets', 'assets_market_capitalizations'],
        },
      },
      {
        name: 'optimize_most_diversified',
        description: 'Compute the most diversified portfolio maximizing the diversification ratio from a covariance matrix',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            constraints: { type: 'object', description: 'Optional weight constraints object' },
          },
          required: ['assets', 'assets_covariance_matrix'],
        },
      },
      {
        name: 'optimize_mean_variance_efficient',
        description: 'Compute a mean-variance efficient portfolio satisfying specific return or risk constraints',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            assets_returns: { type: 'array', description: 'Expected return for each asset (length N)' },
            assets_covariance_matrix: { type: 'array', description: 'NxN covariance matrix as nested arrays' },
            constraints: { type: 'object', description: 'Constraints object specifying target return, risk, or weight bounds' },
          },
          required: ['assets', 'assets_returns', 'assets_covariance_matrix', 'constraints'],
        },
      },

      // ── Portfolio Simulation ───────────────────────────────────────────────
      {
        name: 'simulate_portfolio_rebalancing',
        description: 'Simulate fixed-weight or drift-weight portfolio rebalancing over time from asset return series',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'array', description: 'Array of asset objects with return series' },
            portfolios: { type: 'array', description: 'Array of portfolio objects specifying initial weights and rebalancing schedule' },
            rebalancing_type: { type: 'string', description: 'Rebalancing type: fixed-weight (periodic), drift-weight (buy-and-hold), random-weight' },
          },
          required: ['assets', 'portfolios'],
        },
      },

      // ── Portfolio Construction ─────────────────────────────────────────────
      {
        name: 'construct_random_portfolio',
        description: 'Generate random portfolios uniformly distributed on the simplex, useful for Monte Carlo analysis',
        inputSchema: {
          type: 'object',
          properties: {
            assets: { type: 'number', description: 'Number of assets (integer >= 2)' },
            portfolios: { type: 'number', description: 'Number of random portfolios to generate (default: 1)' },
            constraints: { type: 'object', description: 'Optional weight constraints (min/max bounds per asset)' },
          },
          required: ['assets'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'compute_absorption_ratio': return await this.post('/assets/analysis/absorption-ratio', this.buildAbsorptionRatioBody(args));
        case 'compute_turbulence_index': return await this.post('/assets/analysis/turbulence-index', this.buildTurbulenceBody(args));
        case 'compute_correlation_matrix': return await this.post('/assets/correlation/matrix', this.buildAssetsBody(args));
        case 'compute_denoised_correlation_matrix': return await this.post('/assets/correlation/matrix/denoised', this.buildDenoisedCorrBody(args));
        case 'compute_covariance_matrix': return await this.post('/assets/covariance/matrix', this.buildAssetsBody(args));
        case 'compute_asset_returns': return await this.post('/assets/returns', this.buildAssetsBody(args));
        case 'compute_asset_volatility': return await this.post('/assets/volatility', this.buildAssetsBody(args));
        case 'compute_asset_variance': return await this.post('/assets/variance', this.buildAssetsBody(args));
        case 'compute_portfolio_return': return await this.post('/portfolio/analysis/return', this.buildPortfoliosBody(args));
        case 'compute_portfolio_volatility': return await this.post('/portfolio/analysis/volatility', this.buildPortfoliosBody(args));
        case 'compute_portfolio_sharpe_ratio': return await this.post('/portfolio/analysis/sharpe-ratio', this.buildPortfoliosRfBody(args));
        case 'compute_portfolio_value_at_risk': return await this.post('/portfolio/analysis/value-at-risk', this.buildVarBody(args));
        case 'compute_portfolio_cvar': return await this.post('/portfolio/analysis/conditional-value-at-risk', this.buildVarBody(args));
        case 'compute_portfolio_drawdowns': return await this.post('/portfolio/analysis/drawdowns', this.buildPortfoliosBody(args));
        case 'compute_portfolio_alpha': return await this.post('/portfolio/analysis/alpha', this.buildPortfoliosRfBody(args));
        case 'compute_portfolio_beta': return await this.post('/portfolio/analysis/beta', this.buildBetaBody(args));
        case 'compute_portfolio_tracking_error': return await this.post('/portfolio/analysis/tracking-error', this.buildTrackingErrorBody(args));
        case 'compute_risk_contributions': return await this.post('/portfolio/analysis/contributions/risk', this.buildRiskContribBody(args));
        case 'compute_return_contributions': return await this.post('/portfolio/analysis/contributions/return', this.buildReturnContribBody(args));
        case 'compute_mean_variance_efficient_frontier': return await this.post('/portfolio/analysis/mean-variance/efficient-frontier', this.buildEfficientFrontierBody(args));
        case 'optimize_equal_weighted': return await this.post('/portfolio/optimization/equal-weighted', { assets: args.assets });
        case 'optimize_equal_risk_contributions': return await this.post('/portfolio/optimization/equal-risk-contributions', this.buildErcBody(args));
        case 'optimize_minimum_variance': return await this.post('/portfolio/optimization/minimum-variance', this.buildMinVarBody(args));
        case 'optimize_maximum_sharpe_ratio': return await this.post('/portfolio/optimization/maximum-sharpe-ratio', this.buildMaxSharpeBody(args));
        case 'optimize_maximum_return': return await this.post('/portfolio/optimization/maximum-return', this.buildMaxReturnBody(args));
        case 'optimize_hierarchical_risk_parity': return await this.post('/portfolio/optimization/hierarchical-risk-parity', this.buildHrpBody(args));
        case 'optimize_equal_volatility_weighted': return await this.post('/portfolio/optimization/equal-volatility-weighted', { assets: args.assets, assetsVolatilities: args.assets_volatilities });
        case 'optimize_inverse_variance_weighted': return await this.post('/portfolio/optimization/inverse-variance-weighted', { assets: args.assets, assetsVariances: args.assets_variances });
        case 'optimize_market_cap_weighted': return await this.post('/portfolio/optimization/market-capitalization-weighted', { assets: args.assets, assetsMarketCapitalizations: args.assets_market_capitalizations });
        case 'optimize_most_diversified': return await this.post('/portfolio/optimization/most-diversified', this.buildErcBody(args));
        case 'optimize_mean_variance_efficient': return await this.post('/portfolio/optimization/mean-variance-efficient', this.buildMeanVarEfficientBody(args));
        case 'simulate_portfolio_rebalancing': return await this.simulateRebalancing(args);
        case 'construct_random_portfolio': return await this.post('/portfolio/construction/random', this.buildRandomPortfolioBody(args));
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private: HTTP ─────────────────────────────────────────────────────────

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  // ── Private: Request body builders ───────────────────────────────────────

  private buildAbsorptionRatioBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
    };
    if (args.eigenvectors_retained !== undefined) {
      body.assetsCovarianceMatrixEigenvectors = { eigenvectorsRetained: args.eigenvectors_retained };
    }
    return body;
  }

  private buildTurbulenceBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
      assetsAverageReturns: args.assets_average_returns,
      assetsReturns: args.assets_returns,
    };
  }

  private buildAssetsBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.assets !== undefined) body.assets = args.assets;
    if (args.computation_method !== undefined) body.computationMethod = args.computation_method;
    if (args.returns_type !== undefined) body.returnsType = args.returns_type;
    return body;
  }

  private buildDenoisedCorrBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsCorrelationMatrix: args.assets_correlation_matrix,
      assetsCorrelationMatrixAspectRatio: args.assets_correlation_matrix_aspect_ratio,
    };
    if (args.denoising_method !== undefined) body.denoisingMethod = args.denoising_method;
    return body;
  }

  private buildPortfoliosBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.portfolios !== undefined) body.portfolios = args.portfolios;
    if (args.assets !== undefined) body.assets = args.assets;
    return body;
  }

  private buildPortfoliosRfBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.portfolios !== undefined) body.portfolios = args.portfolios;
    if (args.risk_free_rate !== undefined) body.riskFreeRate = args.risk_free_rate;
    return body;
  }

  private buildVarBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      portfolios: args.portfolios,
      alpha: args.alpha,
    };
  }

  private buildBetaBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (args.portfolios !== undefined) body.portfolios = args.portfolios;
    if (args.benchmark_returns !== undefined) body.benchmarkReturns = args.benchmark_returns;
    return body;
  }

  private buildTrackingErrorBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      portfolios: args.portfolios,
      benchmarkReturns: args.benchmark_returns,
    };
  }

  private buildRiskContribBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
      portfolios: args.portfolios,
    };
  }

  private buildReturnContribBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      assets: args.assets,
      assetsReturns: args.assets_returns,
      portfolios: args.portfolios,
    };
  }

  private buildEfficientFrontierBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsReturns: args.assets_returns,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
    };
    if (args.portfolios !== undefined) body.portfolios = args.portfolios;
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildErcBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
    };
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildMinVarBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
    };
    if (args.assets_returns !== undefined) body.assetsReturns = args.assets_returns;
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildMaxSharpeBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsReturns: args.assets_returns,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
      riskFreeRate: args.risk_free_rate,
    };
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildMaxReturnBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsReturns: args.assets_returns,
    };
    if (args.assets_covariance_matrix !== undefined) body.assetsCovarianceMatrix = args.assets_covariance_matrix;
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildHrpBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      assets: args.assets,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
    };
    if (args.clustering_method !== undefined) body.clusteringMethod = args.clustering_method;
    if (args.clustering_ordering !== undefined) body.clusteringOrdering = args.clustering_ordering;
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }

  private buildMeanVarEfficientBody(args: Record<string, unknown>): Record<string, unknown> {
    return {
      assets: args.assets,
      assetsReturns: args.assets_returns,
      assetsCovarianceMatrix: args.assets_covariance_matrix,
      constraints: args.constraints,
    };
  }

  private async simulateRebalancing(args: Record<string, unknown>): Promise<ToolResult> {
    const rebalancingType = (args.rebalancing_type as string) ?? 'fixed-weight';
    const pathMap: Record<string, string> = {
      'fixed-weight': '/portfolio/simulation/rebalancing/fixed-weight',
      'drift-weight': '/portfolio/simulation/rebalancing/drift-weight',
      'random-weight': '/portfolio/simulation/rebalancing/random-weight',
    };
    const path = pathMap[rebalancingType] ?? '/portfolio/simulation/rebalancing/fixed-weight';
    const body: Record<string, unknown> = {
      assets: args.assets,
      portfolios: args.portfolios,
    };
    return this.post(path, body);
  }

  private buildRandomPortfolioBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { assets: args.assets };
    if (args.portfolios !== undefined) body.portfolios = args.portfolios;
    if (args.constraints !== undefined) body.constraints = args.constraints;
    return body;
  }
}
