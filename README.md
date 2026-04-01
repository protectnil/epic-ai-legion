# Epic AI® Legion

*18,679 tools. One self-hosted MCP server. Your context window only loads what the query needs.*

Legion is the integration layer for AI agents. 18,679 tools across Salesforce, GitHub, AWS, Zillow, Epic FHIR, Spotify, Stripe, CrowdStrike, and 1,108 more — either REST APIs, stdio MCPs, or streamable-HTTP MCPs (`npx @epicai/legion list --count`). All three transports, one unified interface. A three-tier routing engine narrows the full catalog to the handful of tools each query actually needs. Keyword matching and BM25 scoring do the heavy lifting at zero inference cost; the SLM only sees a compact shortlist. One install, one config, and your agent reaches every tool without drowning in schemas. Credentials stay on your machine. The routing stays on your machine. No tool executes a write operation without your explicit approval unless you configure it otherwise. You add your API or MCP keys and it works.

Legion is an Intelligent Virtual Assistant (IVA) — the AI classifies intent, selects adapters, calls them, and synthesizes a response through your local SLM or cloud LLM.

```bash
npx @epicai/legion
```

[![npm version](https://img.shields.io/npm/v/@epicai/legion.svg?style=flat)](https://www.npmjs.com/package/@epicai/legion)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

---

## How It Works

Legion operates in two modes depending on how you use AI:

### Cloud LLM Mode (most developers)

Your AI client (Claude Code, Cursor, Copilot, etc.) connects to Legion as a single MCP server. One tool definition (~50 tokens) replaces thousands. Legion's routing engine selects the right adapters, calls them, and returns results to your LLM for synthesis.

```
Developer's machine
┌──────────────────────────────────────────────┐
│  Claude Code / Cursor / Copilot / Desktop    │
│  (already authenticated with your provider)  │
│       │                                      │
│       │ spawns as child process (stdio)      │
│       ▼                                      │
│  Legion MCP Server (npx @epicai/legion --serve)
│       │                                      │
│       ├── REST Adapters (871 .ts files)      │
│       ├── Stdio MCPs (111 npm packages)      │
│       └── HTTP MCPs (135 remote endpoints)   │
│                                              │
│  Credentials: ~/.epic-ai/.env (local only)   │
└──────────────────────────────────────────────┘
```

### Local SLM Mode (air-gapped)

Legion runs the full orchestrator loop locally. A local SLM (llama.cpp, vLLM) handles tool selection. An optional cloud LLM handles synthesis. Or go fully air-gapped — nothing leaves your machine.

```
Developer's machine
┌──────────────────────────────────────────────┐
│  llama.cpp / vLLM                            │
│  (localhost:8080 / :8000)                    │
│       ▲                                      │
│       │ /v1/chat/completions                 │
│       │                                      │
│  Legion Orchestrator                         │
│       │                                      │
│       ├── REST Adapters (871)                │
│       ├── Stdio MCPs (111)                   │
│       └── HTTP MCPs (135)                    │
│                                              │
│  Nothing leaves this machine.                │
└──────────────────────────────────────────────┘
```

---

## Quick Start

```bash
npx @epicai/legion
```

The setup wizard:
1. **Detects your system** — Node.js, platform, local LLMs
2. **Scans for AI clients** — Claude Code, Cursor, Windsurf, VS Code, Codex, Gemini, and 5 more
3. **Auto-configures** — writes Legion to each client's MCP config (with your permission)
4. **Connects to your secrets** — HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, 1Password, Doppler
5. **Selects adapters** — browse by category, pick what you need
6. **Installs and verifies** — npm stdio packages auto-install, credentials stored locally, connections verified

30 seconds from `npx` to working IVA.

---

## Architecture

Three-tier tool resolution prevents context window bloat:

| Tier | Component | What it does | Cost |
|------|-----------|-------------|------|
| 1 | DomainClassifier | Keyword + optional semantic match against adapter catalog | Zero inference |
| 2 | ToolPreFilter | BM25 scoring across live connected tools, top 8 | Zero inference |
| 3 | Orchestrator | SLM selects from the shortlist and makes tool calls | One local inference call |

The full adapter catalog (18,679 tools) never reaches the LLM. Only the shortlisted 8 tools do.

---

## Adapters

871 REST adapters + 246 MCP connections = 1,117 integrations exposing 18,679 tools.

| Category | Examples |
|----------|---------|
| Cybersecurity | CrowdStrike, Splunk, Palo Alto, SentinelOne, Carbon Black |
| DevOps & CI/CD | GitHub, GitLab, Jenkins, ArgoCD, Terraform |
| Cloud | AWS (13 services), Azure, GCP, Cloudflare, DigitalOcean |
| Healthcare | Epic FHIR, athenahealth, Veeva, DrChrono |
| Hospitality | Opera PMS, Mews, Cloudbeds, InfoGenesis, Toast |
| Construction | Procore, Autodesk Construction, PlanGrid, Buildertrend |
| Manufacturing | Epicor, Infor, Odoo, SAP, NetSuite |
| Finance | Stripe, QuickBooks, Xero, Plaid, PayPal |
| Communication | Gmail, Twilio, Slack, Teams, Discord |
| Travel | Sabre, Amadeus, Travelport |
| Observability | Datadog, Grafana, New Relic, Splunk, PagerDuty |
| Commerce | Shopify, Square, BigCommerce, Magento |
| And more | Real estate, education, insurance, IoT, legal, social... |

```bash
npx @epicai/legion list              # browse all adapters
npx @epicai/legion list security     # filter by keyword
npx @epicai/legion add crowdstrike   # add a specific adapter
npx @epicai/legion health            # check adapter status
```

---

## Autonomy

Every tool call goes through a three-tier governance layer:

| Tier | Behavior | Example |
|------|----------|---------|
| `auto` | Executes immediately | Read, query, search, list |
| `escalate` | Executes, flags for review | Write, update, modify |
| `approve` | Blocks until human approves | Delete, revoke, terminate |

Unclassified actions default to `approve`. No tool writes to your systems without your explicit permission unless you configure it otherwise.

---

## Configuration

```typescript
import { EpicAI } from '@epicai/legion';

const agent = await EpicAI.create({
  orchestrator: {
    provider: 'auto',  // probes llama.cpp, vLLM
  },
  federation: {
    servers: [
      { name: 'github', transport: 'stdio', command: 'mcp-server-github' },
      { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.corp/mcp' },
    ],
  },
  autonomy: {
    tiers: {
      auto: ['read', 'query', 'search', 'list'],
      escalate: ['write', 'update'],
      approve: ['delete', 'revoke', 'terminate'],
    },
  },
  persona: {
    name: 'assistant',
    tone: 'professional',
    domain: 'general',
    systemPrompt: 'You are a helpful assistant powered by Epic AI Legion.',
  },
  audit: {
    store: 'memory',
    integrity: 'sha256-chain',
  },
});

await agent.start();
const result = await agent.run('What are my open GitHub PRs?');
console.log(result.response);
await agent.stop();
```

See the [Developer Guide](DEVELOPER_GUIDE.md) for full configuration reference.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx @epicai/legion` | Setup wizard — auto-detect clients, connect adapters |
| `npx @epicai/legion --serve` | Start as MCP server for your AI client |
| `npx @epicai/legion add <name>` | Add an adapter with credential prompting |
| `npx @epicai/legion remove <name>` | Remove an adapter |
| `npx @epicai/legion health` | Check adapter health and connectivity |
| `npx @epicai/legion list [search]` | Browse and search all adapters |
| `npx @epicai/legion list --count` | Verify integration and tool counts |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and code style guidelines.

**Reporting security vulnerabilities:** Do not open public issues. Email [security@epic-ai.io](mailto:security@epic-ai.io).

---

## License

**SDK Framework** (src/, gateway/, harness/) — [Apache License 2.0](LICENSE)

**Adapters and Registry** (src/mcp-servers/, adapter-catalog.json, mcp-registry.json) — [Elastic License 2.0](LICENSE-ADAPTERS)

Copyright 2026 protectNIL Inc.

---

## Trademark Notice

**Epic AI®** is a registered trademark of protectNIL Inc., U.S. Trademark Registration No. 7,748,019. Use of the Epic AI® name and mark is subject to the [trademark policies](TRADEMARK.md) of protectNIL Inc.

The `@epicai/legion` npm package and this repository are official specimens of use of the Epic AI® mark in commerce in connection with downloadable computer software featuring an Intelligent Virtual Assistant (IVA) utilizing artificial intelligence to access and process third-party sources of information across enterprise operations.

All other trademarks, service marks, and product names referenced in this document are the property of their respective owners.

---

*Epic AI® — Intelligent Virtual Assistant (IVA) Platform | 18,679 Tools | Built by [protectNIL Inc.](https://protectnil.com)*
