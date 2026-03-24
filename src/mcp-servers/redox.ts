/**
 * Redox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Redox MCP server was found on GitHub or the Redox developer portal.
//
// Base URL: https://api.redoxengine.com
// Auth: OAuth2 client credentials (signed JWT assertion) — POST /auth/token with private key signed JWT
//   Access tokens expire after 5 minutes. No refresh tokens; re-authenticate on expiry.
// Docs: https://docs.redoxengine.com/api-reference/fhir-api-reference/
// Rate limits: Not publicly documented; contact Redox for tenant-level quotas

import { ToolDefinition, ToolResult } from './types.js';

interface RedoxConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class RedoxMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RedoxConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.redoxengine.com';
  }

  static catalog() {
    return {
      name: 'redox',
      displayName: 'Redox',
      version: '1.0.0',
      category: 'misc',
      keywords: ['redox', 'health', 'healthcare', 'FHIR', 'EHR', 'patient', 'clinical', 'HL7', 'interoperability', 'medical records'],
      toolNames: [
        'get_patient', 'search_patients', 'create_patient',
        'list_encounters', 'get_encounter',
        'list_observations', 'get_observation',
        'list_conditions', 'get_condition',
        'list_medications', 'get_medication_request',
        'list_allergies',
        'get_organization', 'list_practitioners',
      ],
      description: 'Redox healthcare data integration: access FHIR R4 patient demographics, encounters, observations, conditions, medications, and allergies via EHR connections.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_patient',
        description: 'Get a specific patient record by FHIR Patient resource ID including demographics and identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            connectionId: { type: 'string', description: 'Redox connection ID for the target EHR system' },
          },
          required: ['patientId', 'connectionId'],
        },
      },
      {
        name: 'search_patients',
        description: 'Search for patients by name, date of birth, or identifier across connected EHR systems',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID for the target EHR system' },
            family: { type: 'string', description: 'Patient last name (partial match supported)' },
            given: { type: 'string', description: 'Patient first name (partial match supported)' },
            birthdate: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            identifier: { type: 'string', description: 'Patient identifier (MRN or other system identifier)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId'],
        },
      },
      {
        name: 'create_patient',
        description: 'Register a new patient in a connected EHR system via the Redox FHIR Patient resource',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID for the target EHR system' },
            family: { type: 'string', description: 'Patient last name' },
            given: { type: 'string', description: 'Patient first name' },
            birthDate: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
            gender: { type: 'string', description: 'Administrative gender: male, female, other, unknown' },
            phone: { type: 'string', description: 'Patient phone number' },
            email: { type: 'string', description: 'Patient email address' },
          },
          required: ['connectionId', 'family', 'given', 'birthDate'],
        },
      },
      {
        name: 'list_encounters',
        description: 'List clinical encounters for a patient including visit type, date, and status',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID for the target EHR system' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            status: { type: 'string', description: 'Filter by status: planned, arrived, triaged, in-progress, finished, cancelled' },
            date: { type: 'string', description: 'Filter by date range (e.g. ge2025-01-01, le2026-01-01)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_encounter',
        description: 'Get full details for a specific clinical encounter by FHIR Encounter resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            encounterId: { type: 'string', description: 'FHIR Encounter resource ID' },
          },
          required: ['connectionId', 'encounterId'],
        },
      },
      {
        name: 'list_observations',
        description: 'List clinical observations (vitals, lab results) for a patient with category and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            category: { type: 'string', description: 'Observation category: vital-signs, laboratory, social-history, imaging' },
            code: { type: 'string', description: 'LOINC code to filter specific observation type (e.g. 8302-2 for height)' },
            date: { type: 'string', description: 'Filter by date range (e.g. ge2025-01-01)' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_observation',
        description: 'Get full details for a specific clinical observation by FHIR Observation resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            observationId: { type: 'string', description: 'FHIR Observation resource ID' },
          },
          required: ['connectionId', 'observationId'],
        },
      },
      {
        name: 'list_conditions',
        description: 'List active diagnoses and conditions for a patient with optional clinical status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            clinicalStatus: { type: 'string', description: 'Filter by status: active, recurrence, relapse, inactive, remission, resolved' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_condition',
        description: 'Get full details for a specific clinical condition/diagnosis by FHIR Condition resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            conditionId: { type: 'string', description: 'FHIR Condition resource ID' },
          },
          required: ['connectionId', 'conditionId'],
        },
      },
      {
        name: 'list_medications',
        description: 'List medication requests and prescriptions for a patient with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            status: { type: 'string', description: 'Filter by status: active, on-hold, cancelled, completed, stopped' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_medication_request',
        description: 'Get full details for a specific medication request/prescription by FHIR MedicationRequest resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            medicationRequestId: { type: 'string', description: 'FHIR MedicationRequest resource ID' },
          },
          required: ['connectionId', 'medicationRequestId'],
        },
      },
      {
        name: 'list_allergies',
        description: 'List allergy and intolerance records for a patient with optional verification status filter',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            patientId: { type: 'string', description: 'FHIR Patient resource ID' },
            clinicalStatus: { type: 'string', description: 'Filter by status: active, inactive, resolved' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId', 'patientId'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a healthcare organization by FHIR Organization resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            organizationId: { type: 'string', description: 'FHIR Organization resource ID' },
          },
          required: ['connectionId', 'organizationId'],
        },
      },
      {
        name: 'list_practitioners',
        description: 'Search for healthcare practitioners by name or NPI identifier',
        inputSchema: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', description: 'Redox connection ID' },
            name: { type: 'string', description: 'Practitioner name (partial match)' },
            identifier: { type: 'string', description: 'NPI or other system identifier' },
            _count: { type: 'number', description: 'Maximum number of results (default: 20)' },
          },
          required: ['connectionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_patient': return this.getPatient(args);
        case 'search_patients': return this.searchPatients(args);
        case 'create_patient': return this.createPatient(args);
        case 'list_encounters': return this.listEncounters(args);
        case 'get_encounter': return this.getEncounter(args);
        case 'list_observations': return this.listObservations(args);
        case 'get_observation': return this.getObservation(args);
        case 'list_conditions': return this.listConditions(args);
        case 'get_condition': return this.getCondition(args);
        case 'list_medications': return this.listMedications(args);
        case 'get_medication_request': return this.getMedicationRequest(args);
        case 'list_allergies': return this.listAllergies(args);
        case 'get_organization': return this.getOrganization(args);
        case 'list_practitioners': return this.listPractitioners(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    // Redox uses client_credentials with client_id/client_secret
    const response = await fetch(`${this.baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Redox tokens expire in 5 minutes (300s); refresh 60s early
    const expiresIn = data.expires_in ?? 300;
    this.tokenExpiry = now + (expiresIn - 60) * 1000;
    return this.bearerToken;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private fhirBase(connectionId: string): string {
    return `${this.baseUrl}/fhir/R4/${connectionId}`;
  }

  private async fhirGet(connectionId: string, resource: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.fhirBase(connectionId)}/${resource}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fhirPost(connectionId: string, resource: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await fetch(`${this.fhirBase(connectionId)}/${resource}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Patient/${args.patientId}`);
  }

  private async searchPatients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.family) params.family = args.family as string;
    if (args.given) params.given = args.given as string;
    if (args.birthdate) params.birthdate = args.birthdate as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Patient', params);
  }

  private async createPatient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.family || !args.given || !args.birthDate) {
      return { content: [{ type: 'text', text: 'connectionId, family, given, and birthDate are required' }], isError: true };
    }
    const resource: Record<string, unknown> = {
      resourceType: 'Patient',
      name: [{ family: args.family, given: [args.given] }],
      birthDate: args.birthDate,
    };
    if (args.gender) resource.gender = args.gender;
    if (args.phone || args.email) {
      resource.telecom = [];
      if (args.phone) (resource.telecom as unknown[]).push({ system: 'phone', value: args.phone });
      if (args.email) (resource.telecom as unknown[]).push({ system: 'email', value: args.email });
    }
    return this.fhirPost(args.connectionId as string, 'Patient', resource);
  }

  private async listEncounters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.status) params.status = args.status as string;
    if (args.date) params.date = args.date as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Encounter', params);
  }

  private async getEncounter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.encounterId) return { content: [{ type: 'text', text: 'connectionId and encounterId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Encounter/${args.encounterId}`);
  }

  private async listObservations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.category) params.category = args.category as string;
    if (args.code) params.code = args.code as string;
    if (args.date) params.date = args.date as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Observation', params);
  }

  private async getObservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.observationId) return { content: [{ type: 'text', text: 'connectionId and observationId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Observation/${args.observationId}`);
  }

  private async listConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.clinicalStatus) params['clinical-status'] = args.clinicalStatus as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Condition', params);
  }

  private async getCondition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.conditionId) return { content: [{ type: 'text', text: 'connectionId and conditionId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Condition/${args.conditionId}`);
  }

  private async listMedications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.status) params.status = args.status as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'MedicationRequest', params);
  }

  private async getMedicationRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.medicationRequestId) return { content: [{ type: 'text', text: 'connectionId and medicationRequestId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `MedicationRequest/${args.medicationRequestId}`);
  }

  private async listAllergies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.patientId) return { content: [{ type: 'text', text: 'connectionId and patientId are required' }], isError: true };
    const params: Record<string, string> = { patient: args.patientId as string };
    if (args.clinicalStatus) params['clinical-status'] = args.clinicalStatus as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'AllergyIntolerance', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId || !args.organizationId) return { content: [{ type: 'text', text: 'connectionId and organizationId are required' }], isError: true };
    return this.fhirGet(args.connectionId as string, `Organization/${args.organizationId}`);
  }

  private async listPractitioners(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connectionId) return { content: [{ type: 'text', text: 'connectionId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.name) params.name = args.name as string;
    if (args.identifier) params.identifier = args.identifier as string;
    if (args._count) params._count = String(args._count);
    return this.fhirGet(args.connectionId as string, 'Practitioner', params);
  }
}
