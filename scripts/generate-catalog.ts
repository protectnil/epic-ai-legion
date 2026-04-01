#!/usr/bin/env npx tsx
/**
 * @epicai/legion — Adapter Catalog Generator
 * Reads compiled adapters from dist/mcp-servers/, instantiates each,
 * reads the tools getter, and generates adapter-catalog.json.
 *
 * Run automatically via `npm run build` (postbuild hook).
 * Manual: `npx tsx scripts/generate-catalog.ts`
 *
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { readdir, writeFile, readFile } from 'node:fs/promises';
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

  // Post-process: reclassify misc entries and merge duplicate categories
  const RECLASSIFY: Record<string, string[]> = {
    'healthcare': ['athenahealth','epic-fhir','fhir','veeva','drchrono','infermedica','lumminary','orthanc-server','patientview','slicebox','twinehealth','healthgorilla','kareo','practice-fusion','allscripts','cdcgov-prime-data-hub','cowin-cin-cowincert'],
    'hr': ['bamboohr','culture-amp','cornerstone','gusto','hibob','lattice','namely','paychex','paycom','paylocity','personio','rippling','workday','adp','deel','remote-com','checkr','greenhouse','lever','recruitee','breezy-hr','jobvite'],
    'legal': ['clio','docusign','ironclad','relativity','pandadoc','hellosign'],
    'real-estate': ['appfolio','costar','zillow','yardi','realogy','mls','buildium','rentec-direct'],
    'travel': ['amadeus','sabre','travelport','navan','canada-post','dhl','easypost','fedex','flexport','shippo','shipstation','ups','usps','lyft','samsara','transavia','viator'],
    'design': ['canva','figma','adobe-acrobat-api','adobe-aem','brightcove','contentful','sanity','strapi','ghost','wordpress','loom','vimeo'],
    'productivity': ['calendly','bizzabo','cvent','eventbrite','citrixonline-gotomeeting','envoy','hopin','coda','miro'],
    'devops': ['app-store-connect','apple-business-connect','builtwith','crowdin','deepl','postman','swagger','vercel','netlify','render','railway'],
    'hospitality': ['toast','opentable','infogenesis','opera-pms','mews','cloudbeds','olo','grubhub'],
    'construction': ['procore','autodesk-construction','plangrid','buildertrend'],
    'manufacturing': ['epicor','infor','sap','netsuite'],
    'erp': ['odoo'],
    'insurance': ['duck-creek','guidewire','majesco'],
    'government': ['accela','civicplus'],
    'education': ['canvas-lms','blackboard','powerschool','docebo','schoology','clever'],
    'collaboration': ['box','egnyte','notion','confluence','dropbox-business','airtable','asana','monday','trello','clickup','basecamp','linear','front'],
    'marketing': ['cision','classy','canny','activecampaign','mailchimp','hubspot-marketing','marketo','brevo','klaviyo','sendgrid','mailgun','postmark','buffer','hootsuite'],
    'customer-support': ['freshdesk','freshservice','zendesk','intercom','helpscout','servicenow'],
    'crm': ['close-crm','apollo','clearbit','outreach','salesloft','pipedrive','hubspot','salesforce','dynamics-365','gainsight','blackbaud','bloomerang'],
    'communication': ['five9','bandwidth','twilio','vonage','ringcentral','dialpad','aircall','plivo','telnyx'],
    'finance': ['alchemy','alpha-vantage','polygon-io','coingecko'],
    'media': ['associated-press','spotify','youtube','twitch','substack','devto','reddit','tiktok-ads','instagram-graph','meta-ads','meta-graph-api','linkedin','linkedin-ads','the-trade-desk','brandwatch','nytimes-archive','nytimes-article-search','nytimes-books-api','nytimes-geo-api','nytimes-most-popular-api','nytimes-movie-reviews','nytimes-semantic-api','nytimes-times-tags','nytimes-timeswire','nytimes-top-stories','newsapi','wikimedia'],
    'data': ['accuweather','census','census-gov','data-gov','crunchbase','dbt-cloud','fivetran','hightouch','bigquery','elasticsearch','fauna','cockroachdb','clickhouse','confluent-kafka','databricks','mongodb','snowflake'],
    'commerce': ['shopify','square','bigcommerce','magento','lightspeed','squarespace','woocommerce','amazon-ads','toast'],
    'observability': ['appdynamics','coralogix','cribl','datadog-observability','datadog-rum','dynatrace','elastic-apm','firehydrant','fullstory','grafana-api','honeycomb','incident-io','instana','logrocket','new-relic','pagerduty','splunk','statuspage','opsgenie'],
    'iot': ['ebi-ac-uk','google-home','netatmo','smart-me','enode','opto22-pac','opto22-groov','particle','clearblade','samsara'],
    'ai': ['anthropic-api','arize-ai','azure-ml','cohere','fireworks-ai','google-document-ai','google-translate','google-vertex-ai','groq','huggingface','langchain-api','langsmith','llamaindex-api','mistral-ai','ollama-api','openai','replicate','wandb'],
  };
  const MERGE_CATS: Record<string, string> = {
    'ai-ml': 'ai', 'ecommerce': 'commerce', 'sales': 'crm', 'realestate': 'real-estate',
    'sports': 'media', 'food': 'hospitality', 'aerospace': 'engineering', 'music': 'media',
    'gaming': 'media', 'analytics': 'data', 'agriculture': 'science',
  };

  for (const entry of catalog) {
    // Merge duplicate categories first
    if (entry.category && MERGE_CATS[entry.category]) {
      entry.category = MERGE_CATS[entry.category];
    }
    // Reclassify misc
    if (!entry.category || entry.category === 'misc') {
      for (const [newCat, ids] of Object.entries(RECLASSIFY)) {
        if (ids.includes(entry.name)) {
          entry.category = newCat;
          break;
        }
      }
    }
  }

  await writeFile(OUTPUT, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`\nGenerated adapter-catalog.json: ${catalog.length} entries (${errors} skipped)`);

  // Report MCP registry stats
  const REGISTRY_PATH = join(__dirname, '..', 'mcp-registry.json');
  try {
    const registryRaw = await readFile(REGISTRY_PATH, 'utf-8');
    const registry = JSON.parse(registryRaw) as Array<{ id: string; type?: string; mcp?: { transport?: string } }>;
    const mcpOnly = registry.filter(e => e.type === 'mcp');
    const both = registry.filter(e => e.type === 'both');
    const rest = registry.filter(e => e.type === 'rest');
    const stdioMcps = registry.filter(e => e.mcp?.transport === 'stdio');
    const httpMcps = registry.filter(e => e.mcp?.transport === 'streamable-http' || e.mcp?.transport === 'sse');

    console.log(`\nmcp-registry.json: ${registry.length} entries`);
    console.log(`  REST-only: ${rest.length} | REST+MCP: ${both.length} | MCP-only: ${mcpOnly.length}`);
    console.log(`  Transports: ${stdioMcps.length} stdio, ${httpMcps.length} streamable-HTTP/SSE`);

    // Deduplicated total
    const catalogIds = new Set(catalog.map(e => e.name));
    const mcpOnlyNew = mcpOnly.filter(e => !catalogIds.has(e.id));
    const totalIntegrations = catalog.length + mcpOnlyNew.length;
    console.log(`\nTotal integrations: ${totalIntegrations} (${catalog.length} REST + ${mcpOnlyNew.length} MCP-only)`);
  } catch {
    console.log('\nmcp-registry.json: not found (MCP stats unavailable)');
  }
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
