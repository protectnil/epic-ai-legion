# Epic AI® IVA Core — Integration Test Protocol

**Package:** `@epicai/core`
**Version:** 0.2.x

---

## Purpose

This document defines the complete test protocol for validating the Epic AI® IVA Core SDK. Any developer or contributor can use it to run the full suite on their hardware.

---

## Three Test Lanes

| Lane | Command | Runner | External Dependencies | Purpose |
|------|---------|--------|----------------------|---------|
| 1 | `npm test` | Vitest | None | Unit tests — all layers, mock LLMs |
| 2 | `npm run test:integration` | Vitest (separate config) | Ollama with model pulled | Air-gapped + hybrid LLM integration |
| 3 | `npm run test:harness` | Standalone tsx | None | Transport correctness (stdio, HTTP, API) |

---

## Lane 1: Unit Tests (`npm test`)

All test files in `tests/` excluding `tests/integration/`. Mock LLMs, in-memory adapters, no external services.

- Expected: all tests pass in under 10 seconds on any hardware
- No Ollama, no MongoDB, no Redis, no cloud API keys required

---

## Lane 2: Integration Tests (`npm run test:integration`)

### Prerequisites

- Ollama running (`ollama serve`)
- Model pulled: `ollama pull qwen2.5:7b`
- For hybrid tests: `OPENAI_API_KEY` env var set (tests skip gracefully if absent)

### Test Structure

```
tests/integration/
├── ollama.test.ts                         # 2 basic provider tests
├── air-gapped/
│   └── orchestrator-generator.test.ts     # 20 tests — Ollama both sides
└── hybrid/
    └── cloud-handoff.test.ts              # 3 tests — Ollama + OpenAI
```

### Air-Gapped Tests (20 tests, ~35 LLM calls)

All inference stays local. Zero external API calls.

| Section | Tests | What It Validates |
|---------|-------|-------------------|
| Tool Selection Accuracy | 5 | Correct tool selected from 8 available for threat hunting, identity checks, EDR queries, CVE lookups, network flow analysis |
| Multi-Step Chaining | 3 | Orchestrator iterates: search→identity check, list→isolate endpoint, three-step search→correlate→respond |
| Argument Extraction | 3 | Enum values, compound filters, structured fields extracted from natural language |
| Stop Conditions | 2 | Direct response for general knowledge; stops after complete tool result instead of looping |
| Throughput & Latency | 3 | Single inference latency, concurrent requests (p50/p95), token generation rate (tokens/sec) |
| Long Context | 2 | Correct routing with ~2K token system prompt + 10-message history; synthesis from large tool results without hallucination |
| Adversarial | 2 | Prompt injection resistance; semantic tool selection despite misleading keyword overlap |

### Hybrid Tests (3 tests)

Gated on `OPENAI_API_KEY`. Tests skip gracefully if absent. Cost per run: ~$0.01.

| Test | Ollama Calls | Cloud LLM Calls | What It Validates |
|------|-------------|-----------------|-------------------|
| Tool select → cloud synthesis | 1 | 1 | Orchestrator selects tool, generator produces actionable briefing |
| Data sovereignty verification | 1 | 1 | Generator messages contain zero tool schema keywords; tool definitions stay local |
| Multi-step + cloud synthesis | 2 | 1 | Two-step orchestrator loop, generator synthesizes executive briefing from all results |

---

## Lane 3: Harness Tests (`npm run test:harness`)

Runs `tests/harness-check.ts` via `npx tsx` — not Vitest. Spawns real MCP servers over all three transport profiles (stdio, HTTP, API), executes 15 assertions per profile (45 total), calls `process.exit()` on completion.

- Expected: 45/45 assertions pass, under 30 seconds

---

## Hardware Requirements

| Configuration | RAM | Recommended Model | Expected Performance |
|---------------|-----|-------------------|---------------------|
| Minimum | 16GB | qwen2.5:7b (Q4) | ~40 t/s — tool routing functional |
| Recommended | 24GB | qwen2.5:7b or 14B | ~30-42 t/s — comfortable with IDE + Docker |
| Power | 32GB+ | 70B quantized | ~15 t/s — near cloud-quality responses |

Apple Silicon (M4/M5) and NVIDIA GPUs (RTX 3060+) both supported via Ollama.

---

## Execution Sequence

### Pre-flight

1. Verify Ollama is running: `curl http://localhost:11434/api/version`
2. Verify model is pulled: `ollama list`
3. Verify Node.js >= 20: `node --version`
4. Install dependencies: `npm ci`

### Run

```bash
# Lane 1 — Unit tests (no dependencies)
npm test

# Lane 2 — Integration (requires Ollama)
npm run test:integration

# Lane 3 — Harness (standalone transport check)
npm run test:harness

# Full hybrid (if OpenAI key available)
OPENAI_API_KEY=sk-... npm run test:integration
```

### Capture

Record the following per run:

- Hardware (chip, memory, GPU/CPU)
- Ollama model and version
- Node.js version
- `npm test` result (files, tests, duration)
- `npm run test:integration` result (files, tests, duration, per-test latency)
- `npm run test:harness` result (assertions, duration)
- Any failures with full error output
- Tokens/sec from throughput tests

---

## Failure Triage

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Tool-call tests fail, throughput tests pass | Context window too small for tool schemas | Increase `num_ctx` in orchestrator config or use a model with larger default context |
| Ollama connection refused | Ollama not running | `ollama serve` |
| Model not found | Model not pulled | `ollama pull qwen2.5:7b` |
| Hybrid tests skip | No `OPENAI_API_KEY` | Set env var or accept skip |
| Vitest hangs on collection | Integration tests included in main config | Verify `tests/integration/` excluded from main vitest.config |

---

## Contributing Test Results

If you run this suite on hardware not yet documented, please open a GitHub Discussion with your results. We're building a hardware compatibility matrix from community-contributed benchmarks.

---

*Epic AI® is a registered trademark of protectNIL Inc. (U.S. Reg. No. 7,748,019)*
