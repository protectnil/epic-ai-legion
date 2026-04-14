/**
 * patch-severity-maps.mjs
 * Adds severityMap metadata to security/monitoring/alerting adapters
 * in adapter-catalog.json.
 *
 * Usage: node scripts/patch-severity-maps.mjs
 *
 * Severity vocabulary: info | low | medium | high | critical
 * Missing key defaults to 'info' at runtime (Praetor).
 *
 * Source of truth for native strings: vendor API docs.
 * Case-preserving where the API returns mixed-case values (e.g. Defender,
 * Dynatrace); lowercase aliases added for case-insensitive matching.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'adapter-catalog.json');

/** id → severityMap */
const SEVERITY_MAPS = {

  // ── Endpoint Detection & Response ─────────────────────────────────────────

  crowdstrike: {
    // Falcon detection severity scale (FQL: severity field)
    informational: 'info',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    // Numeric aliases (1–5)
    '1': 'info',
    '2': 'low',
    '3': 'medium',
    '4': 'high',
    '5': 'critical',
  },

  'crowdstrike-identity': {
    informational: 'info',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
  },

  'carbon-black': {
    // CBC alert severity (API v6)
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  sentinelone: {
    // SentinelOne threat verdict / alert severity
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    // Threat confidence
    malicious: 'high',
    suspicious: 'medium',
    'n/a': 'info',
  },

  // ── SIEM / Log Management ──────────────────────────────────────────────────

  splunk: {
    // Splunk ES notable event urgency (correlation search output)
    informational: 'info',
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
    // Numeric urgency values (ES risk score bands)
    '1': 'info',
    '2': 'low',
    '3': 'medium',
    '4': 'high',
    '5': 'critical',
  },

  'elastic-security': {
    // Elastic Security alert.severity (numeric: 21/47/73/99 → named)
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    '99': 'critical',
    '73': 'high',
    '47': 'medium',
    '21': 'low',
  },

  qradar: {
    // IBM QRadar offense magnitude → severity
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    high: 'high',
    medium: 'medium',
    low: 'low',
    // Numeric magnitude buckets (7–10 = high, 4–6 = medium, 1–3 = low)
    '10': 'critical',
    '9': 'critical',
    '8': 'high',
    '7': 'high',
    '6': 'medium',
    '5': 'medium',
    '4': 'medium',
    '3': 'low',
    '2': 'low',
    '1': 'info',
  },

  logrhythm: {
    // LogRhythm alarm risk level
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  exabeam: {
    // Exabeam UEBA alert risk level
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    Info: 'info',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  securonix: {
    // Securonix SNYPR violation/threat severity
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  darktrace: {
    // Darktrace model breach score band (0–100)
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  // ── Cloud Security / CNAPP ─────────────────────────────────────────────────

  wiz: {
    // Wiz issue severity
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFORMATIONAL: 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    informational: 'info',
  },

  lacework: {
    // Lacework/FortiCNAPP alert severity
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    Info: 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
    // Numeric severity level (API returns integers)
    '1': 'critical',
    '2': 'high',
    '3': 'medium',
    '4': 'low',
    '5': 'info',
  },

  // ── Endpoint Security (Network / NDR) ─────────────────────────────────────

  fortinet: {
    // FortiGate syslog severity (RFC 5424 aligned)
    emergency: 'critical',
    alert: 'critical',
    critical: 'critical',
    error: 'high',
    warning: 'medium',
    notification: 'low',
    information: 'info',
    debug: 'info',
    // IPS threat level
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  'vectra-ai': {
    // Vectra AI threat/certainty combined severity band
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  'microsoft-defender-endpoint': {
    // Microsoft Defender for Endpoint alert severity
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    Informational: 'info',
    high: 'high',
    medium: 'medium',
    low: 'low',
    informational: 'info',
  },

  // ── Vulnerability Management ───────────────────────────────────────────────

  snyk: {
    // Snyk vulnerability severity
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  tenable: {
    // Tenable.io / Tenable.sc severity
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
    // Numeric CVSSv3 severity bands
    '4': 'critical',
    '3': 'high',
    '2': 'medium',
    '1': 'low',
    '0': 'info',
  },

  qualys: {
    // Qualys VMDR vulnerability severity level (1–5)
    '5': 'critical',
    '4': 'high',
    '3': 'medium',
    '2': 'low',
    '1': 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  rapid7: {
    // Rapid7 InsightVM finding severity
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  veracode: {
    // Veracode finding severity (0–5 numeric scale)
    '5': 'critical',    // Very High
    '4': 'high',        // High
    '3': 'medium',      // Medium
    '2': 'low',         // Low
    '1': 'low',         // Very Low
    '0': 'info',        // Informational
    'Very High': 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    'Very Low': 'low',
    Informational: 'info',
  },

  // ── Observability / APM / Incident ────────────────────────────────────────

  'datadog-observability': {
    // Monitor states
    ok: 'info',
    no_data: 'info',
    warn: 'low',
    warning: 'medium',
    alert: 'high',
    // Incident severity (P1–P5)
    'sev-1': 'critical',
    'sev-2': 'high',
    'sev-3': 'medium',
    'sev-4': 'low',
    'sev-5': 'info',
    SEV1: 'critical',
    SEV2: 'high',
    SEV3: 'medium',
    SEV4: 'low',
    SEV5: 'info',
  },

  'datadog-security': {
    // Datadog Security signal severity
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },

  dynatrace: {
    // Dynatrace problem severity category
    AVAILABILITY: 'critical',
    ERROR: 'high',
    PERFORMANCE: 'medium',
    RESOURCE_CONTENTION: 'low',
    CUSTOM_ALERT: 'info',
  },

  pagerduty: {
    // PagerDuty event severity (AIOps) and incident urgency
    critical: 'critical',
    error: 'high',
    warning: 'medium',
    info: 'info',
    // Incident urgency
    high: 'high',
    low: 'low',
  },

  opsgenie: {
    // Opsgenie alert priority
    P1: 'critical',
    P2: 'high',
    P3: 'medium',
    P4: 'low',
    P5: 'info',
    p1: 'critical',
    p2: 'high',
    p3: 'medium',
    p4: 'low',
    p5: 'info',
  },

  sentry: {
    // Sentry issue level
    fatal: 'critical',
    error: 'high',
    warning: 'medium',
    info: 'low',
    debug: 'info',
  },

  'aws-cloudwatch': {
    // CloudWatch alarm state
    ALARM: 'high',
    OK: 'info',
    INSUFFICIENT_DATA: 'low',
    // Composite alarm severity (when used with anomaly detection)
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  'grafana-api': {
    // Grafana alert state
    alerting: 'high',
    pending: 'medium',
    ok: 'info',
    no_data: 'low',
    error: 'high',
    // Unified alerting severity label (if set)
    critical: 'critical',
    high: 'high',
    warning: 'medium',
    info: 'info',
  },

  // ── Email Security ─────────────────────────────────────────────────────────

  mimecast: {
    // Mimecast threat severity
    Critical: 'critical',
    High: 'high',
    Moderate: 'medium',
    Low: 'low',
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    low: 'low',
  },

  proofpoint: {
    // Proofpoint TAP threat severity
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  // ── ITSM (triage routing) ──────────────────────────────────────────────────

  jira: {
    // Jira issue priority
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    Lowest: 'info',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    lowest: 'info',
  },

  'jira-service-management': {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  },

  'servicenow-itsm': {
    // ServiceNow incident priority
    '1': 'critical',    // Critical
    '2': 'high',        // High
    '3': 'medium',      // Moderate
    '4': 'low',         // Low
    '5': 'info',        // Planning
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    medium: 'medium',
    low: 'low',
    planning: 'info',
  },

  'servicenow-grc': {
    // ServiceNow GRC risk / compliance severity
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    medium: 'medium',
    low: 'low',
    info: 'info',
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

let patched = 0;
for (const entry of catalog) {
  const map = SEVERITY_MAPS[entry.id];
  if (map) {
    entry.severityMap = map;
    patched++;
  }
}

writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Patched ${patched} adapters with severityMap in ${CATALOG_PATH}`);
