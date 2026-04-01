#!/usr/bin/env node
/**
 * Epic AI® Legion — CLI Entry Point
 * `npx @epicai/legion` — setup wizard
 * `npx @epicai/legion --serve` — MCP server mode
 * `npx @epicai/legion add <name>` — add adapter
 * `npx @epicai/legion remove <name>` — remove adapter
 * `npx @epicai/legion health` — check adapter health
 * `npx @epicai/legion list` — list all adapters
 *
 * Legion is an Intelligent Virtual Assistant (IVA) — the AI classifies intent,
 * selects adapters, calls them, and synthesizes a response through your local
 * SLM or cloud LLM.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc.
 * Adapters: Elastic License 2.0 | SDK Framework: Apache-2.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EPIC_AI_DIR = join(homedir(), '.epic-ai');
const ENV_FILE = join(EPIC_AI_DIR, '.env');
const STATE_FILE = join(EPIC_AI_DIR, 'adapter-state.json');
const CONFIG_FILE = join(EPIC_AI_DIR, 'config.json');

// ─── Types ──────────────────────────────────────────────────

interface AdapterEntry {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  rest?: {
    module?: string;
    className?: string;
    baseUrl?: string;
    authType?: string;
    envKey?: string;
    toolCount?: number;
    toolNames?: string[];
  };
  mcp?: {
    transport?: string;
    packageName?: string;
    command?: string;
    args?: string[];
    url?: string;
    envKeys?: string[];
  };
}

interface AdapterState {
  schemaVersion: number;
  lastHealthCheck: string | null;
  adapters: Record<string, {
    type: string;
    status: string;
    toolCount: number;
    installedVersion?: string;
    lastVerified: string | null;
  }>;
}

interface LegionConfig {
  selectedAdapters: string[];
  secretsProvider: string;
  aiClient: string;
  localBackend?: string;
}

// ─── Package root ───────────────────────────────────────────

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return join(thisFile, '..', '..', '..');
}

// ─── Catalog loading ────────────────────────────────────────

async function loadCatalog(): Promise<AdapterEntry[]> {
  try {
    const catalogPath = join(getPackageRoot(), 'adapter-catalog.json');
    const raw = await readFile(catalogPath, 'utf-8');
    const entries = JSON.parse(raw) as Array<{
      name: string;
      displayName?: string;
      category?: string;
      description?: string;
      toolNames?: string[];
      keywords?: string[];
    }>;
    // Normalize catalog format to AdapterEntry
    return entries.map(e => ({
      id: e.name,
      name: e.displayName || e.name,
      description: e.description,
      category: e.category,
      type: 'rest' as const,
      rest: {
        toolCount: e.toolNames?.length || 0,
        toolNames: e.toolNames,
        envKey: `${e.name.toUpperCase().replace(/-/g, '_')}_API_KEY`,
      },
    }));
  } catch {
    return [];
  }
}

async function loadRegistry(): Promise<AdapterEntry[]> {
  try {
    const registryPath = join(getPackageRoot(), 'mcp-registry.json');
    const raw = await readFile(registryPath, 'utf-8');
    return JSON.parse(raw) as AdapterEntry[];
  } catch {
    return [];
  }
}

/** Merge catalog + registry, deduplicate by ID (registry wins for MCP info) */
async function loadAllAdapters(): Promise<AdapterEntry[]> {
  const catalog = await loadCatalog();
  const registry = await loadRegistry();
  const byId = new Map<string, AdapterEntry>();

  // Catalog first
  for (const a of catalog) byId.set(a.id, a);

  // Registry merges on top — adds MCP info to existing entries, adds new MCP-only entries
  for (const r of registry) {
    const existing = byId.get(r.id);
    if (existing) {
      // Merge MCP info into catalog entry
      if (r.mcp) existing.mcp = r.mcp;
      if (r.type === 'both' || r.type === 'mcp') existing.type = existing.rest ? 'both' : 'mcp';
    } else {
      byId.set(r.id, r);
    }
  }

  return Array.from(byId.values());
}

// ─── State management ───────────────────────────────────────

function ensureDir(): void {
  if (!existsSync(EPIC_AI_DIR)) {
    mkdirSync(EPIC_AI_DIR, { recursive: true });
  }
}

function loadState(): AdapterState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* fresh state */ }
  return { schemaVersion: 1, lastHealthCheck: null, adapters: {} };
}

function saveState(state: AdapterState): void {
  ensureDir();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadConfig(): LegionConfig | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch { /* no config */ }
  return null;
}

function saveConfig(config: LegionConfig): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Credential helpers ─────────────────────────────────────

function writeCredential(key: string, value: string): void {
  ensureDir();
  let existing = '';
  if (existsSync(ENV_FILE)) {
    existing = readFileSync(ENV_FILE, 'utf-8');
  }
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(existing)) {
    existing = existing.replace(regex, `${key}=${value}`);
  } else {
    existing += `${key}=${value}\n`;
  }
  writeFileSync(ENV_FILE, existing, 'utf-8');
  chmodSync(ENV_FILE, 0o600);
}

function loadCredentials(): Record<string, string> {
  const creds: Record<string, string> = {};
  if (!existsSync(ENV_FILE)) return creds;
  const lines = readFileSync(ENV_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      creds[line.slice(0, eq)] = line.slice(eq + 1);
    }
  }
  return creds;
}

// ─── System detection ───────────────────────────────────────

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  hasLlamaCpp: boolean;
  hasOllama: boolean;
  hasVllm: boolean;
  localPort: number | null;
  localBackend: string | null;
}

async function detectSystem(): Promise<SystemInfo> {
  const info: SystemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    hasLlamaCpp: false,
    hasOllama: false,
    hasVllm: false,
    localPort: null,
    localBackend: null,
  };

  for (const [port, name] of [[8080, 'llama.cpp'], [11434, 'Ollama'], [8000, 'vLLM']] as const) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`http://localhost:${port}/v1/models`, { signal: controller.signal });
      clearTimeout(t);
      if (resp.ok) {
        if (port === 8080) info.hasLlamaCpp = true;
        if (port === 11434) info.hasOllama = true;
        if (port === 8000) info.hasVllm = true;
        if (!info.localPort) {
          info.localPort = port;
          info.localBackend = name;
        }
      }
    } catch { /* not running */ }
  }

  return info;
}

// ─── MCP Server Mode (--serve) ──────────────────────────────

async function startMcpServer(): Promise<void> {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');

  const allAdapters = await loadAllAdapters();
  const config = loadConfig();
  const state = loadState();

  const server = new McpServer({
    name: 'epic-ai-legion',
    version: '1.0.0',
  });

  // Main query tool — the single entry point for the LLM
  server.tool(
    'legion_query',
    {
      query: z.string().describe('Natural language query — Legion routes to the right adapters'),
      adapters: z.array(z.string()).optional().describe('Optional: specific adapter IDs to target'),
    },
    async (args) => {
      const query = args.query;
      const targetAdapters = args.adapters;

      // Load credentials from ~/.epic-ai/.env
      const creds = loadCredentials();

      // Determine which adapters to use
      let candidates: AdapterEntry[];
      if (targetAdapters && targetAdapters.length > 0) {
        candidates = allAdapters.filter(a => targetAdapters.includes(a.id));
      } else if (config?.selectedAdapters && config.selectedAdapters.length > 0) {
        candidates = allAdapters.filter(a => config.selectedAdapters.includes(a.id));
      } else {
        candidates = allAdapters;
      }

      // BM25-style keyword matching to narrow candidates
      const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      const scored = candidates.map(adapter => {
        const text = `${adapter.id} ${adapter.name} ${adapter.description || ''} ${adapter.category || ''} ${(adapter.rest?.toolNames || []).join(' ')}`.toLowerCase();
        let score = 0;
        for (const token of queryTokens) {
          if (text.includes(token)) score++;
        }
        return { adapter, score };
      }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

      if (scored.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'no_match',
              message: `No adapters matched query: "${query}"`,
              hint: 'Try being more specific, or specify adapter IDs directly.',
              availableCategories: [...new Set(allAdapters.map(a => a.category).filter(Boolean))],
              totalAdapters: allAdapters.length,
            }),
          }],
        };
      }

      // Build response with matched adapter info and available tools
      const matches = scored.map(s => ({
        id: s.adapter.id,
        name: s.adapter.name,
        type: s.adapter.type,
        category: s.adapter.category,
        score: s.score,
        tools: s.adapter.rest?.toolNames || [],
        toolCount: s.adapter.rest?.toolCount || 0,
        configured: !!(creds[s.adapter.rest?.envKey || ''] || state.adapters[s.adapter.id]),
        transport: s.adapter.mcp?.transport || (s.adapter.rest ? 'rest' : 'unknown'),
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status: 'matched',
            query,
            matchedAdapters: matches,
            totalMatched: matches.length,
            message: `Found ${matches.length} relevant adapters. Use legion_call to execute a specific tool.`,
          }),
        }],
      };
    }
  );

  // Tool execution
  server.tool(
    'legion_call',
    {
      adapter: z.string().describe('Adapter ID (e.g., "github", "crowdstrike", "salesforce")'),
      tool: z.string().describe('Tool name to call on the adapter'),
      args: z.record(z.unknown()).optional().describe('Arguments to pass to the tool'),
    },
    async (toolArgs) => {
      const adapterId = toolArgs.adapter;
      const toolName = toolArgs.tool;
      const callArgs = toolArgs.args || {};

      const adapter = allAdapters.find(a => a.id === adapterId);
      if (!adapter) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Adapter "${adapterId}" not found` }) }],
          isError: true,
        };
      }

      // REST adapter execution
      if (adapter.rest?.module && adapter.rest?.className) {
        try {
          const creds = loadCredentials();
          const modulePath = join(getPackageRoot(), adapter.rest.module);
          const mod = await import(modulePath);
          const AdapterClass = mod[adapter.rest.className] || mod.default;

          // Build config from credentials
          const adapterConfig: Record<string, string> = {};
          if (adapter.rest.envKey && creds[adapter.rest.envKey]) {
            adapterConfig.apiKey = creds[adapter.rest.envKey];
          }
          if (adapter.rest.baseUrl) {
            adapterConfig.baseUrl = adapter.rest.baseUrl;
          }

          const instance = new AdapterClass(adapterConfig);
          const result = await instance.callTool(toolName, callArgs);

          return {
            content: [{ type: 'text' as const, text: typeof result.content === 'string' ? result.content : JSON.stringify(result.content) }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      // MCP stdio adapter — spawn and call
      if (adapter.mcp?.transport === 'stdio' && adapter.mcp?.command) {
        try {
          const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
          const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

          const transport = new StdioClientTransport({
            command: adapter.mcp.command,
            args: adapter.mcp.args || [],
          });
          const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
          await client.connect(transport);
          const result = await client.callTool({ name: toolName, arguments: callArgs as Record<string, string> });
          await client.close();

          const text = (result.content as Array<{ type: string; text?: string }>)
            .filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join('\n');

          return {
            content: [{ type: 'text' as const, text }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      // MCP HTTP adapter
      if (adapter.mcp?.transport === 'streamable-http' && adapter.mcp?.url) {
        try {
          const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
          const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

          const transport = new StreamableHTTPClientTransport(new URL(adapter.mcp.url));
          const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
          await client.connect(transport);
          const result = await client.callTool({ name: toolName, arguments: callArgs as Record<string, string> });
          await client.close();

          const text = (result.content as Array<{ type: string; text?: string }>)
            .filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join('\n');

          return {
            content: [{ type: 'text' as const, text }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `No executable transport for adapter "${adapterId}"` }) }],
        isError: true,
      };
    }
  );

  // List available adapters
  server.tool(
    'legion_list',
    {
      category: z.string().optional().describe('Filter by category'),
      search: z.string().optional().describe('Search by keyword'),
    },
    async (args) => {
      let results = allAdapters;

      if (args.category) {
        results = results.filter(a => a.category === args.category);
      }
      if (args.search) {
        const term = args.search.toLowerCase();
        results = results.filter(a =>
          a.id.includes(term) || a.name.toLowerCase().includes(term) ||
          (a.description || '').toLowerCase().includes(term)
        );
      }

      const categories = [...new Set(allAdapters.map(a => a.category).filter(Boolean))];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total: results.length,
            categories,
            adapters: results.slice(0, 50).map(a => ({
              id: a.id,
              name: a.name,
              category: a.category,
              type: a.type,
              toolCount: a.rest?.toolCount || 0,
            })),
            truncated: results.length > 50,
          }),
        }],
      };
    }
  );

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ─── Subcommands ────────────────────────────────────────────

async function cmdAdd(adapterName: string): Promise<void> {
  const p = await import('@clack/prompts');
  const pc = (await import('picocolors')).default;

  const all = await loadAllAdapters();

  const match = all.find(a => a.id === adapterName || a.name.toLowerCase() === adapterName.toLowerCase());
  if (!match) {
    const fuzzy = all.filter(a => a.id.includes(adapterName) || a.name.toLowerCase().includes(adapterName.toLowerCase()));
    if (fuzzy.length > 0) {
      console.log(`Adapter "${adapterName}" not found. Did you mean:`);
      fuzzy.slice(0, 5).forEach(a => console.log(`  ${pc.cyan(a.id)} — ${a.name}`));
    } else {
      console.log(`Adapter "${adapterName}" not found. Run ${pc.cyan('npx @epicai/legion list')} to see all adapters.`);
    }
    process.exit(1);
  }

  const s = p.spinner();

  // Install stdio dependency if needed
  if (match.mcp?.transport === 'stdio' && match.mcp?.packageName) {
    s.start(`Installing ${match.name}`);
    try {
      execSync(`npm install -g ${match.mcp.packageName}`, { stdio: 'pipe', timeout: 60000 });
      s.stop(`${pc.green('✓')} ${match.name} installed`);
    } catch {
      s.stop(`${pc.yellow('!')} Install failed — run manually: npm install -g ${match.mcp.packageName}`);
    }
  }

  // Prompt for credentials
  if (match.rest?.envKey) {
    const key = await p.password({ message: `${match.rest.envKey}` });
    if (!p.isCancel(key) && key) {
      writeCredential(match.rest.envKey, key);
    }
  } else if (match.mcp?.envKeys && match.mcp.envKeys.length > 0) {
    for (const envKey of match.mcp.envKeys) {
      const key = await p.password({ message: envKey });
      if (!p.isCancel(key) && key) {
        writeCredential(envKey, key);
      }
    }
  }

  // Update state
  const state = loadState();
  state.adapters[match.id] = {
    type: match.type || 'unknown',
    status: 'configured',
    toolCount: match.rest?.toolCount || 0,
    lastVerified: null,
  };
  saveState(state);

  // Update config
  const config = loadConfig() || { selectedAdapters: [], secretsProvider: 'manual', aiClient: 'unknown' };
  if (!config.selectedAdapters.includes(match.id)) {
    config.selectedAdapters.push(match.id);
  }
  saveConfig(config);

  console.log(`${pc.green('✓')} ${match.name} added to Legion.`);
}

async function cmdRemove(adapterName: string): Promise<void> {
  const pc = (await import('picocolors')).default;

  const state = loadState();
  const config = loadConfig();

  if (!state.adapters[adapterName]) {
    console.log(`Adapter "${adapterName}" is not configured.`);
    process.exit(1);
  }

  delete state.adapters[adapterName];
  saveState(state);

  if (config) {
    config.selectedAdapters = config.selectedAdapters.filter(id => id !== adapterName);
    saveConfig(config);
  }

  console.log(`${pc.green('✓')} ${adapterName} removed from Legion.`);
}

async function cmdHealth(): Promise<void> {
  const pc = (await import('picocolors')).default;
  const p = await import('@clack/prompts');

  const state = loadState();
  const creds = loadCredentials();
  const all = await loadAllAdapters();

  const configured = Object.keys(state.adapters);
  if (configured.length === 0) {
    console.log(`No adapters configured. Run ${pc.cyan('npx @epicai/legion')} to set up.`);
    return;
  }

  const s = p.spinner();
  s.start(`Checking ${configured.length} adapters`);

  const results: string[] = [];
  let healthy = 0;
  let issues = 0;

  for (const id of configured) {
    const adapter = all.find(a => a.id === id);
    if (!adapter) {
      results.push(`${pc.red('✗')} ${id} — not found in catalog`);
      issues++;
      continue;
    }

    // Check if credentials exist
    const hasKey = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : true;

    if (hasKey) {
      results.push(`${pc.green('✓')} ${adapter.name || id}  ${state.adapters[id].toolCount} tools  ${state.adapters[id].status}`);
      healthy++;
    } else {
      results.push(`${pc.yellow('!')} ${adapter.name || id}  missing ${adapter.rest?.envKey || 'credentials'}`);
      issues++;
    }
  }

  s.stop('Health check complete');

  p.note(results.join('\n'), `${healthy} healthy, ${issues} need attention`);

  state.lastHealthCheck = new Date().toISOString();
  saveState(state);
}

async function cmdList(searchTerm?: string): Promise<void> {
  const pc = (await import('picocolors')).default;
  const all = await loadAllAdapters();

  let filtered = all;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = all.filter(a =>
      a.id.includes(term) || a.name.toLowerCase().includes(term) ||
      (a.description || '').toLowerCase().includes(term) ||
      (a.category || '').includes(term)
    );
  }

  // Group by category
  const categories = new Map<string, AdapterEntry[]>();
  for (const a of filtered) {
    const cat = a.category || 'other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(a);
  }

  console.log('');
  console.log(`  Epic AI® Legion — ${filtered.length} adapters${searchTerm ? ` matching "${searchTerm}"` : ''}`);
  console.log('');

  for (const [cat, adapters] of Array.from(categories.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${pc.cyan(cat)} (${adapters.length})`);
    for (const a of adapters.slice(0, 10)) {
      const tools = a.rest?.toolCount ? `${a.rest.toolCount} tools` : '';
      const type = a.type === 'mcp' ? pc.dim('MCP') : a.type === 'both' ? pc.dim('REST+MCP') : pc.dim('REST');
      console.log(`    ${a.id.padEnd(35)} ${type}  ${tools}`);
    }
    if (adapters.length > 10) {
      console.log(`    ${pc.dim(`... and ${adapters.length - 10} more`)}`);
    }
    console.log('');
  }
}

// ─── Setup Wizard ───────────────────────────────────────────

async function runSetupWizard(): Promise<void> {
  const p = await import('@clack/prompts');
  const pc = (await import('picocolors')).default;

  console.log('');
  p.intro(pc.bgCyan(pc.black(' Epic AI® Legion — Intelligent Virtual Assistant ')));

  const s = p.spinner();

  // Step 1: System detection
  s.start('Detecting your system');
  const system = await detectSystem();
  const allAdapters = await loadAllAdapters();
  s.stop('System detected');

  p.note(
    [
      `${pc.green('✓')} Node.js ${system.nodeVersion}`,
      `${pc.green('✓')} ${system.platform} / ${system.arch}`,
      system.localBackend ? `${pc.green('✓')} ${system.localBackend} running on port ${system.localPort}` : `${pc.dim('○')} No local LLM detected`,
      `${pc.green('✓')} ${allAdapters.length} adapters available`,
    ].join('\n'),
    'System'
  );

  // Step 2: AI backend
  const aiChoice = await p.select({
    message: 'How are you using AI today?',
    options: [
      { value: 'claude-code', label: 'Claude Code', hint: 'Terminal AI agent' },
      { value: 'claude-desktop', label: 'Claude Desktop', hint: 'Desktop app' },
      { value: 'cursor', label: 'Cursor', hint: 'AI code editor' },
      { value: 'copilot', label: 'GitHub Copilot / VS Code', hint: 'MCP extension' },
      { value: 'other-mcp', label: 'Other MCP-compatible client' },
      { value: 'local', label: 'I want to run a local model', hint: 'advanced — requires SLM download' },
    ],
  });
  if (p.isCancel(aiChoice)) { p.cancel('Setup cancelled.'); process.exit(0); }

  // Cloud LLM — show MCP config
  if (aiChoice !== 'local') {
    const serverEntry = { legion: { command: 'npx', args: ['@epicai/legion', '--serve'] } };
    let configStr: string;
    let filePath: string;

    switch (aiChoice) {
      case 'claude-code':
        configStr = JSON.stringify({ mcpServers: serverEntry }, null, 2);
        filePath = '~/.claude/claude_desktop_config.json';
        break;
      case 'claude-desktop':
        configStr = JSON.stringify({ mcpServers: serverEntry }, null, 2);
        filePath = '~/Library/Application Support/Claude/claude_desktop_config.json';
        break;
      case 'cursor':
        configStr = JSON.stringify({ mcpServers: serverEntry }, null, 2);
        filePath = '.cursor/mcp.json';
        break;
      case 'copilot':
        configStr = JSON.stringify({ servers: serverEntry }, null, 2);
        filePath = '.vscode/mcp.json';
        break;
      default:
        configStr = JSON.stringify({ mcpServers: serverEntry }, null, 2);
        filePath = 'your MCP client config';
    }

    p.note(
      [
        `Add this to ${pc.cyan(filePath)}:`,
        '',
        pc.dim('─'.repeat(42)),
        configStr,
        pc.dim('─'.repeat(42)),
      ].join('\n'),
      'MCP Configuration'
    );

    const connectNow = await p.confirm({ message: 'Want to connect adapters now?', initialValue: true });
    if (p.isCancel(connectNow) || !connectNow) {
      p.note(
        [
          `Add adapters later:  ${pc.cyan('npx @epicai/legion add <name>')}`,
          `Check health:        ${pc.cyan('npx @epicai/legion health')}`,
          `List all adapters:   ${pc.cyan('npx @epicai/legion list')}`,
        ].join('\n'),
        'Quick reference'
      );
      saveConfig({ selectedAdapters: [], secretsProvider: 'manual', aiClient: aiChoice as string });
      p.outro(`${pc.green('Done.')} Restart your AI client and ask it anything.\n  Your credentials never leave this machine.`);
      return;
    }
  }

  // Local model path
  if (aiChoice === 'local') {
    if (system.localBackend) {
      p.log.success(`Using ${system.localBackend} on port ${system.localPort}`);
    } else {
      p.note(
        [
          'No local LLM detected. Install one:',
          '',
          `  ${pc.cyan('llama.cpp')}  — brew install llama.cpp`,
          `  ${pc.cyan('Ollama')}     — brew install ollama`,
          `  ${pc.cyan('vLLM')}       — pip install vllm`,
          '',
          'Start it, then re-run this wizard.',
        ].join('\n'),
        'Local AI Setup'
      );
      const cont = await p.confirm({ message: 'Continue without a local model?', initialValue: false });
      if (p.isCancel(cont) || !cont) { p.cancel('Install a local LLM and re-run.'); process.exit(0); }
    }
  }

  // Step 3: Secrets provider
  const secretsChoice = await p.select({
    message: 'Where are your API credentials stored?',
    options: [
      { value: 'vault', label: 'HashiCorp Vault' },
      { value: 'aws-sm', label: 'AWS Secrets Manager' },
      { value: 'azure-kv', label: 'Azure Key Vault' },
      { value: '1password', label: '1Password CLI' },
      { value: 'doppler', label: 'Doppler' },
      { value: 'env', label: 'Environment variables', hint: 'already exported in shell' },
      { value: 'manual', label: 'I\'ll enter them manually' },
    ],
  });
  if (p.isCancel(secretsChoice)) { p.cancel('Setup cancelled.'); process.exit(0); }

  let vaultAddr = '';
  let vaultToken = '';
  let vaultConnected = false;

  if (secretsChoice === 'vault') {
    const envAddr = process.env.VAULT_ADDR;
    const envToken = process.env.VAULT_TOKEN;

    if (envAddr && envToken) {
      p.log.success(`Detected VAULT_ADDR=${envAddr}`);
      vaultAddr = envAddr;
      vaultToken = envToken;
    } else {
      const addr = await p.text({
        message: 'Vault address',
        placeholder: 'https://vault.example.com:8200',
        validate: (v) => { if (!v) return 'Required'; if (!v.startsWith('http')) return 'Must start with http:// or https://'; },
      });
      if (p.isCancel(addr)) { p.cancel('Setup cancelled.'); process.exit(0); }
      const token = await p.password({ message: 'Vault token', validate: (v) => { if (!v) return 'Required'; } });
      if (p.isCancel(token)) { p.cancel('Setup cancelled.'); process.exit(0); }
      vaultAddr = addr;
      vaultToken = token;
    }

    s.start('Connecting to Vault');
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${vaultAddr}/v1/sys/health`, { headers: { 'X-Vault-Token': vaultToken }, signal: controller.signal });
      clearTimeout(t);
      if (resp.ok) {
        vaultConnected = true;
        s.stop(`Connected to Vault at ${vaultAddr}`);
        writeCredential('VAULT_ADDR', vaultAddr);
        writeCredential('VAULT_TOKEN', vaultToken);
      } else {
        s.stop(`Vault returned ${resp.status} — check your token`);
      }
    } catch {
      s.stop(`Cannot reach Vault at ${vaultAddr}`);
    }
  }

  if (secretsChoice === '1password') {
    try {
      execSync('op --version', { stdio: 'pipe' });
      p.log.success('1Password CLI detected');
    } catch {
      p.log.warning('1Password CLI not found — install from https://1password.com/downloads/command-line');
    }
  }

  if (secretsChoice === 'doppler') {
    try {
      execSync('doppler --version', { stdio: 'pipe' });
      p.log.success('Doppler CLI detected');
    } catch {
      p.log.warning('Doppler CLI not found — install from https://docs.doppler.com/docs/install-cli');
    }
  }

  // Step 4: Adapter selection
  const categories = new Map<string, AdapterEntry[]>();
  for (const adapter of allAdapters) {
    const cat = adapter.category || 'other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(adapter);
  }

  const categoryOptions = Array.from(categories.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, adapters]) => ({
      value: cat,
      label: `${cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')} (${adapters.length})`,
    }));

  const selectedCategories = await p.multiselect({
    message: 'Which categories do you need? (Space to select, Enter to confirm)',
    options: categoryOptions,
    required: false,
  });
  if (p.isCancel(selectedCategories)) { p.cancel('Setup cancelled.'); process.exit(0); }

  const selectedAdapterIds: string[] = [];

  if (selectedCategories.length > 0) {
    const available: { value: string; label: string; hint?: string }[] = [];
    for (const cat of selectedCategories) {
      for (const a of categories.get(cat) || []) {
        available.push({ value: a.id, label: a.name || a.id, hint: a.description?.slice(0, 60) });
      }
    }

    if (available.length > 0) {
      const selected = await p.multiselect({
        message: `Select adapters (${available.length} available)`,
        options: available.slice(0, 50),
        required: false,
      });

      if (!p.isCancel(selected)) {
        selectedAdapterIds.push(...selected);
      }
    }
  }

  // Step 5: Credentials
  if (selectedAdapterIds.length > 0) {
    if (secretsChoice === 'vault' && vaultConnected) {
      s.start('Pulling credentials from Vault');
      let pulled = 0;
      for (const adapterId of selectedAdapterIds) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 3000);
          const resp = await fetch(`${vaultAddr}/v1/secret/data/${adapterId}`, {
            headers: { 'X-Vault-Token': vaultToken },
            signal: controller.signal,
          });
          clearTimeout(t);
          if (resp.ok) {
            const data = await resp.json() as { data?: { data?: Record<string, string> } };
            const secrets = data?.data?.data;
            if (secrets) {
              for (const [k, v] of Object.entries(secrets)) {
                writeCredential(k, v);
              }
              pulled++;
            }
          }
        } catch { /* skip */ }
      }
      s.stop(`Pulled credentials for ${pulled} of ${selectedAdapterIds.length} adapters`);
    } else if (secretsChoice === '1password') {
      s.start('Pulling credentials from 1Password');
      let pulled = 0;
      for (const adapterId of selectedAdapterIds) {
        try {
          const result = execSync(`op item get "${adapterId}" --format json 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 });
          const item = JSON.parse(result);
          const fields = item.fields || [];
          for (const field of fields) {
            if (field.value && field.label) {
              const envKey = `${adapterId.toUpperCase().replace(/-/g, '_')}_${field.label.toUpperCase().replace(/\s+/g, '_')}`;
              writeCredential(envKey, field.value);
            }
          }
          pulled++;
        } catch { /* skip */ }
      }
      s.stop(`Pulled credentials for ${pulled} of ${selectedAdapterIds.length} adapters`);
    } else if (secretsChoice === 'doppler') {
      s.start('Pulling credentials from Doppler');
      try {
        const result = execSync('doppler secrets download --no-file --format json 2>/dev/null', { encoding: 'utf-8', timeout: 10000 });
        const secrets = JSON.parse(result);
        for (const [k, v] of Object.entries(secrets)) {
          if (typeof v === 'string') writeCredential(k, v);
        }
        s.stop('Credentials pulled from Doppler');
      } catch {
        s.stop('Doppler pull failed — configure with: doppler setup');
      }
    } else if (secretsChoice === 'manual') {
      for (const adapterId of selectedAdapterIds) {
        const adapter = allAdapters.find(a => a.id === adapterId);
        if (!adapter) continue;

        const envKey = adapter.rest?.envKey || `${adapterId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
        const key = await p.password({ message: `${envKey} for ${adapter.name || adapterId}` });
        if (!p.isCancel(key) && key) {
          writeCredential(envKey, key);
        }
      }
    } else if (secretsChoice === 'env') {
      p.log.info('Using credentials from environment variables');
    }

    // Step 6: Install stdio dependencies
    for (const adapterId of selectedAdapterIds) {
      const adapter = allAdapters.find(a => a.id === adapterId);
      if (!adapter?.mcp?.packageName || adapter.mcp.transport !== 'stdio') continue;

      s.start(`Installing ${adapter.name || adapterId}`);
      try {
        execSync(`npm install -g ${adapter.mcp.packageName}`, { stdio: 'pipe', timeout: 60000 });
        s.stop(`${pc.green('✓')} ${adapter.name || adapterId} installed`);
      } catch {
        s.stop(`${pc.yellow('!')} ${adapter.name || adapterId} — run manually: npm install -g ${adapter.mcp.packageName}`);
      }
    }

    // Step 7: Verify
    s.start('Verifying connections');
    const creds = loadCredentials();
    let verified = 0;
    const results: string[] = [];

    for (const adapterId of selectedAdapterIds) {
      const adapter = allAdapters.find(a => a.id === adapterId);
      if (!adapter) continue;

      const hasKey = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : false;
      if (hasKey) {
        verified++;
        results.push(`${pc.green('✓')} ${adapter.name || adapterId}  ${adapter.rest?.toolCount || 0} tools`);
      } else {
        results.push(`${pc.yellow('○')} ${adapter.name || adapterId}  credentials needed`);
      }
    }
    s.stop('Verification complete');

    if (results.length > 0) {
      p.note(results.join('\n'), `${verified} of ${selectedAdapterIds.length} adapters ready`);
    }
  }

  // Step 8: Save state and config
  const state = loadState();
  for (const id of selectedAdapterIds) {
    const adapter = allAdapters.find(a => a.id === id);
    state.adapters[id] = {
      type: adapter?.type || 'unknown',
      status: 'configured',
      toolCount: adapter?.rest?.toolCount || 0,
      lastVerified: null,
    };
  }
  saveState(state);
  saveConfig({
    selectedAdapters: selectedAdapterIds,
    secretsProvider: secretsChoice as string,
    aiClient: aiChoice as string,
    localBackend: system.localBackend || undefined,
  });

  // Outro
  p.note(
    [
      `Add adapters:     ${pc.cyan('npx @epicai/legion add <name>')}`,
      `Remove adapters:  ${pc.cyan('npx @epicai/legion remove <name>')}`,
      `Health check:     ${pc.cyan('npx @epicai/legion health')}`,
      `Update adapters:  ${pc.cyan('npx @epicai/legion update')}`,
      `List adapters:    ${pc.cyan('npx @epicai/legion list')}`,
    ].join('\n'),
    'Manage your adapters'
  );

  p.outro(`${pc.green('Legion is ready.')} Your credentials never leave this machine.`);
}

// ─── Main router ────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes('--serve')) {
    await startMcpServer();
    return;
  }

  switch (command) {
    case 'add':
      if (!args[1]) { console.error('Usage: npx @epicai/legion add <adapter-name>'); process.exit(1); }
      await cmdAdd(args[1]);
      break;
    case 'remove':
      if (!args[1]) { console.error('Usage: npx @epicai/legion remove <adapter-name>'); process.exit(1); }
      await cmdRemove(args[1]);
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'list':
      await cmdList(args[1]);
      break;
    case 'serve':
      await startMcpServer();
      break;
    default:
      await runSetupWizard();
      break;
  }
}

main().catch(err => {
  console.error('Legion error:', err.message || err);
  process.exit(1);
});
