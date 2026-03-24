#!/usr/bin/env npx tsx
/**
 * @epicai/core — Adapter Catalog Generator
 * Reads compiled adapters from dist/mcp-servers/, instantiates each,
 * reads the tools getter, and generates adapter-catalog.json.
 *
 * Run automatically via `npm run build` (postbuild hook).
 * Manual: `npx tsx scripts/generate-catalog.ts`
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { readdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist', 'mcp-servers');
const OUTPUT = join(__dirname, '..', 'adapter-catalog.json');
const SKIP_FILES = new Set(['types.js', 'MockMCPAdapter.js']);

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'and',
  'or', 'but', 'not', 'no', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'only', 'same', 'so',
  'than', 'too', 'very', 'just', 'if', 'this', 'that', 'it', 'its',
  'get', 'set', 'list', 'show', 'find', 'check', 'using', 'use',
  'return', 'returns', 'type', 'object', 'string', 'number', 'boolean',
  'default', 'optional', 'required', 'filter', 'query',
]);

interface ToolDef {
  name: string;
  description: string;
}

interface CatalogEntry {
  name: string;
  displayName: string;
  version: string;
  category: string;
  keywords: string[];
  toolNames: string[];
  description: string;
  author: string;
}

function fileNameToAdapterName(filename: string): string {
  return basename(filename, '.js');
}

function classNameToDisplayName(className: string): string {
  return className.replace(/MCPServer$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function extractKeywords(adapterName: string, tools: ToolDef[]): string[] {
  const words = new Set<string>();
  words.add(adapterName);

  for (const tool of tools) {
    for (const part of tool.name.split('_')) {
      const lower = part.toLowerCase();
      if (lower.length > 1 && !STOPWORDS.has(lower)) words.add(lower);
    }
    if (tool.description) {
      for (const word of tool.description.toLowerCase().replace(/[^a-z0-9-]/g, ' ').split(/\s+/)) {
        if (word.length > 2 && !STOPWORDS.has(word)) words.add(word);
      }
    }
  }

  return Array.from(words);
}

async function main(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(DIST_DIR);
  } catch {
    console.error(`Error: ${DIST_DIR} not found. Run 'tsc' first.`);
    process.exit(1);
  }

  const jsFiles = files
    .filter(f => f.endsWith('.js') && !f.endsWith('.map') && !f.endsWith('.d.ts'))
    .filter(f => !SKIP_FILES.has(f))
    .sort();

  console.log(`Scanning ${jsFiles.length} adapter files...`);

  const catalog: CatalogEntry[] = [];
  let errors = 0;

  for (const file of jsFiles) {
    const adapterName = fileNameToAdapterName(file);
    const filePath = join(DIST_DIR, file);

    try {
      const module = await import(filePath);
      let AdapterClass: (new (config: Record<string, string>) => { tools: ToolDef[] }) | null = null;
      let className = '';

      for (const [key, value] of Object.entries(module)) {
        if (typeof value === 'function' && key.endsWith('MCPServer')) {
          AdapterClass = value as typeof AdapterClass;
          className = key;
          break;
        }
      }

      if (!AdapterClass) { console.warn(`  SKIP ${file}: no *MCPServer class`); continue; }

      const staticCatalog = (AdapterClass as unknown as { catalog?: () => CatalogEntry }).catalog;
      if (typeof staticCatalog === 'function') {
        catalog.push(staticCatalog());
        console.log(`  OK   ${adapterName} (static catalog)`);
        continue;
      }

      let instance: { tools: ToolDef[] };
      try {
        instance = new AdapterClass({ apiToken: 'stub', clientId: 'stub', clientSecret: 'stub', apiKey: 'stub', botToken: 'stub', token: 'stub', accessToken: 'stub' });
      } catch { console.warn(`  SKIP ${file}: constructor threw`); errors++; continue; }

      let tools: ToolDef[];
      try { tools = instance.tools; } catch { console.warn(`  SKIP ${file}: tools getter threw`); errors++; continue; }

      if (!Array.isArray(tools) || tools.length === 0) { console.warn(`  SKIP ${file}: no tools`); errors++; continue; }

      catalog.push({
        name: adapterName,
        displayName: classNameToDisplayName(className),
        version: '1.0.0',
        category: 'misc',
        keywords: extractKeywords(adapterName, tools),
        toolNames: tools.map(t => t.name),
        description: '',
        author: 'protectnil',
      });

      console.log(`  OK   ${adapterName} (inferred, ${tools.length} tools)`);
    } catch (err) {
      console.warn(`  SKIP ${file}: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  await writeFile(OUTPUT, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`\nGenerated adapter-catalog.json: ${catalog.length} entries (${errors} skipped)`);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
