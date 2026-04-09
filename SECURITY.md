# Security Policy

Epic AI Legion is a self-hosted open-source MCP server. It is designed to run in your environment, under your controls, with no vendor-managed SaaS control plane required for core operation.

If you discover a security issue, please report it privately rather than opening a public issue. Preferred reporting path:

- GitHub Security Advisory for this repository, if enabled
- Email: `security@epic-ai.io`

Please include:

- A clear description of the issue
- The affected version(s)
- The adapter, transport, or feature involved
- Reproduction steps, if available
- Any logs, screenshots, or proof-of-concept material you are comfortable sharing privately

We aim to acknowledge valid reports within 2 business days and provide a triage update as soon as practical. Critical issues are prioritized immediately.

## Security posture

1. **Not a SaaS product**
   - Legion is self-hosted.
   - It runs in your environment and does not require a vendor control plane for core operation.
   - Any outbound requests depend on the AI provider, adapter, or other services you configure.

2. **Can be air-gapped**
   - Legion can be deployed in isolated or tightly controlled environments.
   - If you use local models and local adapters, the system can remain entirely inside your network boundary.
   - If you connect cloud providers or remote adapters, those connections are explicitly configured by you.

3. **Strong least-privilege and approval boundaries**
   - Credentials remain on your machine or in your configured secrets store.
   - Tool routing stays server-side so the full catalog is not exposed to the client context window.
   - Read operations can be automated, while write operations require explicit approval.
   - Adapter enablement should follow your own approval and access-review process.

4. **Minimizes leakage when a public LLM is used**
   - Tool schemas and routing decisions stay local.
   - Only the context you choose to send to your LLM provider leaves the machine.
   - If you use a public LLM, use the provider’s privacy and training controls that match your policy.
   - Legion is designed to reduce unnecessary exposure, not to override your provider contract.

5. **Strong observability for operators**
   - Legion logs actions with timestamps and identity metadata.
   - Logs are designed to support audit and troubleshooting workflows.
   - Integrate Legion events with your own SIEM, logging, and incident response systems as needed.

6. **Supply-chain and artifact integrity**
   - Install Legion only from trusted package sources.
   - Verify the npm version and package provenance before broad rollout.
   - Treat adapters as integrations that should be reviewed before use, especially when they reach into sensitive systems.

7. **Controlled data handling**
   - Secrets stay under your control.
   - Data returned by adapters is only as sensitive as the systems you connect.
   - Review your adapter allowlist, credential scope, and retention policies before connecting production systems.

8. **Version support and patch policy**
   - Security fixes are released on the current supported line first.
   - Older releases may receive backports when practical.
   - If a fix is urgent or high severity, we prioritize it over routine feature work.

## What to report

Please report any issue that could:

- Expose credentials or tokens
- Bypass read/write approval boundaries
- Leak tool schemas or routing state beyond the intended boundary
- Cause unintended outbound access
- Break auditability or tamper-evidence
- Allow unapproved adapter execution
- Undermine package integrity or provenance

## Responsible disclosure

Please do not publish vulnerability details publicly until we have had a chance to triage and respond. If you need to coordinate a public disclosure, we will work with you on timing and scope.

