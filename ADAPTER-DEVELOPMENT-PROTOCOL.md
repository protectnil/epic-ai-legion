# Adapter Development Protocol

**Package:** `@epicai/core`
**License:** Apache 2.0
**Applies to:** All adapters in `src/mcp-servers/`, all contributors (protectNIL, vendor, community)

---

## Purpose

This document is the mandatory standard for building, reviewing, and shipping adapters in the Epic AI Intelligence Platform. Every adapter in the SDK — whether built by protectNIL, contributed by a vendor, or submitted by the community — follows this protocol. No exceptions.

An adapter connects the Epic AI orchestrator to a vendor's API. When a user asks "show me open PagerDuty incidents," the orchestrator selects the `list_incidents` tool from the PagerDuty adapter, calls it, and uses the result in its response. The adapter is the bridge between the AI and the vendor's data.

---

## Decision: REST Wrapper vs. Vendor MCP

Before writing any code, determine the integration strategy.

### When to connect to a vendor's official MCP server

Use the vendor's MCP server when ALL of these are true:

1. The vendor publishes an official MCP server (GitHub repo, npm package, or documented endpoint)
2. The MCP server is actively maintained (commits within the last 6 months)
3. The MCP server exposes 10+ tools (full API surface coverage)
4. The MCP server supports stdio or streamable-HTTP transport

**If the vendor has an official MCP server, document it in the adapter file header.** Even if you build a REST wrapper (see below), the MCP server must be documented so users know it exists and future contributors can evaluate migration.

### When to build a REST API wrapper

Build a REST wrapper when ANY of these are true:

1. The vendor has no official MCP server
2. The vendor's MCP server is abandoned (no commits in 6+ months)
3. The vendor's MCP server covers fewer tools than our adapter would
4. The customer requires air-gapped deployment (no npm install at runtime)
5. The vendor's MCP server has unresolved security issues

### When to ship both

Never ship both for the same vendor in the same deployment. However, the adapter catalog may list both options:

- `transport: 'rest-api'` — our REST wrapper (default, works everywhere)
- `transport: 'mcp-stdio'` — vendor's MCP server (requires `npx` or local install)

The FederationManager connects one or the other per vendor, never both simultaneously.

### Documentation requirement

Every adapter file must include a header comment block documenting the vendor's MCP status:

```typescript
// Official MCP: https://github.com/vendor/mcp-server-name — transport: stdio, auth: API token
// Our adapter covers: 8 tools (core operations). Vendor MCP covers: 60+ tools (full API).
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped deployments.
```

Or if no MCP exists:

```typescript
// Official MCP: None found as of [date]
// No official [Vendor] MCP server was found on GitHub.
```

---

## Tool Count: Ship Complete, Filter Smart

### Do not artificially limit tool count

An adapter should expose every operation a developer would reasonably need. If Salesforce has 30 operations, expose 30. If CrowdStrike has 20, expose 20. Do not cap at 5 or 8.

The orchestrator's three-tier tool resolution handles selection:

1. **Tier 1 — Domain Classifier** narrows 2,000+ adapters to the ~5-20 most relevant
2. **Tier 2 — BM25 Pre-Filter** narrows those adapters' tools to the top 8 (configurable)
3. **Tier 3 — Orchestrator SLM** sees only those 8 tools and picks the right one

The adapter's job is completeness. The pre-filter's job is selection. Do not confuse them.

### Tool tiers

Every tool has a tier that determines how it participates in orchestration:

| Tier | Behavior | Use case |
|---|---|---|
| `orchestrated` | Participates in three-tier resolution. SLM can select it. | Common operations: list, get, search, create, update |
| `direct` | Registered in ToolRegistry but NOT sent to SLM. Callable by explicit name only. | Rare/dangerous operations: bulk delete, schema migration, admin config |

**Default tier:** All tools default to `orchestrated`. Set `tier: 'direct'` only for tools that are rarely needed or could cause damage if selected by a small model with imperfect judgment.

**Vendor MCP tools:** When connecting a vendor MCP server with 60+ tools, all tools register as `direct` by default. The DomainClassifier + BM25 promote the most relevant to `orchestrated` per query. This prevents a 60-tool vendor MCP from flooding the SLM's context.

---

## Adapter File Structure

Every REST API adapter is a single TypeScript file in `src/mcp-servers/`. One file per vendor.

### File naming

```
src/mcp-servers/{vendor-name}.ts
```

Lowercase, hyphenated. Match the vendor's commonly used short name:
- `crowdstrike.ts` (not `crowd-strike.ts` or `CrowdStrike.ts`)
- `palo-alto.ts` (not `paloalto.ts`)
- `google-cloud.ts` (not `gcp.ts`)

### File header

```typescript
/**
 * {Vendor Name} MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: {URL or "None found as of YYYY-MM"}
// {Additional MCP notes: transport, auth, tool count, recommendation}
//
// Base URL: {vendor API base URL}
// Auth: {auth mechanism — Bearer token, Basic auth, OAuth2, API key header, HMAC, etc.}
// Docs: {link to vendor API documentation}
// Rate limits: {documented rate limits, if known}
```

### Import

Every adapter imports from the local types file only:

```typescript
import { ToolDefinition, ToolResult } from './types.js';
```

No other imports except Node.js built-ins (`crypto` for HMAC/SigV4 signing). No npm packages. No framework imports. No SDK imports. The adapter is self-contained.

### Config interface

```typescript
interface {Vendor}Config {
  apiToken: string;         // or clientId/clientSecret, apiKey, etc.
  baseUrl?: string;         // optional override, always has a default
}
```

Name the interface `{VendorName}Config`. Include only what's needed for authentication and endpoint configuration. Always provide a sensible default for `baseUrl`.

### Class

```typescript
export class {VendorName}MCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: {Vendor}Config) {
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.vendor.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // ... tool definitions
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    switch (name) {
      case 'tool_name':
        return this.toolName(args);
      // ... one case per tool
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  }

  // Private methods — one per tool
  private async toolName(args: Record<string, unknown>): Promise<ToolResult> {
    // ...
  }
}
```

**Class naming:** `{VendorName}MCPServer` — PascalCase vendor name, always ends with `MCPServer`.

**Constructor:** Store config values. Do not make network calls in the constructor.

**`get tools()`:** Returns a static array of `ToolDefinition` objects. No async. No network calls. This is called at registration time and must be fast.

**`callTool()`:** Switch dispatch on tool name. Each case delegates to a private method. The default case returns an error `ToolResult` — never throws.

---

## Tool Definition Standard

```typescript
{
  name: 'list_incidents',
  description: 'List incidents with optional filters for status, severity, and date range',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by status: open, closed, resolved (default: open)',
      },
      severity: {
        type: 'string',
        description: 'Filter by severity: critical, high, medium, low',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 50, max: 200)',
      },
    },
  },
}
```

### Naming conventions

| Pattern | Use | Example |
|---|---|---|
| `list_{noun}` | Paginated list with optional filters | `list_incidents`, `list_channels` |
| `get_{noun}` | Single item by ID | `get_incident`, `get_user` |
| `search_{noun}` | Full-text or complex query search | `search_hosts`, `search_logs` |
| `create_{noun}` | Create a new resource | `create_ticket`, `create_channel` |
| `update_{noun}` | Modify an existing resource | `update_incident`, `update_user` |
| `delete_{noun}` | Remove a resource | `delete_ticket` |
| `{verb}_{noun}` | Domain-specific action | `quarantine_host`, `rotate_secret`, `acknowledge_alert` |

### Description quality

The description is what the BM25 pre-filter and the SLM use to decide relevance. A bad description means the tool never gets selected.

**Good:** `List incidents with optional filters for status, severity, and date range`
**Bad:** `List incidents`
**Terrible:** `incidents`

Include: what it does, what filters/options are available, what it returns. The description should be 10-30 words. It's a tool selection hint, not API documentation.

### inputSchema quality

Every property must have a `type` and a `description`. The description should include valid values, defaults, and constraints. The SLM uses these to construct the arguments object.

**Good:**
```typescript
status: {
  type: 'string',
  description: 'Filter by status: open, closed, resolved (default: open)',
}
```

**Bad:**
```typescript
status: { type: 'string' }
```

### Required fields

Use `required` sparingly. If a tool works without a parameter (using a sensible default), don't require it. The SLM may omit optional parameters — that should be fine.

```typescript
inputSchema: {
  type: 'object',
  properties: { ... },
  required: ['incident_id'],  // only fields that truly cannot be defaulted
}
```

---

## Tool Implementation Standard

### HTTP calls

Use `fetch()`. No Axios, no Got, no other HTTP library.

```typescript
private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
  const status = (args.status as string) ?? 'open';
  const limit = (args.limit as number) ?? 50;

  const response = await fetch(
    `${this.baseUrl}/v1/incidents?status=${status}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    return {
      content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
      isError: true,
    };
  }

  const data = await response.json();
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: false,
  };
}
```

### Error handling

Never throw from `callTool()` or any tool method. Always return a `ToolResult` with `isError: true`. The orchestrator handles errors through the normal observe loop — it doesn't catch exceptions from tool calls.

```typescript
// CORRECT
return {
  content: [{ type: 'text', text: `API error: ${response.status}` }],
  isError: true,
};

// WRONG — never do this
throw new Error(`API error: ${response.status}`);
```

### Authentication patterns

| Auth type | Implementation |
|---|---|
| Bearer token | `Authorization: Bearer ${this.token}` |
| API key header | `X-Api-Key: ${this.apiKey}` or vendor-specific header name |
| Basic auth | `Authorization: Basic ${btoa(user + ':' + pass)}` |
| OAuth2 client credentials | Implement `getOrRefreshToken()` private method. Cache token. Refresh on 401. |
| HMAC signature | Import `createHmac` from `node:crypto`. Sign per vendor spec. |
| AWS SigV4 | Import from `node:crypto`. Follow AWS SigV4 signing process. |

### OAuth2 pattern

For vendors requiring OAuth2 client credentials flow:

```typescript
private bearerToken: string | null = null;
private tokenExpiry: number = 0;

private async getOrRefreshToken(): Promise<string> {
  const now = Date.now();
  if (this.bearerToken && this.tokenExpiry > now) {
    return this.bearerToken;
  }

  const response = await fetch(`${this.baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`OAuth2 token request failed: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  this.bearerToken = data.access_token;
  this.tokenExpiry = now + (data.expires_in - 60) * 1000;  // refresh 60s early
  return this.bearerToken;
}
```

### Response formatting

Always return JSON-stringified data in the `ToolResult.content` text field. The orchestrator and generator LLM consume this as structured text.

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  isError: false,
};
```

For large responses, truncate to prevent context window bloat:

```typescript
const text = JSON.stringify(data, null, 2);
const truncated = text.length > 10_000
  ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
  : text;

return {
  content: [{ type: 'text', text: truncated }],
  isError: false,
};
```

---

## Adapter Catalog Entry

Every adapter must be discoverable by the three-tier tool resolution system. This requires a catalog entry.

### How catalog entries are generated

The build script `scripts/generate-catalog.ts` reads each compiled adapter from `dist/mcp-servers/`, instantiates the class with stub config, reads the `tools` getter, and generates the catalog entry automatically. No manual `static catalog()` method is required.

For adapters that want to provide explicit metadata (category, keywords, description), implement the optional static method:

```typescript
export class PagerDutyMCPServer {
  /** Optional: explicit catalog metadata. If omitted, inferred from class name + tools. */
  static catalog(): AdapterCatalogEntry {
    return {
      name: 'pagerduty',
      displayName: 'PagerDuty',
      version: '1.0.0',
      category: 'incident-management',
      keywords: ['incident', 'alert', 'on-call', 'escalation', 'page', 'acknowledge'],
      toolNames: ['list_incidents', 'get_incident', 'acknowledge_incident', 'resolve_incident', 'list_oncalls'],
      description: 'Incident management: create, triage, acknowledge, and resolve incidents. Query on-call schedules and escalation policies.',
      author: 'protectnil',
    };
  }

  // ... rest of class
}
```

When `static catalog()` is present, the generator uses it directly. When absent, the generator infers:
- `name` from the filename (e.g., `pagerduty.ts` → `pagerduty`)
- `displayName` from the class name (e.g., `PagerDutyMCPServer` → `PagerDuty`)
- `toolNames` from the `tools` getter
- `keywords` from tool names + descriptions (tokenized, stopwords removed)
- `category` defaults to `misc` (maintainers should add `static catalog()` for correct categorization)

### Category taxonomy

Use one of these categories. Do not invent new ones without updating the `AdapterCategory` type in `src/federation/AdapterCatalog.ts`.

| Category | Vendors |
|---|---|
| `cybersecurity` | CrowdStrike, Splunk, Palo Alto, SentinelOne, etc. |
| `cloud` | AWS, Azure, GCP, DigitalOcean, Cloudflare |
| `devops` | Kubernetes, Terraform, ArgoCD, CircleCI, Jenkins |
| `data` | Snowflake, BigQuery, PostgreSQL, MongoDB, Redis |
| `collaboration` | Slack, Microsoft Teams, Zoom, Discord |
| `crm` | Salesforce, HubSpot, Pipedrive, Zoho |
| `commerce` | Stripe, Shopify, PayPal, Square |
| `observability` | Datadog, Grafana, Sentry, New Relic, Prometheus |
| `communication` | Gmail, Twilio, SendGrid, Mailchimp |
| `ai-ml` | OpenAI, Anthropic, Hugging Face, Cohere |
| `identity` | Okta, Auth0, CyberArk, BeyondTrust |
| `compliance` | Drata, Vanta, ServiceNow GRC, OneTrust |
| `finance` | QuickBooks, Xero, Stripe Billing, Zuora |
| `social` | Twitter/X, LinkedIn, Reddit, YouTube |
| `misc` | Everything else — file under misc, propose a new category if 3+ adapters share a theme |

### Keywords

Keywords drive the Tier 1 domain classifier. Include:
- The vendor name and common abbreviations
- The product category
- Key actions the adapter performs
- Industry terms users would search for

**Good keywords:** `['pagerduty', 'incident', 'alert', 'on-call', 'escalation', 'page', 'acknowledge', 'resolve']`
**Bad keywords:** `['api', 'tool', 'integration']` — too generic, matches everything

---

## Testing

### Required tests

Every adapter must have a test that validates:

1. The class instantiates without error
2. `get tools()` returns a non-empty array
3. Every tool has `name`, `description`, and `inputSchema`
4. `callTool()` with an unknown tool name returns `isError: true` (not throw)

### Test location

Tests live in `tests/adapters/{vendor-name}.test.ts`. Use vitest.

### Test pattern

```typescript
import { describe, it, expect } from 'vitest';
import { PagerDutyMCPServer } from '../../src/mcp-servers/pagerduty.js';

describe('PagerDutyMCPServer', () => {
  const adapter = new PagerDutyMCPServer({ apiToken: 'test-token' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
```

### Live sandbox tests (optional)

If the vendor provides a free sandbox or test account, write integration tests in `tests/adapters/{vendor-name}.integration.test.ts`. These are NOT run in CI — they require credentials and network access. They are run manually during adapter validation.

---

## Contribution Workflow

### For protectNIL engineers

1. Check the vendor's MCP status. Document in file header.
2. Research the vendor API: auth, base URL, endpoints, rate limits.
3. Write `docs/adapters/{vendor}/spec.md` — API surface, auth pattern, rate limits.
4. Implement adapter in `src/mcp-servers/{vendor}.ts`.
5. Write test in `tests/adapters/{vendor}.test.ts`.
6. Run: `npx vitest run {vendor}` — all tests pass.
7. Run: `npm run build` — zero new TypeScript errors.
8. Codex review.
9. Commit and push.

### For community contributors

1. Open a GitHub issue proposing the adapter. Tag: `adapter-request`.
2. Get approval from a maintainer (confirms no duplicate, vendor is valid).
3. Fork the repo. Create branch: `adapter/{vendor-name}`.
4. Follow steps 1-7 above.
5. Submit PR. CI runs lint, typecheck, and tests.
6. Codex reviews for: auth correctness, error handling, API path accuracy, tool description quality.
7. Maintainer merges. Catalog auto-regenerated on next build.

### For vendor contributors

Same as community, but:
- Use your official API documentation (not reverse-engineered).
- Attest API path accuracy in the PR description.
- Your adapter is labeled `author: 'vendor'` in the catalog — higher trust tier.

---

## Quality Gate (Codex Review Checklist)

Every adapter PR is reviewed against this checklist:

- [ ] File header documents MCP server availability (URL or "None found")
- [ ] Auth pattern matches vendor documentation (not guessed)
- [ ] Base URL is correct (verified against vendor docs)
- [ ] API paths are correct (verified against vendor docs)
- [ ] OAuth2 token refresh implements 60-second early renewal
- [ ] Every `callTool` case returns `ToolResult` — no throws
- [ ] Unknown tool case returns `isError: true`
- [ ] Response data is JSON-stringified in `content[0].text`
- [ ] Large responses are truncated at 10KB
- [ ] Tool descriptions are 10-30 words with actionable detail
- [ ] `inputSchema` properties have `type` and `description`
- [ ] `required` array only includes fields that cannot be defaulted
- [ ] Test file exists and all 4 required tests pass
- [ ] Tool names follow naming convention (`verb_noun`)
- [ ] No npm dependencies beyond `./types.js` and `node:crypto`
- [ ] No hardcoded credentials, URLs, or test data in source
- [ ] Rate limit documentation in header comment (if known)

---

## Anti-Patterns

| Do NOT | Do instead |
|---|---|
| Throw exceptions from `callTool()` | Return `{ content: [...], isError: true }` |
| Import npm packages | Use `fetch()` and `node:crypto` only |
| Hardcode API keys in source | Accept via constructor config |
| Cap tools at 5-8 artificially | Ship complete coverage; let the pre-filter select |
| Guess API paths from training data | Read the vendor's actual API documentation |
| Skip the MCP documentation header | Always document, even if "None found" |
| Use `axios`, `got`, or `node-fetch` | Use native `fetch()` (Node 20+) |
| Create helper utilities across adapters | Each adapter is self-contained, one file |
| Return raw HTML or XML in tool results | Parse to JSON, stringify |
| Ignore pagination | Support `cursor`/`offset`/`page` parameters |
| Ship without tests | Minimum 4 tests per adapter (see Testing section) |

---

*Epic AI® is a registered trademark of protectNIL Inc. (U.S. Trademark Registration No. 7,748,019).*
