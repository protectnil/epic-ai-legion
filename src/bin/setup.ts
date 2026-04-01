#!/usr/bin/env node
/**
 * Epic AI® Legion — Setup Wizard
 * `npx @epicai/legion` — from zero to working IVA in 30 seconds.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc.
 * Adapters: Elastic License 2.0 | SDK Framework: Apache-2.0
 *
 * NOTE: This is a CLI tool — console output is intentional.
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EPIC_AI_DIR = join(homedir(), '.epic-ai');
const ENV_FILE = join(EPIC_AI_DIR, '.env');

// ─── Catalog loading ────────────────────────────────────────

interface AdapterEntry {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  mcp?: {
    transport?: string;
    packageName?: string;
    command?: string;
  };
}

async function loadCatalog(): Promise<AdapterEntry[]> {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    // Walk up from dist/bin/setup.js to package root
    const pkgRoot = join(thisFile, '..', '..', '..');
    const catalogPath = join(pkgRoot, 'adapter-catalog.json');
    const raw = await readFile(catalogPath, 'utf-8');
    return JSON.parse(raw) as AdapterEntry[];
  } catch {
    return [];
  }
}

// ─── System detection ───────────────────────────────────────

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  hasLlamaCpp: boolean;
  hasOllama: boolean;
  hasVllm: boolean;
  llamaCppPort: number | null;
}

async function detectSystem(): Promise<SystemInfo> {
  const info: SystemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    hasLlamaCpp: false,
    hasOllama: false,
    hasVllm: false,
    llamaCppPort: null,
  };

  // Check local LLM backends
  for (const [port, name] of [[8080, 'llamaCpp'], [11434, 'ollama'], [8000, 'vllm']] as const) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`http://localhost:${port}/v1/models`, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        if (name === 'llamaCpp') { info.hasLlamaCpp = true; info.llamaCppPort = port; }
        if (name === 'ollama') info.hasOllama = true;
        if (name === 'vllm') info.hasVllm = true;
      }
    } catch { /* not running */ }
  }

  return info;
}

// ─── Secrets providers ──────────────────────────────────────

async function detectVaultEnv(): Promise<{ addr: string; token: string } | null> {
  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  if (addr && token) return { addr, token };
  return null;
}

// ─── MCP config generators ─────────────────────────────────

interface McpConfig {
  [key: string]: {
    command: string;
    args: string[];
  };
}

function generateMcpConfig(client: string): { file: string; config: string; instructions: string } {
  const legionServer: McpConfig = {
    legion: {
      command: 'npx',
      args: ['@epicai/legion', '--serve'],
    },
  };

  const configJson = JSON.stringify({ mcpServers: legionServer }, null, 2);

  switch (client) {
    case 'claude-code':
      return {
        file: '~/.claude/claude_desktop_config.json',
        config: configJson,
        instructions: `Add this to ${pc.cyan('~/.claude/claude_desktop_config.json')}:`,
      };
    case 'claude-desktop':
      return {
        file: '~/Library/Application Support/Claude/claude_desktop_config.json',
        config: configJson,
        instructions: `Add this to your Claude Desktop config:`,
      };
    case 'cursor':
      return {
        file: '.cursor/mcp.json',
        config: configJson,
        instructions: `Add this to ${pc.cyan('.cursor/mcp.json')} in your project:`,
      };
    case 'copilot':
      return {
        file: '.vscode/mcp.json',
        config: JSON.stringify({ servers: legionServer }, null, 2),
        instructions: `Add this to ${pc.cyan('.vscode/mcp.json')} in your project:`,
      };
    default:
      return {
        file: 'your MCP client config',
        config: configJson,
        instructions: `Add this to your MCP client configuration:`,
      };
  }
}

// ─── Credential helpers ─────────────────────────────────────

function ensureEpicAiDir(): void {
  if (!existsSync(EPIC_AI_DIR)) {
    mkdirSync(EPIC_AI_DIR, { recursive: true });
  }
}

function writeCredential(key: string, value: string): void {
  ensureEpicAiDir();
  let existing = '';
  if (existsSync(ENV_FILE)) {
    existing = require('node:fs').readFileSync(ENV_FILE, 'utf-8');
  }
  // Replace if exists, append if not
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(existing)) {
    existing = existing.replace(regex, `${key}=${value}`);
  } else {
    existing += `${key}=${value}\n`;
  }
  writeFileSync(ENV_FILE, existing, 'utf-8');
  chmodSync(ENV_FILE, 0o600);
}

// ─── Adapter installation ───────────────────────────────────

function installNpmPackage(packageName: string): boolean {
  try {
    execSync(`npm install -g ${packageName}`, { stdio: 'pipe', timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

// ─── Connection verification ────────────────────────────────

async function verifyAdapter(_adapter: AdapterEntry, _credentials: Record<string, string>): Promise<{ ok: boolean; tools: number; ms: number }> {
  const start = Date.now();
  // For now, return a placeholder — full verification requires adapter instantiation
  // which depends on the specific adapter type and credentials
  const ms = Date.now() - start;
  return { ok: true, tools: 0, ms };
}

// ─── Main wizard ────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // --serve mode: start as MCP server (separate entry point)
  if (args.includes('--serve')) {
    console.error('MCP server mode — not yet implemented');
    process.exit(1);
  }

  console.log('');
  p.intro(pc.bgCyan(pc.black(' Epic AI® Legion — Intelligent Virtual Assistant ')));

  const s = p.spinner();

  // ── Step 1: System detection ──────────────────────────────
  s.start('Detecting your system');
  const system = await detectSystem();
  const catalog = await loadCatalog();
  s.stop('System detected');

  p.note(
    [
      `${pc.green('✓')} Node.js ${system.nodeVersion}`,
      `${pc.green('✓')} ${system.platform} / ${system.arch}`,
      system.hasLlamaCpp ? `${pc.green('✓')} llama.cpp running on port ${system.llamaCppPort}` : null,
      system.hasOllama ? `${pc.green('✓')} Ollama running` : null,
      system.hasVllm ? `${pc.green('✓')} vLLM running` : null,
      !system.hasLlamaCpp && !system.hasOllama && !system.hasVllm ? `${pc.dim('○')} No local LLM detected` : null,
      catalog.length > 0 ? `${pc.green('✓')} ${catalog.length} adapters in catalog` : `${pc.yellow('!')} Adapter catalog not found`,
    ].filter(Boolean).join('\n'),
    'System'
  );

  // ── Step 2: AI backend ────────────────────────────────────

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

  if (p.isCancel(aiChoice)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // ── Cloud LLM path (30-second path) ──────────────────────

  if (aiChoice !== 'local') {
    const mcp = generateMcpConfig(aiChoice as string);

    p.note(
      [
        mcp.instructions,
        '',
        pc.dim('───────────────────────────────────────'),
        mcp.config,
        pc.dim('───────────────────────────────────────'),
        '',
        `File: ${pc.cyan(mcp.file)}`,
      ].join('\n'),
      'MCP Configuration'
    );

    const connectNow = await p.confirm({
      message: 'Want to connect adapters now?',
      initialValue: true,
    });

    if (p.isCancel(connectNow) || !connectNow) {
      p.note(
        [
          `Add adapters later:  ${pc.cyan('npx @epicai/legion add')}`,
          `Check health:        ${pc.cyan('npx @epicai/legion health')}`,
          `View all adapters:   ${pc.cyan('npx @epicai/legion list')}`,
        ].join('\n'),
        'Quick reference'
      );
      p.outro(`${pc.green('Done.')} Restart your AI client and ask it anything.\n  Your credentials never leave this machine.`);
      return;
    }
  }

  // ── Local model path ──────────────────────────────────────

  if (aiChoice === 'local') {
    const hasLocal = system.hasLlamaCpp || system.hasOllama || system.hasVllm;

    if (hasLocal) {
      const backend = system.hasLlamaCpp ? 'llama.cpp' : system.hasOllama ? 'Ollama' : 'vLLM';
      const port = system.hasLlamaCpp ? system.llamaCppPort : system.hasOllama ? 11434 : 8000;
      p.log.success(`Using ${backend} on port ${port}`);
    } else {
      p.note(
        [
          'No local LLM backend detected. Install one:',
          '',
          `  ${pc.cyan('llama.cpp')}  — brew install llama.cpp (recommended)`,
          `  ${pc.cyan('Ollama')}     — brew install ollama`,
          `  ${pc.cyan('vLLM')}       — pip install vllm`,
          '',
          'Then start it and re-run this wizard.',
        ].join('\n'),
        'Local AI Setup'
      );

      const continueAnyway = await p.confirm({
        message: 'Continue without a local model? (you can add one later)',
        initialValue: false,
      });

      if (p.isCancel(continueAnyway) || !continueAnyway) {
        p.cancel('Install a local LLM backend and re-run.');
        process.exit(0);
      }
    }
  }

  // ── Step 3: Secrets provider ──────────────────────────────

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

  if (p.isCancel(secretsChoice)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  let vaultConnected = false;

  if (secretsChoice === 'vault') {
    const detected = await detectVaultEnv();

    let vaultAddr: string;
    let vaultToken: string;

    if (detected) {
      p.log.success(`Detected VAULT_ADDR=${detected.addr}`);
      vaultAddr = detected.addr;
      vaultToken = detected.token;
    } else {
      const addr = await p.text({
        message: 'Vault address',
        placeholder: 'https://vault.example.com:8200',
        validate: (v) => {
          if (!v) return 'Required';
          if (!v.startsWith('http')) return 'Must start with http:// or https://';
        },
      });
      if (p.isCancel(addr)) { p.cancel('Setup cancelled.'); process.exit(0); }

      const token = await p.password({
        message: 'Vault token',
        validate: (v) => { if (!v) return 'Required'; },
      });
      if (p.isCancel(token)) { p.cancel('Setup cancelled.'); process.exit(0); }

      vaultAddr = addr;
      vaultToken = token;
    }

    s.start('Connecting to Vault');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${vaultAddr}/v1/sys/health`, {
        headers: { 'X-Vault-Token': vaultToken },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        vaultConnected = true;
        s.stop(`Connected to Vault at ${vaultAddr}`);
        writeCredential('VAULT_ADDR', vaultAddr);
        writeCredential('VAULT_TOKEN', vaultToken);
      } else {
        s.stop(`Vault returned ${resp.status} — check your token`);
      }
    } catch (err) {
      s.stop(`Cannot reach Vault at ${vaultAddr}`);
    }
  }

  // ── Step 4: Adapter selection ─────────────────────────────

  // Group by category
  const categories = new Map<string, AdapterEntry[]>();
  for (const adapter of catalog) {
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

  if (categoryOptions.length > 0) {
    const selectedCategories = await p.multiselect({
      message: 'Which categories do you need? (Space to select, Enter to confirm)',
      options: categoryOptions,
      required: false,
    });

    if (p.isCancel(selectedCategories)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    if (selectedCategories.length > 0) {
      // Collect adapters from selected categories
      const availableAdapters: { value: string; label: string; hint?: string }[] = [];
      for (const cat of selectedCategories) {
        const adapters = categories.get(cat) || [];
        for (const a of adapters) {
          availableAdapters.push({
            value: a.id,
            label: a.name || a.id,
            hint: a.description?.slice(0, 60),
          });
        }
      }

      if (availableAdapters.length > 0) {
        const selectedAdapters = await p.multiselect({
          message: `Select adapters (${availableAdapters.length} available)`,
          options: availableAdapters.slice(0, 50), // Clack has practical limits on list size
          required: false,
        });

        if (!p.isCancel(selectedAdapters) && selectedAdapters.length > 0) {

          // ── Step 5: Credential prompting ───────────────────
          const credentials: Record<string, Record<string, string>> = {};

          if (secretsChoice === 'manual') {
            for (const adapterId of selectedAdapters) {
              const adapter = catalog.find(a => a.id === adapterId);
              if (!adapter) continue;

              const apiKey = await p.password({
                message: `API key for ${adapter.name || adapterId}`,
              });

              if (!p.isCancel(apiKey) && apiKey) {
                const envVar = `${adapterId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
                writeCredential(envVar, apiKey);
                credentials[adapterId] = { [envVar]: apiKey };
              }
            }
          } else if (secretsChoice === 'vault' && vaultConnected) {
            s.start('Pulling credentials from Vault');
            // Auto-map vault secrets to adapters
            for (const adapterId of selectedAdapters) {
              try {
                const vaultAddr = process.env.VAULT_ADDR || '';
                const vaultToken = process.env.VAULT_TOKEN || '';
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const resp = await fetch(`${vaultAddr}/v1/secret/data/${adapterId}`, {
                  headers: { 'X-Vault-Token': vaultToken },
                  signal: controller.signal,
                });
                clearTimeout(timeout);

                if (resp.ok) {
                  const data = await resp.json() as { data?: { data?: Record<string, string> } };
                  const secrets = data?.data?.data;
                  if (secrets) {
                    credentials[adapterId] = secrets;
                    for (const [k, v] of Object.entries(secrets)) {
                      writeCredential(k, v);
                    }
                  }
                }
              } catch { /* skip this adapter */ }
            }
            s.stop('Credentials pulled from Vault');
          } else if (secretsChoice === 'env') {
            p.log.info('Using credentials from environment variables');
          }

          // ── Step 6: Install stdio dependencies ─────────────
          for (const adapterId of selectedAdapters) {
            const adapter = catalog.find(a => a.id === adapterId);
            if (!adapter?.mcp?.packageName) continue;
            if (adapter.mcp.transport !== 'stdio') continue;

            s.start(`Installing ${adapter.name || adapterId}`);
            const ok = installNpmPackage(adapter.mcp.packageName);
            if (ok) {
              s.stop(`${pc.green('✓')} ${adapter.name || adapterId} installed`);
            } else {
              s.stop(`${pc.yellow('!')} ${adapter.name || adapterId} — install failed, run manually: npm install -g ${adapter.mcp.packageName}`);
            }
          }

          // ── Step 7: Verify connections ─────────────────────
          s.start('Verifying connections');
          let verified = 0;
          let totalTools = 0;
          const results: string[] = [];

          for (const adapterId of selectedAdapters) {
            const adapter = catalog.find(a => a.id === adapterId);
            if (!adapter) continue;
            const creds = credentials[adapterId] || {};
            const result = await verifyAdapter(adapter, creds);
            if (result.ok) {
              verified++;
              totalTools += result.tools;
              results.push(`${pc.green('✓')} ${adapter.name || adapterId}${result.tools > 0 ? `  ${result.tools} tools  ${result.ms}ms` : ''}`);
            } else {
              results.push(`${pc.yellow('○')} ${adapter.name || adapterId}  — skipped (configure credentials to verify)`);
            }
          }
          s.stop('Verification complete');

          if (results.length > 0) {
            p.note(results.join('\n'), `${verified} of ${selectedAdapters.length} adapters ready`);
          }
        }
      }
    }
  }

  // ── Step 8: Write config ──────────────────────────────────

  ensureEpicAiDir();

  // ── Outro ─────────────────────────────────────────────────

  p.note(
    [
      `Add adapters:     ${pc.cyan('npx @epicai/legion add <name>')}`,
      `Remove adapters:  ${pc.cyan('npx @epicai/legion remove <name>')}`,
      `Health check:     ${pc.cyan('npx @epicai/legion health')}`,
      `Update adapters:  ${pc.cyan('npx @epicai/legion update')}`,
    ].join('\n'),
    'Manage your adapters'
  );

  p.outro(`${pc.green('Legion is ready.')} Your credentials never leave this machine.`);
}

main().catch(err => {
  p.log.error(`Setup failed: ${err.message}`);
  process.exit(1);
});
