/**
 * Qualys VMDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface QualysConfig {
  /**
   * Required. Qualys platform API URL — varies by region and subscription.
   * Examples: https://qualysapi.qualys.com, https://qualysapi.qg2.apps.qualys.com,
   *           https://qualysapi.qg3.apps.qualys.com, https://qualysapi.qg4.apps.qualys.com
   * No default is provided because using the wrong platform URL silently routes
   * requests to the wrong data centre.
   */
  baseUrl: string;
  username: string;
  password: string;
}

export class QualysMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: QualysConfig) {
    if (!config.baseUrl) {
      throw new Error(
        'QualysMCPServer: baseUrl is required. Qualys has multiple regional platforms; ' +
        'specify the correct URL for your subscription (e.g. https://qualysapi.qualys.com).'
      );
    }
    this.baseUrl = config.baseUrl;

    const credentials = btoa(`${config.username}:${config.password}`);
    this.headers = {
      'Authorization': `Basic ${credentials}`,
      // Qualys requires this header on all API requests.
      'X-Requested-With': 'epicai-mcp-adapter',
      'Content-Type': 'application/x-www-form-urlencoded',
      // Qualys API returns XML by default; Accept is set accordingly.
      'Accept': 'application/xml',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vulnerabilities',
        description: 'List host vulnerability detections from Qualys VMDR (host detection list)',
        inputSchema: {
          type: 'object',
          properties: {
            ips: { type: 'string', description: 'Comma-separated list of IPs or CIDR ranges to filter by' },
            severities: { type: 'string', description: 'Comma-separated severity levels to filter by (1-5)' },
            truncation_limit: { type: 'number', description: 'Maximum number of host records to return (default 1000)' },
          },
        },
      },
      {
        name: 'launch_scan',
        description: 'Launch a VM vulnerability scan in Qualys',
        inputSchema: {
          type: 'object',
          properties: {
            scanName: { type: 'string', description: 'Title for the scan (scan_title parameter)' },
            targets: { type: 'array', items: { type: 'string' }, description: 'List of IPs/CIDR ranges to scan' },
            optionId: { type: 'string', description: 'Numeric option profile ID (option_id parameter)' },
            optionTitle: { type: 'string', description: 'Option profile title (option_title); used if optionId is not provided' },
            scannerName: { type: 'string', description: 'Scanner appliance name (iscanner_name)' },
          },
          required: ['scanName', 'targets'],
        },
      },
      {
        name: 'get_scan_results',
        description: 'Fetch the results of a completed VM scan by its scan reference',
        inputSchema: {
          type: 'object',
          properties: {
            scanRef: { type: 'string', description: 'Scan reference in the form scan/NNNNNNNNNN.NNNNN' },
          },
          required: ['scanRef'],
        },
      },
      {
        name: 'list_web_apps',
        description: 'Search and list web applications in the Qualys WAS module',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of web apps to return' },
            nameFilter: { type: 'string', description: 'Filter web apps by name (substring match)' },
          },
        },
      },
      {
        name: 'get_compliance_posture',
        description: 'Download vulnerability data from the Qualys KnowledgeBase',
        inputSchema: {
          type: 'object',
          properties: {
            details: { type: 'string', enum: ['Basic', 'All', 'None'], description: 'Level of detail to include (Basic, All, or None)' },
            lastModifiedAfter: { type: 'string', description: 'Filter to vulnerabilities modified after this date (YYYY-MM-DD)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vulnerabilities':
          return await this.listVulnerabilities(args);
        case 'launch_scan':
          return await this.launchScan(args);
        case 'get_scan_results':
          return await this.getScanResults(args);
        case 'list_web_apps':
          return await this.listWebApps(args);
        case 'get_compliance_posture':
          return await this.getCompliancePosture(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // POST /api/2.0/fo/asset/host/vm/detection/?action=list
  // Returns XML. Basic auth + X-Requested-With required.
  private async listVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'list' });
    if (args.ips) {
      params.append('ips', args.ips as string);
    }
    if (args.severities) {
      params.append('severities', args.severities as string);
    }
    if (args.truncation_limit) {
      params.append('truncation_limit', String(args.truncation_limit));
    }

    const url = `${this.baseUrl}/api/2.0/fo/asset/host/vm/detection/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }

  // POST /api/2.0/fo/scan/?action=launch
  // Form-encoded body. Returns XML with scan reference.
  private async launchScan(args: Record<string, unknown>): Promise<ToolResult> {
    const scanName = args.scanName as string;
    const targets = args.targets as string[];
    const optionId = args.optionId as string | undefined;
    const optionTitle = args.optionTitle as string | undefined;
    const scannerName = args.scannerName as string | undefined;

    if (!scanName || !targets || targets.length === 0) {
      throw new Error('scanName and targets are required');
    }

    const params = new URLSearchParams({
      action: 'launch',
      scan_title: scanName,
      ip: targets.join(','),
    });
    if (optionId) {
      params.append('option_id', optionId);
    } else if (optionTitle) {
      params.append('option_title', optionTitle);
    }
    if (scannerName) {
      params.append('iscanner_name', scannerName);
    }

    const url = `${this.baseUrl}/api/2.0/fo/scan/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }

  // POST /api/2.0/fo/scan/?action=fetch
  // Fetches scan results by scan reference (e.g. scan/1358285558.36992).
  private async getScanResults(args: Record<string, unknown>): Promise<ToolResult> {
    const scanRef = args.scanRef as string;
    if (!scanRef) {
      throw new Error('scanRef is required (e.g. scan/1358285558.36992)');
    }

    const params = new URLSearchParams({
      action: 'fetch',
      scan_ref: scanRef,
    });

    const url = `${this.baseUrl}/api/2.0/fo/scan/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }

  // POST /qps/rest/3.0/search/was/webapp
  // Qualys WAS API — returns XML ServiceResponse. Uses a ServiceRequest XML body.
  private async listWebApps(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const nameFilter = args.nameFilter as string | undefined;

    let filterXml = '';
    if (nameFilter) {
      filterXml = `
    <filters>
      <Criteria field="name" operator="CONTAINS">${nameFilter}</Criteria>
    </filters>`;
    }

    const serviceRequest = `<?xml version="1.0" encoding="UTF-8"?>
<ServiceRequest>
  <preferences>
    <limitResults>${limit}</limitResults>
  </preferences>${filterXml}
</ServiceRequest>`;

    const wasHeaders = {
      ...this.headers,
      'Content-Type': 'application/xml',
    };

    const url = `${this.baseUrl}/qps/rest/3.0/search/was/webapp`;
    const response = await fetch(url, {
      method: 'POST',
      headers: wasHeaders,
      body: serviceRequest,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }

  // POST /api/2.0/fo/knowledge_base/vuln/?action=list
  // Downloads vulnerability data from the Qualys KnowledgeBase. Returns XML.
  private async getCompliancePosture(args: Record<string, unknown>): Promise<ToolResult> {
    const details = (args.details as string) || 'Basic';
    const lastModifiedAfter = args.lastModifiedAfter as string | undefined;

    const params = new URLSearchParams({
      action: 'list',
      details,
    });
    if (lastModifiedAfter) {
      params.append('last_modified_by_service_after', lastModifiedAfter);
    }

    const url = `${this.baseUrl}/api/2.0/fo/knowledge_base/vuln/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return {
      content: [{ type: 'text', text }],
      isError: false,
    };
  }
}
