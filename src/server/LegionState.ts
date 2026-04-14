/**
 * @epicai/legion — Legion State
 * Shared runtime state loaded once at startup, used by all transports.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolPreFilter } from '../federation/ToolPreFilter.js';
import type { VectorRecord } from '../federation/ToolPreFilter.js';

// =============================================================================
// Adapter catalog types (local — setup.ts keeps its own copy)
// =============================================================================

export interface AdapterEntry {
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
    toolNames?: string[];
  };
  /** Maps the adapter's native severity strings to Praetor's normalized vocabulary.
   *  Missing key defaults to 'info'. */
  severityMap?: Record<string, 'info' | 'low' | 'medium' | 'high' | 'critical'>;
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

// =============================================================================
// LegionState interface
// =============================================================================

export interface LegionState {
  /** All adapters from the catalog. */
  allAdapters: AdapterEntry[];
  /** Indexed by adapter id for O(1) lookup. */
  adapterById: Map<string, AdapterEntry>;
  /** BM25 pre-filter over configured adapters (default search scope). */
  toolPreFilter: ToolPreFilter;
  /** BM25 pre-filter over full catalog (discover mode). */
  fullCatalogFilter: ToolPreFilter;
  /** ISO timestamp of when the catalog was last loaded. */
  loadedAt: string;
  /**
   * Returns adapters the given tenant is authorized to search and call.
   *
   * In Legion 2.0.0 OSS: the tenantId parameter is ignored. The function
   * always returns the globally-configured adapter set built from
   * ~/.epic-ai/.env at startup. All callers see the same set.
   *
   * This is the injection point for Chariot's enterprise build, which
   * replaces this function with an IAM credential-store lookup keyed on
   * tenantId. Legion 2.0.0 ships only the OSS implementation.
   */
  getConfiguredAdapters(tenantId: string): AdapterEntry[];
  /** Adapter IDs that are configured in the OSS single-user build. */
  configuredAdapterIds: Set<string>;
  /** Credentials loaded from ~/.epic-ai/.env at startup. */
  credentials: Record<string, string>;
  /** Absolute path to the package root (directory containing package.json). */
  packageRoot: string;
}

// =============================================================================
// File path constants
// =============================================================================

const EPIC_AI_DIR = join(homedir(), '.epic-ai');
const ENV_FILE = join(EPIC_AI_DIR, '.env');
const STATE_FILE = join(EPIC_AI_DIR, 'adapter-state.json');
const CONFIG_FILE = join(EPIC_AI_DIR, 'config.json');

// =============================================================================
// Internal helpers
// =============================================================================

function getPackageRoot(): string {
  // src/server/LegionState.ts → dist/server/LegionState.js at runtime
  // join(file, '..') → dist/server, '../..') → dist, '../../..') → root
  const thisFile = fileURLToPath(import.meta.url);
  return join(thisFile, '..', '..', '..');
}

async function loadAllAdapters(): Promise<AdapterEntry[]> {
  try {
    const catalogPath = join(getPackageRoot(), 'adapter-catalog.json');
    const raw = await readFile(catalogPath, 'utf-8');
    return JSON.parse(raw) as AdapterEntry[];
  } catch {
    return [];
  }
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

function loadAdapterState(): AdapterState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as AdapterState;
    }
  } catch { /* fresh state */ }
  return { schemaVersion: 1, lastHealthCheck: null, adapters: {} };
}

function loadConfig(): LegionConfig | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as LegionConfig;
    }
  } catch { /* no config */ }
  return null;
}

function getConfiguredAdapterIds(
  allAdapters: AdapterEntry[],
  creds: Record<string, string>,
  config: LegionConfig | null,
  state: AdapterState,
): Set<string> {
  const ids = new Set<string>();
  for (const adapter of allAdapters) {
    const hasCredential = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : false;
    const hasMcpKeys = adapter.mcp?.envKeys?.some(k => !!creds[k]) ?? false;
    const isSelected = config?.selectedAdapters?.includes(adapter.id) ?? false;
    const isInState = !!state.adapters[adapter.id];
    if (hasCredential || hasMcpKeys || isSelected || isInState) {
      ids.add(adapter.id);
    }
  }
  return ids;
}

export function buildToolsForRouting(adapters: AdapterEntry[]): Array<{
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  server: string;
  tier: 'orchestrated' | 'direct';
}> {
  const tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    server: string;
    tier: 'orchestrated' | 'direct';
  }> = [];

  for (const adapter of adapters) {
    const toolNames = adapter.rest?.toolNames ?? adapter.mcp?.toolNames ?? [];
    const adapterDesc = adapter.description ?? adapter.id;
    if (toolNames.length === 0) {
      tools.push({
        name: `${adapter.id}:default`,
        description: `${adapter.name} — ${adapterDesc}`,
        parameters: { type: 'object', properties: {} },
        server: adapter.id,
        tier: 'orchestrated',
      });
    } else {
      for (const t of toolNames) {
        tools.push({
          name: `${adapter.id}:${t}`,
          description: `${adapter.name} — ${t.replace(/_/g, ' ')} — ${adapterDesc}`,
          parameters: { type: 'object', properties: {} },
          server: adapter.id,
          tier: 'orchestrated',
        });
      }
    }
  }
  return tools;
}

// =============================================================================
// loadLegionState
// =============================================================================

export async function loadLegionState(): Promise<LegionState> {
  const allAdapters = await loadAllAdapters();
  const credentials = loadCredentials();
  const adapterState = loadAdapterState();
  const config = loadConfig();
  const packageRoot = getPackageRoot();

  const configuredAdapterIds = getConfiguredAdapterIds(allAdapters, credentials, config, adapterState);
  const configuredAdapters = allAdapters.filter(a => configuredAdapterIds.has(a.id));

  const toolPreFilter = new ToolPreFilter();
  const fullCatalogFilter = new ToolPreFilter();
  toolPreFilter.index(buildToolsForRouting(configuredAdapters));
  fullCatalogFilter.index(buildToolsForRouting(allAdapters));

  // Load vector index if available (BM25+miniCOIL hybrid when present)
  try {
    const vectorPath = join(packageRoot, 'vector-index.json');
    const vectorRaw = await readFile(vectorPath, 'utf-8');
    const vectorRecords = JSON.parse(vectorRaw) as VectorRecord[];
    toolPreFilter.loadVectorIndex(vectorRecords);
    fullCatalogFilter.loadVectorIndex(vectorRecords);
  } catch { /* no vector index — BM25 only */ }

  const adapterById = new Map(allAdapters.map(a => [a.id, a]));

  return {
    allAdapters,
    adapterById,
    toolPreFilter,
    fullCatalogFilter,
    loadedAt: new Date().toISOString(),
    getConfiguredAdapters(_tenantId: string): AdapterEntry[] {
      // OSS build: tenantId ignored. Chariot enterprise injects a different implementation.
      return configuredAdapters;
    },
    configuredAdapterIds,
    credentials,
    packageRoot,
  };
}
