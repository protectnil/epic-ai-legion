/**
 * IX-API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official IX-API MCP server was found on GitHub.
// We build a full REST wrapper for complete IX-API coverage.
//
// Base URL: Configurable — IX-API is deployed per-IXP (Internet Exchange Point)
//           Example: https://ix-api.example.com/api/v2
// Auth: HTTP Bearer token (JWT issued by POST /auth/token)
// Docs: https://ix-api.net/
// Spec: https://api.apis.guru/v2/specs/ix-api.net/2.1.0/openapi.json
// Category: telecom
// Rate limits: Per-IXP policy

import { ToolDefinition, ToolResult } from './types.js';

interface IxApiConfig {
  accessToken: string;
  baseUrl: string;
}

export class IxApiMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: IxApiConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'ix-api',
      displayName: 'IX-API',
      version: '1.0.0',
      category: 'telecom',
      keywords: [
        'ix-api', 'internet exchange', 'ixp', 'peering', 'interconnect',
        'network service', 'network service config', 'connection', 'port',
        'vlan', 'ip', 'mac', 'bgp', 'route server', 'metro area network',
        'pop', 'facility', 'device', 'account', 'contact', 'role',
        'product offering', 'bandwidth', 'colocation', 'carrier',
      ],
      toolNames: [
        'get_health',
        'get_implementation',
        'create_auth_token',
        'refresh_auth_token',
        'list_accounts',
        'create_account',
        'get_account',
        'update_account',
        'patch_account',
        'delete_account',
        'list_contacts',
        'create_contact',
        'get_contact',
        'update_contact',
        'patch_contact',
        'delete_contact',
        'list_roles',
        'get_role',
        'list_role_assignments',
        'create_role_assignment',
        'get_role_assignment',
        'delete_role_assignment',
        'list_facilities',
        'get_facility',
        'list_pops',
        'get_pop',
        'list_metro_areas',
        'get_metro_area',
        'list_metro_area_networks',
        'get_metro_area_network',
        'list_devices',
        'get_device',
        'list_ports',
        'get_port',
        'list_connections',
        'get_connection',
        'list_product_offerings',
        'get_product_offering',
        'list_network_services',
        'create_network_service',
        'get_network_service',
        'update_network_service',
        'patch_network_service',
        'delete_network_service',
        'get_network_service_cancellation_policy',
        'get_network_service_change_request',
        'create_network_service_change_request',
        'delete_network_service_change_request',
        'list_network_service_configs',
        'create_network_service_config',
        'get_network_service_config',
        'update_network_service_config',
        'patch_network_service_config',
        'delete_network_service_config',
        'get_network_service_config_cancellation_policy',
        'list_network_features',
        'get_network_feature',
        'list_network_feature_configs',
        'create_network_feature_config',
        'get_network_feature_config',
        'update_network_feature_config',
        'patch_network_feature_config',
        'delete_network_feature_config',
        'list_ips',
        'create_ip',
        'get_ip',
        'update_ip',
        'patch_ip',
        'list_macs',
        'create_mac',
        'get_mac',
        'delete_mac',
        'list_member_joining_rules',
        'create_member_joining_rule',
        'get_member_joining_rule',
        'update_member_joining_rule',
        'patch_member_joining_rule',
        'delete_member_joining_rule',
      ],
      description: 'IX-API: configure and manage Internet Exchange services including network services, connections, ports, IP addresses, MAC addresses, accounts, contacts, and product offerings via a standardized IXP API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Health & Meta -----------------------------------------------------
      {
        name: 'get_health',
        description: 'Check the health status of the IX-API implementation',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_implementation',
        description: 'Get details about the IX-API implementation (version, supported features, contact info)',
        inputSchema: { type: 'object', properties: {} },
      },
      // -- Auth --------------------------------------------------------------
      {
        name: 'create_auth_token',
        description: 'Authenticate and obtain a Bearer JWT token for IX-API access',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'IX-API username or API key ID',
            },
            password: {
              type: 'string',
              description: 'IX-API password or API key secret',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'refresh_auth_token',
        description: 'Refresh an existing Bearer JWT token using a refresh token',
        inputSchema: {
          type: 'object',
          properties: {
            refresh: {
              type: 'string',
              description: 'Refresh token obtained from create_auth_token',
            },
          },
          required: ['refresh'],
        },
      },
      // -- Accounts ----------------------------------------------------------
      {
        name: 'list_accounts',
        description: 'List IX-API accounts, optionally filtered by state, managing account, billable status, or external reference',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by account ID' },
            state: { type: 'string', description: 'Filter by account state' },
            state__is_not: { type: 'string', description: 'Exclude accounts in this state' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            billable: { type: 'boolean', description: 'Filter by billable status' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            name: { type: 'string', description: 'Filter by account name' },
          },
        },
      },
      {
        name: 'create_account',
        description: 'Create a new IX-API account',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Account name' },
            managing_account: { type: 'string', description: 'ID of the managing account' },
            external_ref: { type: 'string', description: 'External reference for the account' },
            address: { type: 'object', description: 'Account address object' },
            metro_area_network: { type: 'string', description: 'Metro area network ID for this account' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_account',
        description: 'Get a single IX-API account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Account ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_account',
        description: 'Replace (full update) an IX-API account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Account ID to update' },
            name: { type: 'string', description: 'Updated account name' },
            managing_account: { type: 'string', description: 'Updated managing account ID' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_account',
        description: 'Partially update an IX-API account by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Account ID to patch' },
            name: { type: 'string', description: 'Updated account name' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_account',
        description: 'Delete an IX-API account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Account ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Contacts ----------------------------------------------------------
      {
        name: 'list_contacts',
        description: 'List contacts, optionally filtered by managing account, consuming account, or external reference',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by contact ID' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
          },
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact for an IX-API account',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact full name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            external_ref: { type: 'string', description: 'External reference' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_contact',
        description: 'Get a single contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_contact',
        description: 'Replace (full update) a contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID to update' },
            name: { type: 'string', description: 'Updated contact name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_contact',
        description: 'Partially update a contact by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID to patch' },
            name: { type: 'string', description: 'Updated contact name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Contact ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Roles & Assignments -----------------------------------------------
      {
        name: 'list_roles',
        description: 'List available IX-API roles, optionally filtered by name or contact',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by role ID' },
            name: { type: 'string', description: 'Filter by role name' },
            contact: { type: 'string', description: 'Filter by contact ID' },
          },
        },
      },
      {
        name: 'get_role',
        description: 'Get a single role by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Role ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_role_assignments',
        description: 'List role assignments, optionally filtered by contact or role',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by assignment ID' },
            contact: { type: 'string', description: 'Filter by contact ID' },
            role: { type: 'string', description: 'Filter by role ID' },
          },
        },
      },
      {
        name: 'create_role_assignment',
        description: 'Assign a role to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contact: { type: 'string', description: 'Contact ID to assign the role to' },
            role: { type: 'string', description: 'Role ID to assign' },
          },
          required: ['contact', 'role'],
        },
      },
      {
        name: 'get_role_assignment',
        description: 'Get a single role assignment by assignment ID',
        inputSchema: {
          type: 'object',
          properties: {
            assignment_id: { type: 'string', description: 'Role assignment ID to retrieve' },
          },
          required: ['assignment_id'],
        },
      },
      {
        name: 'delete_role_assignment',
        description: 'Delete a role assignment by assignment ID',
        inputSchema: {
          type: 'object',
          properties: {
            assignment_id: { type: 'string', description: 'Role assignment ID to delete' },
          },
          required: ['assignment_id'],
        },
      },
      // -- Infrastructure (read-only) ----------------------------------------
      {
        name: 'list_facilities',
        description: 'List colocation facilities, filterable by capability, metro area, country, and postal code',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by facility ID' },
            capability_media_type: { type: 'string', description: 'Filter by supported media type' },
            capability_speed: { type: 'integer', description: 'Filter by port speed (Mbps)' },
            metro_area: { type: 'string', description: 'Filter by metro area ID' },
            metro_area_network: { type: 'string', description: 'Filter by metro area network ID' },
            address_country: { type: 'string', description: 'Filter by country code' },
            address_locality: { type: 'string', description: 'Filter by city/locality' },
            organisation_name: { type: 'string', description: 'Filter by facility organisation name' },
          },
        },
      },
      {
        name: 'get_facility',
        description: 'Get a single colocation facility by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Facility ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_pops',
        description: 'List Points of Presence (PoPs), filterable by facility, metro area network, and capability',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by PoP ID' },
            facility: { type: 'string', description: 'Filter by facility ID' },
            metro_area_network: { type: 'string', description: 'Filter by metro area network ID' },
            capability_media_type: { type: 'string', description: 'Filter by supported media type' },
            capability_speed: { type: 'integer', description: 'Filter by port speed (Mbps)' },
          },
        },
      },
      {
        name: 'get_pop',
        description: 'Get a single Point of Presence (PoP) by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'PoP ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_metro_areas',
        description: 'List metro areas available in the IX network',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by metro area ID' },
          },
        },
      },
      {
        name: 'get_metro_area',
        description: 'Get a single metro area by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Metro area ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_metro_area_networks',
        description: 'List metro area networks (IXP switching fabrics), filterable by name, metro area, or service provider',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by metro area network ID' },
            name: { type: 'string', description: 'Filter by network name' },
            metro_area: { type: 'string', description: 'Filter by metro area ID' },
            service_provider: { type: 'string', description: 'Filter by service provider' },
          },
        },
      },
      {
        name: 'get_metro_area_network',
        description: 'Get a single metro area network by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Metro area network ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_devices',
        description: 'List network devices at the exchange, filterable by name, media type, speed, facility, and PoP',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by device ID' },
            name: { type: 'string', description: 'Filter by device name' },
            capability_media_type: { type: 'string', description: 'Filter by supported media type' },
            capability_speed: { type: 'integer', description: 'Filter by port speed (Mbps)' },
            facility: { type: 'string', description: 'Filter by facility ID' },
            pop: { type: 'string', description: 'Filter by PoP ID' },
            metro_area_network: { type: 'string', description: 'Filter by metro area network ID' },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get a single network device by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Device ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_ports',
        description: 'List physical ports, filterable by state, media type, PoP, device, speed, and connection',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by port ID' },
            state: { type: 'string', description: 'Filter by port state' },
            state__is_not: { type: 'string', description: 'Exclude ports in this state' },
            media_type: { type: 'string', description: 'Filter by media type' },
            pop: { type: 'string', description: 'Filter by PoP ID' },
            name: { type: 'string', description: 'Filter by port name' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            device: { type: 'string', description: 'Filter by device ID' },
            speed: { type: 'integer', description: 'Filter by port speed (Mbps)' },
            connection: { type: 'string', description: 'Filter by connection ID' },
          },
        },
      },
      {
        name: 'get_port',
        description: 'Get a single physical port by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Port ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // -- Connections -------------------------------------------------------
      {
        name: 'list_connections',
        description: 'List connections, filterable by state, mode, metro area network, PoP, and facility',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by connection ID' },
            state: { type: 'string', description: 'Filter by connection state' },
            state__is_not: { type: 'string', description: 'Exclude connections in this state' },
            mode: { type: 'string', description: 'Filter by connection mode' },
            name: { type: 'string', description: 'Filter by connection name' },
            metro_area_network: { type: 'string', description: 'Filter by metro area network ID' },
            pop: { type: 'string', description: 'Filter by PoP ID' },
            facility: { type: 'string', description: 'Filter by facility ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
          },
        },
      },
      {
        name: 'get_connection',
        description: 'Get a single connection by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Connection ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // -- Product Offerings -------------------------------------------------
      {
        name: 'list_product_offerings',
        description: 'List available product offerings at the exchange, filterable by type, bandwidth, metro area, cloud key, and delivery method',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by product offering ID' },
            type: { type: 'string', description: 'Filter by offering type' },
            name: { type: 'string', description: 'Filter by offering name' },
            handover_metro_area: { type: 'string', description: 'Filter by handover metro area ID' },
            handover_metro_area_network: { type: 'string', description: 'Filter by handover metro area network ID' },
            service_metro_area: { type: 'string', description: 'Filter by service metro area ID' },
            service_provider: { type: 'string', description: 'Filter by service provider' },
            bandwidth: { type: 'integer', description: 'Filter by bandwidth (Mbps)' },
            physical_port_speed: { type: 'integer', description: 'Filter by physical port speed (Mbps)' },
            delivery_method: { type: 'string', description: 'Filter by delivery method' },
            cloud_key: { type: 'string', description: 'Filter by cloud key (for cloud provider connections)' },
            downgrade_allowed: { type: 'boolean', description: 'Filter by downgrade-allowed flag' },
            upgrade_allowed: { type: 'boolean', description: 'Filter by upgrade-allowed flag' },
          },
        },
      },
      {
        name: 'get_product_offering',
        description: 'Get a single product offering by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product offering ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // -- Network Services --------------------------------------------------
      {
        name: 'list_network_services',
        description: 'List network services (e.g. exchange LAN, p2p, cloud access), filterable by state, type, account, PoP, and product offering',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by network service ID' },
            state: { type: 'string', description: 'Filter by service state' },
            state__is_not: { type: 'string', description: 'Exclude services in this state' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            type: { type: 'string', description: 'Filter by service type' },
            pop: { type: 'string', description: 'Filter by PoP ID' },
            product_offering: { type: 'string', description: 'Filter by product offering ID' },
          },
        },
      },
      {
        name: 'create_network_service',
        description: 'Create a new network service (exchange LAN, p2p, cloud access, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Service type (e.g. ExchangeLanNetworkService, P2PNetworkService, CloudNetworkService)' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            product_offering: { type: 'string', description: 'Product offering ID' },
            external_ref: { type: 'string', description: 'External reference' },
            noc_contact: { type: 'string', description: 'NOC contact ID' },
          },
          required: ['type', 'managing_account'],
        },
      },
      {
        name: 'get_network_service',
        description: 'Get a single network service by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_network_service',
        description: 'Replace (full update) a network service by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID to update' },
            external_ref: { type: 'string', description: 'Updated external reference' },
            noc_contact: { type: 'string', description: 'Updated NOC contact ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_network_service',
        description: 'Partially update a network service by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID to patch' },
            external_ref: { type: 'string', description: 'Updated external reference' },
            noc_contact: { type: 'string', description: 'Updated NOC contact ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network_service',
        description: 'Delete (decommission) a network service by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID to delete' },
            decommission_at: { type: 'string', description: 'ISO 8601 datetime to schedule decommission (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_network_service_cancellation_policy',
        description: 'Get the cancellation policy for a network service, optionally with a prospective decommission date',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID' },
            decommission_at: { type: 'string', description: 'ISO 8601 datetime to evaluate cancellation policy against' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_network_service_change_request',
        description: 'Get the pending change request for a network service by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_network_service_change_request',
        description: 'Submit a change request for a network service (e.g. bandwidth upgrade/downgrade)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID to change' },
            type: { type: 'string', description: 'Change request type' },
            product_offering: { type: 'string', description: 'New product offering ID for bandwidth change' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network_service_change_request',
        description: 'Cancel a pending change request for a network service',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service ID whose change request to cancel' },
          },
          required: ['id'],
        },
      },
      // -- Network Service Configs -------------------------------------------
      {
        name: 'list_network_service_configs',
        description: 'List network service configurations, filterable by state, type, account, VLAN, connection, and product offering',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by config ID' },
            state: { type: 'string', description: 'Filter by config state' },
            state__is_not: { type: 'string', description: 'Exclude configs in this state' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            type: { type: 'string', description: 'Filter by config type' },
            inner_vlan: { type: 'integer', description: 'Filter by inner VLAN ID' },
            outer_vlan: { type: 'integer', description: 'Filter by outer VLAN ID' },
            network_service: { type: 'string', description: 'Filter by network service ID' },
            connection: { type: 'string', description: 'Filter by connection ID' },
            product_offering: { type: 'string', description: 'Filter by product offering ID' },
          },
        },
      },
      {
        name: 'create_network_service_config',
        description: 'Create a network service configuration (attach a connection to a network service with VLAN settings)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Config type (e.g. ExchangeLanNetworkServiceConfig, P2PNetworkServiceConfig)' },
            network_service: { type: 'string', description: 'Network service ID to configure' },
            connection: { type: 'string', description: 'Connection ID to attach' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            outer_vlan: { type: 'integer', description: 'Outer VLAN ID (802.1Q)' },
            inner_vlan: { type: 'integer', description: 'Inner VLAN ID (QinQ)' },
            external_ref: { type: 'string', description: 'External reference' },
          },
          required: ['type', 'network_service', 'connection'],
        },
      },
      {
        name: 'get_network_service_config',
        description: 'Get a single network service configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_network_service_config',
        description: 'Replace (full update) a network service configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to update' },
            outer_vlan: { type: 'integer', description: 'Updated outer VLAN ID' },
            inner_vlan: { type: 'integer', description: 'Updated inner VLAN ID' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_network_service_config',
        description: 'Partially update a network service configuration by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to patch' },
            outer_vlan: { type: 'integer', description: 'Updated outer VLAN ID' },
            inner_vlan: { type: 'integer', description: 'Updated inner VLAN ID' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network_service_config',
        description: 'Delete (decommission) a network service configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID to delete' },
            decommission_at: { type: 'string', description: 'ISO 8601 datetime to schedule decommission (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_network_service_config_cancellation_policy',
        description: 'Get the cancellation policy for a network service configuration',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network service config ID' },
            decommission_at: { type: 'string', description: 'ISO 8601 datetime to evaluate cancellation policy against' },
          },
          required: ['id'],
        },
      },
      // -- Network Features --------------------------------------------------
      {
        name: 'list_network_features',
        description: 'List optional network features (e.g. route server, monitoring) available on network services',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by feature ID' },
            type: { type: 'string', description: 'Filter by feature type' },
            required: { type: 'boolean', description: 'Filter by required flag' },
            network_service: { type: 'string', description: 'Filter by network service ID' },
            name: { type: 'string', description: 'Filter by feature name' },
          },
        },
      },
      {
        name: 'get_network_feature',
        description: 'Get a single network feature by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network feature ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // -- Network Feature Configs -------------------------------------------
      {
        name: 'list_network_feature_configs',
        description: 'List network feature configurations, filterable by state, type, account, service config, and feature',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by config ID' },
            state: { type: 'string', description: 'Filter by config state' },
            state__is_not: { type: 'string', description: 'Exclude configs in this state' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            type: { type: 'string', description: 'Filter by config type' },
            service_config: { type: 'string', description: 'Filter by service config ID' },
            network_feature: { type: 'string', description: 'Filter by network feature ID' },
          },
        },
      },
      {
        name: 'create_network_feature_config',
        description: 'Create a network feature configuration (enable a feature on a service config)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Feature config type' },
            network_feature: { type: 'string', description: 'Network feature ID to enable' },
            service_config: { type: 'string', description: 'Network service config ID to attach the feature to' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            external_ref: { type: 'string', description: 'External reference' },
          },
          required: ['type', 'network_feature', 'service_config'],
        },
      },
      {
        name: 'get_network_feature_config',
        description: 'Get a single network feature configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network feature config ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_network_feature_config',
        description: 'Replace (full update) a network feature configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network feature config ID to update' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_network_feature_config',
        description: 'Partially update a network feature configuration by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network feature config ID to patch' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network_feature_config',
        description: 'Delete a network feature configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network feature config ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- IPs ---------------------------------------------------------------
      {
        name: 'list_ips',
        description: 'List IP addresses, filterable by account, network service, FQDN, version, and validity window',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by IP ID' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            network_service: { type: 'string', description: 'Filter by network service ID' },
            network_service_config: { type: 'string', description: 'Filter by network service config ID' },
            version: { type: 'integer', description: 'Filter by IP version (4 or 6)' },
            fqdn: { type: 'string', description: 'Filter by fully qualified domain name' },
          },
        },
      },
      {
        name: 'create_ip',
        description: 'Allocate or register an IP address for a network service or feature',
        inputSchema: {
          type: 'object',
          properties: {
            network_service_config: { type: 'string', description: 'Network service config ID to assign the IP to' },
            network_feature_config: { type: 'string', description: 'Network feature config ID to assign the IP to' },
            version: { type: 'integer', description: 'IP version (4 or 6)' },
            address: { type: 'string', description: 'IP address in CIDR notation (e.g. 192.0.2.1/24)' },
            fqdn: { type: 'string', description: 'Fully qualified domain name for this IP' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            external_ref: { type: 'string', description: 'External reference' },
          },
        },
      },
      {
        name: 'get_ip',
        description: 'Get a single IP address record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'IP record ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_ip',
        description: 'Replace (full update) an IP address record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'IP record ID to update' },
            fqdn: { type: 'string', description: 'Updated FQDN' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_ip',
        description: 'Partially update an IP address record by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'IP record ID to patch' },
            fqdn: { type: 'string', description: 'Updated FQDN' },
            external_ref: { type: 'string', description: 'Updated external reference' },
          },
          required: ['id'],
        },
      },
      // -- MACs --------------------------------------------------------------
      {
        name: 'list_macs',
        description: 'List MAC addresses registered at the exchange, filterable by account, service config, and address',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by MAC record ID' },
            managing_account: { type: 'string', description: 'Filter by managing account ID' },
            consuming_account: { type: 'string', description: 'Filter by consuming account ID' },
            external_ref: { type: 'string', description: 'Filter by external reference' },
            network_service_config: { type: 'string', description: 'Filter by network service config ID' },
            address: { type: 'string', description: 'Filter by MAC address' },
          },
        },
      },
      {
        name: 'create_mac',
        description: 'Register a MAC address for a network service configuration',
        inputSchema: {
          type: 'object',
          properties: {
            network_service_config: { type: 'string', description: 'Network service config ID to register the MAC address for' },
            address: { type: 'string', description: 'MAC address in colon-separated hex notation (e.g. aa:bb:cc:dd:ee:ff)' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account ID' },
            external_ref: { type: 'string', description: 'External reference' },
          },
          required: ['network_service_config', 'address'],
        },
      },
      {
        name: 'get_mac',
        description: 'Get a single MAC address record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'MAC record ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_mac',
        description: 'Delete (deregister) a MAC address by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'MAC record ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Member Joining Rules ----------------------------------------------
      {
        name: 'list_member_joining_rules',
        description: 'List member joining rules that control which accounts can join a network service',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter by rule ID' },
            network_service: { type: 'string', description: 'Filter by network service ID' },
          },
        },
      },
      {
        name: 'create_member_joining_rule',
        description: 'Create a member joining rule for a network service',
        inputSchema: {
          type: 'object',
          properties: {
            network_service: { type: 'string', description: 'Network service ID to create the rule for' },
            type: { type: 'string', description: 'Rule type (e.g. AllowMemberJoiningRule, DenyMemberJoiningRule)' },
            managing_account: { type: 'string', description: 'Managing account ID' },
            consuming_account: { type: 'string', description: 'Consuming account to allow or deny' },
          },
          required: ['network_service', 'type'],
        },
      },
      {
        name: 'get_member_joining_rule',
        description: 'Get a single member joining rule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Member joining rule ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_member_joining_rule',
        description: 'Replace (full update) a member joining rule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Member joining rule ID to update' },
            consuming_account: { type: 'string', description: 'Updated consuming account' },
          },
          required: ['id'],
        },
      },
      {
        name: 'patch_member_joining_rule',
        description: 'Partially update a member joining rule by ID (merge-patch semantics)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Member joining rule ID to patch' },
            consuming_account: { type: 'string', description: 'Updated consuming account' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_member_joining_rule',
        description: 'Delete a member joining rule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Member joining rule ID to delete' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_health':                                  return this.getHealth();
        case 'get_implementation':                          return this.getImplementation();
        case 'create_auth_token':                           return this.createAuthToken(args);
        case 'refresh_auth_token':                          return this.refreshAuthToken(args);
        case 'list_accounts':                               return this.listAccounts(args);
        case 'create_account':                              return this.createAccount(args);
        case 'get_account':                                 return this.getAccount(args);
        case 'update_account':                              return this.updateAccount(args);
        case 'patch_account':                               return this.patchAccount(args);
        case 'delete_account':                              return this.deleteAccount(args);
        case 'list_contacts':                               return this.listContacts(args);
        case 'create_contact':                              return this.createContact(args);
        case 'get_contact':                                 return this.getContact(args);
        case 'update_contact':                              return this.updateContact(args);
        case 'patch_contact':                               return this.patchContact(args);
        case 'delete_contact':                              return this.deleteContact(args);
        case 'list_roles':                                  return this.listRoles(args);
        case 'get_role':                                    return this.getRole(args);
        case 'list_role_assignments':                       return this.listRoleAssignments(args);
        case 'create_role_assignment':                      return this.createRoleAssignment(args);
        case 'get_role_assignment':                         return this.getRoleAssignment(args);
        case 'delete_role_assignment':                      return this.deleteRoleAssignment(args);
        case 'list_facilities':                             return this.listFacilities(args);
        case 'get_facility':                                return this.getFacility(args);
        case 'list_pops':                                   return this.listPops(args);
        case 'get_pop':                                     return this.getPop(args);
        case 'list_metro_areas':                            return this.listMetroAreas(args);
        case 'get_metro_area':                              return this.getMetroArea(args);
        case 'list_metro_area_networks':                    return this.listMetroAreaNetworks(args);
        case 'get_metro_area_network':                      return this.getMetroAreaNetwork(args);
        case 'list_devices':                                return this.listDevices(args);
        case 'get_device':                                  return this.getDevice(args);
        case 'list_ports':                                  return this.listPorts(args);
        case 'get_port':                                    return this.getPort(args);
        case 'list_connections':                            return this.listConnections(args);
        case 'get_connection':                              return this.getConnection(args);
        case 'list_product_offerings':                      return this.listProductOfferings(args);
        case 'get_product_offering':                        return this.getProductOffering(args);
        case 'list_network_services':                       return this.listNetworkServices(args);
        case 'create_network_service':                      return this.createNetworkService(args);
        case 'get_network_service':                         return this.getNetworkService(args);
        case 'update_network_service':                      return this.updateNetworkService(args);
        case 'patch_network_service':                       return this.patchNetworkService(args);
        case 'delete_network_service':                      return this.deleteNetworkService(args);
        case 'get_network_service_cancellation_policy':     return this.getNetworkServiceCancellationPolicy(args);
        case 'get_network_service_change_request':          return this.getNetworkServiceChangeRequest(args);
        case 'create_network_service_change_request':       return this.createNetworkServiceChangeRequest(args);
        case 'delete_network_service_change_request':       return this.deleteNetworkServiceChangeRequest(args);
        case 'list_network_service_configs':                return this.listNetworkServiceConfigs(args);
        case 'create_network_service_config':               return this.createNetworkServiceConfig(args);
        case 'get_network_service_config':                  return this.getNetworkServiceConfig(args);
        case 'update_network_service_config':               return this.updateNetworkServiceConfig(args);
        case 'patch_network_service_config':                return this.patchNetworkServiceConfig(args);
        case 'delete_network_service_config':               return this.deleteNetworkServiceConfig(args);
        case 'get_network_service_config_cancellation_policy': return this.getNetworkServiceConfigCancellationPolicy(args);
        case 'list_network_features':                       return this.listNetworkFeatures(args);
        case 'get_network_feature':                         return this.getNetworkFeature(args);
        case 'list_network_feature_configs':                return this.listNetworkFeatureConfigs(args);
        case 'create_network_feature_config':               return this.createNetworkFeatureConfig(args);
        case 'get_network_feature_config':                  return this.getNetworkFeatureConfig(args);
        case 'update_network_feature_config':               return this.updateNetworkFeatureConfig(args);
        case 'patch_network_feature_config':                return this.patchNetworkFeatureConfig(args);
        case 'delete_network_feature_config':               return this.deleteNetworkFeatureConfig(args);
        case 'list_ips':                                    return this.listIps(args);
        case 'create_ip':                                   return this.createIp(args);
        case 'get_ip':                                      return this.getIp(args);
        case 'update_ip':                                   return this.updateIp(args);
        case 'patch_ip':                                    return this.patchIp(args);
        case 'list_macs':                                   return this.listMacs(args);
        case 'create_mac':                                  return this.createMac(args);
        case 'get_mac':                                     return this.getMac(args);
        case 'delete_mac':                                  return this.deleteMac(args);
        case 'list_member_joining_rules':                   return this.listMemberJoiningRules(args);
        case 'create_member_joining_rule':                  return this.createMemberJoiningRule(args);
        case 'get_member_joining_rule':                     return this.getMemberJoiningRule(args);
        case 'update_member_joining_rule':                  return this.updateMemberJoiningRule(args);
        case 'patch_member_joining_rule':                   return this.patchMemberJoiningRule(args);
        case 'delete_member_joining_rule':                  return this.deleteMemberJoiningRule(args);
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

  // -- Private helpers -------------------------------------------------------

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private buildQuery(args: Record<string, unknown>, keys: string[]): Record<string, string> {
    const q: Record<string, string> = {};
    for (const k of keys) {
      if (args[k] !== undefined && args[k] !== null) q[k] = String(args[k]);
    }
    return q;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>,
    contentType?: string,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      url = `${url}?${new URLSearchParams(queryParams).toString()}`;
    }
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };
    if (body && Object.keys(body).length > 0) {
      headers['Content-Type'] = contentType || 'application/json';
    }
    const init: RequestInit = { method, headers };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await fetch(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // -- Health & Meta ---------------------------------------------------------

  private async getHealth(): Promise<ToolResult> {
    return this.request('GET', '/health');
  }

  private async getImplementation(): Promise<ToolResult> {
    return this.request('GET', '/implementation');
  }

  // -- Auth ------------------------------------------------------------------

  private async createAuthToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    return this.request('POST', '/auth/token', { username: args.username, password: args.password } as Record<string, unknown>);
  }

  private async refreshAuthToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.refresh) {
      return { content: [{ type: 'text', text: 'refresh is required' }], isError: true };
    }
    return this.request('POST', '/auth/refresh', { refresh: args.refresh } as Record<string, unknown>);
  }

  // -- Accounts --------------------------------------------------------------

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'managing_account', 'billable', 'external_ref', 'name']);
    return this.request('GET', '/accounts', undefined, q);
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/accounts', args as Record<string, unknown>);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/accounts/${encodeURIComponent(args.id as string)}`);
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/accounts/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/accounts/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/accounts/${encodeURIComponent(args.id as string)}`);
  }

  // -- Contacts --------------------------------------------------------------

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'managing_account', 'consuming_account', 'external_ref']);
    return this.request('GET', '/contacts', undefined, q);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/contacts', args as Record<string, unknown>);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/contacts/${encodeURIComponent(args.id as string)}`);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/contacts/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/contacts/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/contacts/${encodeURIComponent(args.id as string)}`);
  }

  // -- Roles & Assignments ---------------------------------------------------

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'name', 'contact']);
    return this.request('GET', '/roles', undefined, q);
  }

  private async getRole(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/roles/${encodeURIComponent(args.id as string)}`);
  }

  private async listRoleAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'contact', 'role']);
    return this.request('GET', '/role-assignments', undefined, q);
  }

  private async createRoleAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact || !args.role) {
      return { content: [{ type: 'text', text: 'contact and role are required' }], isError: true };
    }
    return this.request('POST', '/role-assignments', { contact: args.contact, role: args.role } as Record<string, unknown>);
  }

  private async getRoleAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assignment_id) return { content: [{ type: 'text', text: 'assignment_id is required' }], isError: true };
    return this.request('GET', `/role-assignments/${encodeURIComponent(args.assignment_id as string)}`);
  }

  private async deleteRoleAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.assignment_id) return { content: [{ type: 'text', text: 'assignment_id is required' }], isError: true };
    return this.request('DELETE', `/role-assignments/${encodeURIComponent(args.assignment_id as string)}`);
  }

  // -- Infrastructure --------------------------------------------------------

  private async listFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'capability_media_type', 'capability_speed', 'metro_area', 'metro_area_network', 'address_country', 'address_locality', 'organisation_name', 'postal_code']);
    return this.request('GET', '/facilities', undefined, q);
  }

  private async getFacility(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/facilities/${encodeURIComponent(args.id as string)}`);
  }

  private async listPops(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'facility', 'metro_area_network', 'capability_media_type', 'capability_speed']);
    return this.request('GET', '/pops', undefined, q);
  }

  private async getPop(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/pops/${encodeURIComponent(args.id as string)}`);
  }

  private async listMetroAreas(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id']);
    return this.request('GET', '/metro-areas', undefined, q);
  }

  private async getMetroArea(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/metro-areas/${encodeURIComponent(args.id as string)}`);
  }

  private async listMetroAreaNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'name', 'metro_area', 'service_provider']);
    return this.request('GET', '/metro-area-networks', undefined, q);
  }

  private async getMetroAreaNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/metro-area-networks/${encodeURIComponent(args.id as string)}`);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'name', 'capability_media_type', 'capability_speed', 'facility', 'pop', 'metro_area_network']);
    return this.request('GET', '/devices', undefined, q);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/devices/${encodeURIComponent(args.id as string)}`);
  }

  private async listPorts(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'media_type', 'pop', 'name', 'external_ref', 'device', 'speed', 'connection']);
    return this.request('GET', '/ports', undefined, q);
  }

  private async getPort(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/ports/${encodeURIComponent(args.id as string)}`);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'mode', 'mode__is_not', 'name', 'metro_area_network', 'pop', 'facility', 'external_ref']);
    return this.request('GET', '/connections', undefined, q);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/connections/${encodeURIComponent(args.id as string)}`);
  }

  private async listProductOfferings(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'type', 'name', 'handover_metro_area', 'handover_metro_area_network', 'service_metro_area', 'service_metro_area_network', 'service_provider', 'downgrade_allowed', 'upgrade_allowed', 'bandwidth', 'physical_port_speed', 'service_provider_region', 'service_provider_pop', 'delivery_method', 'cloud_key', 'fields']);
    return this.request('GET', '/product-offerings', undefined, q);
  }

  private async getProductOffering(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/product-offerings/${encodeURIComponent(args.id as string)}`);
  }

  // -- Network Services ------------------------------------------------------

  private async listNetworkServices(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'managing_account', 'consuming_account', 'external_ref', 'type', 'pop', 'product_offering']);
    return this.request('GET', '/network-services', undefined, q);
  }

  private async createNetworkService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.managing_account) {
      return { content: [{ type: 'text', text: 'type and managing_account are required' }], isError: true };
    }
    return this.request('POST', '/network-services', args as Record<string, unknown>);
  }

  private async getNetworkService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/network-services/${encodeURIComponent(args.id as string)}`);
  }

  private async updateNetworkService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/network-services/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchNetworkService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/network-services/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteNetworkService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    const hasBody = Object.keys(body).length > 0;
    return this.request('DELETE', `/network-services/${encodeURIComponent(id as string)}`, hasBody ? body as Record<string, unknown> : undefined);
  }

  private async getNetworkServiceCancellationPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery(args, ['decommission_at']);
    return this.request('GET', `/network-services/${encodeURIComponent(args.id as string)}/cancellation-policy`, undefined, q);
  }

  private async getNetworkServiceChangeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/network-services/${encodeURIComponent(args.id as string)}/change-request`);
  }

  private async createNetworkServiceChangeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('POST', `/network-services/${encodeURIComponent(id as string)}/change-request`, body as Record<string, unknown>);
  }

  private async deleteNetworkServiceChangeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/network-services/${encodeURIComponent(args.id as string)}/change-request`);
  }

  // -- Network Service Configs -----------------------------------------------

  private async listNetworkServiceConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'managing_account', 'consuming_account', 'external_ref', 'type', 'inner_vlan', 'outer_vlan', 'capacity', 'network_service', 'connection', 'product_offering']);
    return this.request('GET', '/network-service-configs', undefined, q);
  }

  private async createNetworkServiceConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.network_service || !args.connection) {
      return { content: [{ type: 'text', text: 'type, network_service, and connection are required' }], isError: true };
    }
    return this.request('POST', '/network-service-configs', args as Record<string, unknown>);
  }

  private async getNetworkServiceConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/network-service-configs/${encodeURIComponent(args.id as string)}`);
  }

  private async updateNetworkServiceConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/network-service-configs/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchNetworkServiceConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/network-service-configs/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteNetworkServiceConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    const hasBody = Object.keys(body).length > 0;
    return this.request('DELETE', `/network-service-configs/${encodeURIComponent(id as string)}`, hasBody ? body as Record<string, unknown> : undefined);
  }

  private async getNetworkServiceConfigCancellationPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery(args, ['decommission_at']);
    return this.request('GET', `/network-service-configs/${encodeURIComponent(args.id as string)}/cancellation-policy`, undefined, q);
  }

  // -- Network Features ------------------------------------------------------

  private async listNetworkFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'type', 'required', 'network_service', 'name']);
    return this.request('GET', '/network-features', undefined, q);
  }

  private async getNetworkFeature(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/network-features/${encodeURIComponent(args.id as string)}`);
  }

  // -- Network Feature Configs -----------------------------------------------

  private async listNetworkFeatureConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'state', 'state__is_not', 'managing_account', 'consuming_account', 'external_ref', 'type', 'service_config', 'network_feature']);
    return this.request('GET', '/network-feature-configs', undefined, q);
  }

  private async createNetworkFeatureConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.network_feature || !args.service_config) {
      return { content: [{ type: 'text', text: 'type, network_feature, and service_config are required' }], isError: true };
    }
    return this.request('POST', '/network-feature-configs', args as Record<string, unknown>);
  }

  private async getNetworkFeatureConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/network-feature-configs/${encodeURIComponent(args.id as string)}`);
  }

  private async updateNetworkFeatureConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/network-feature-configs/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchNetworkFeatureConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/network-feature-configs/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteNetworkFeatureConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/network-feature-configs/${encodeURIComponent(args.id as string)}`);
  }

  // -- IPs -------------------------------------------------------------------

  private async listIps(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'managing_account', 'consuming_account', 'external_ref', 'network_service', 'network_service_config', 'network_feature', 'network_feature_config', 'version', 'fqdn', 'prefix_length', 'valid_not_before', 'valid_not_after']);
    return this.request('GET', '/ips', undefined, q);
  }

  private async createIp(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/ips', args as Record<string, unknown>);
  }

  private async getIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/ips/${encodeURIComponent(args.id as string)}`);
  }

  private async updateIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/ips/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/ips/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  // -- MACs ------------------------------------------------------------------

  private async listMacs(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'managing_account', 'consuming_account', 'external_ref', 'network_service_config', 'address', 'assigned_at', 'valid_not_before', 'valid_not_after']);
    return this.request('GET', '/macs', undefined, q);
  }

  private async createMac(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_service_config || !args.address) {
      return { content: [{ type: 'text', text: 'network_service_config and address are required' }], isError: true };
    }
    return this.request('POST', '/macs', args as Record<string, unknown>);
  }

  private async getMac(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/macs/${encodeURIComponent(args.id as string)}`);
  }

  private async deleteMac(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/macs/${encodeURIComponent(args.id as string)}`);
  }

  // -- Member Joining Rules --------------------------------------------------

  private async listMemberJoiningRules(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery(args, ['id', 'network_service']);
    return this.request('GET', '/member-joining-rules', undefined, q);
  }

  private async createMemberJoiningRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_service || !args.type) {
      return { content: [{ type: 'text', text: 'network_service and type are required' }], isError: true };
    }
    return this.request('POST', '/member-joining-rules', args as Record<string, unknown>);
  }

  private async getMemberJoiningRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/member-joining-rules/${encodeURIComponent(args.id as string)}`);
  }

  private async updateMemberJoiningRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PUT', `/member-joining-rules/${encodeURIComponent(id as string)}`, body as Record<string, unknown>);
  }

  private async patchMemberJoiningRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.request('PATCH', `/member-joining-rules/${encodeURIComponent(id as string)}`, body as Record<string, unknown>, undefined, 'application/merge-patch+json');
  }

  private async deleteMemberJoiningRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/member-joining-rules/${encodeURIComponent(args.id as string)}`);
  }
}
