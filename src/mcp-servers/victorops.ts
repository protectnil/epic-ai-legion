/**
 * VictorOps MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VictorOps MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://api.victorops.com
// Auth: HTTP headers X-VO-Api-Id and X-VO-Api-Key on every request
// Docs: https://portal.victorops.com/public/api-docs.html
// Spec: https://api.apis.guru/v2/specs/victorops.com/0.0.3/openapi.json
// Category: observability
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';

interface VictorOpsConfig {
  apiId: string;
  apiKey: string;
  baseUrl?: string;
}

export class VictorOpsMCPServer {
  private readonly apiId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VictorOpsConfig) {
    this.apiId = config.apiId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.victorops.com';
  }

  static catalog() {
    return {
      name: 'victorops',
      displayName: 'VictorOps',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'victorops', 'incident', 'on-call', 'alert', 'paging', 'escalation', 'oncall',
        'maintenance mode', 'routing', 'override', 'schedule', 'team', 'user',
        'devops', 'site reliability', 'monitoring', 'notification', 'splunk',
      ],
      toolNames: [
        'get_alert',
        'get_incidents',
        'create_incident',
        'acknowledge_incidents',
        'acknowledge_by_user',
        'resolve_by_user',
        'reroute_incidents',
        'resolve_incidents',
        'get_maintenance_mode',
        'start_maintenance_mode',
        'end_maintenance_mode',
        'get_oncall_users',
        'get_routing_keys',
        'list_overrides',
        'create_override',
        'delete_override',
        'get_override',
        'get_override_assignments',
        'delete_override_assignment',
        'get_override_assignment',
        'update_override_assignment',
        'get_escalation_policies',
        'get_contact_types',
        'get_notification_types',
        'get_timeout_values',
        'take_oncall',
        'get_user_paging_policy',
        'create_paging_policy_step',
        'get_paging_policy_step',
        'create_paging_policy_rule',
        'update_paging_policy_step',
        'delete_paging_policy_rule',
        'get_paging_policy_rule',
        'update_paging_policy_rule',
        'list_teams',
        'create_team',
        'delete_team',
        'get_team',
        'update_team',
        'get_team_admins',
        'get_team_members',
        'add_team_member',
        'remove_team_member',
        'get_team_oncall_schedule',
        'take_team_oncall',
        'get_team_escalation_policies',
        'list_users',
        'create_user',
        'delete_user',
        'get_user',
        'update_user',
        'get_user_contact_methods',
        'get_user_contact_devices',
        'delete_contact_device',
        'get_contact_device',
        'update_contact_device',
        'get_user_contact_emails',
        'create_contact_email',
        'delete_contact_email',
        'get_contact_email',
        'get_user_contact_phones',
        'create_contact_phone',
        'delete_contact_phone',
        'get_contact_phone',
        'get_user_oncall_schedule',
        'get_user_paging_policies',
        'get_user_teams',
        'get_incident_history',
        'get_team_oncall_log',
      ],
      description: 'VictorOps: incident management, on-call scheduling, escalation policies, team management, and paging via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Alerts ─────────────────────────────────────────────────────────────
      {
        name: 'get_alert',
        description: 'Retrieve alert details by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: { type: 'string', description: 'Alert UUID' },
          },
          required: ['uuid'],
        },
      },
      // ── Incidents ──────────────────────────────────────────────────────────
      {
        name: 'get_incidents',
        description: 'Get current incident information for the organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident manually',
        inputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Incident summary / title' },
            details: { type: 'string', description: 'Detailed description of the incident' },
            userName: { type: 'string', description: 'Username of the person creating the incident' },
            targets: { type: 'array', items: { type: 'object' }, description: 'Routing targets (escalation policies or users)' },
            isMultiResponder: { type: 'boolean', description: 'Allow multiple responders for this incident' },
          },
          required: ['summary', 'userName', 'targets'],
        },
      },
      {
        name: 'acknowledge_incidents',
        description: 'Acknowledge one or more incidents by incident number',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'Username acknowledging the incidents' },
            incidentNames: { type: 'array', items: { type: 'string' }, description: 'Incident numbers to acknowledge' },
          },
          required: ['userName', 'incidentNames'],
        },
      },
      {
        name: 'acknowledge_by_user',
        description: 'Acknowledge all incidents for which a specific user was paged',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'Username whose paged incidents should be acknowledged' },
          },
          required: ['userName'],
        },
      },
      {
        name: 'resolve_by_user',
        description: 'Resolve all incidents for which a specific user was paged',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'Username whose paged incidents should be resolved' },
          },
          required: ['userName'],
        },
      },
      {
        name: 'reroute_incidents',
        description: 'Reroute one or more incidents to one or more new routable destinations',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'Username initiating the reroute' },
            incidentNames: { type: 'array', items: { type: 'string' }, description: 'Incident numbers to reroute' },
            targets: { type: 'array', items: { type: 'object' }, description: 'New routing targets' },
          },
          required: ['userName', 'incidentNames', 'targets'],
        },
      },
      {
        name: 'resolve_incidents',
        description: 'Resolve one or more incidents by incident number',
        inputSchema: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'Username resolving the incidents' },
            incidentNames: { type: 'array', items: { type: 'string' }, description: 'Incident numbers to resolve' },
          },
          required: ['userName', 'incidentNames'],
        },
      },
      // ── Maintenance Mode ───────────────────────────────────────────────────
      {
        name: 'get_maintenance_mode',
        description: "Get the organization's current maintenance mode state",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'start_maintenance_mode',
        description: 'Start maintenance mode for specified routing keys',
        inputSchema: {
          type: 'object',
          properties: {
            startedAt: { type: 'string', description: 'ISO 8601 start time for maintenance window' },
            message: { type: 'string', description: 'Message describing the maintenance window' },
            routingKeys: { type: 'array', items: { type: 'string' }, description: 'Routing keys to put into maintenance mode' },
          },
          required: ['routingKeys'],
        },
      },
      {
        name: 'end_maintenance_mode',
        description: 'End maintenance mode for specified routing keys by maintenance mode ID',
        inputSchema: {
          type: 'object',
          properties: {
            maintenancemodeid: { type: 'string', description: 'Maintenance mode ID to end' },
          },
          required: ['maintenancemodeid'],
        },
      },
      // ── On-Call ────────────────────────────────────────────────────────────
      {
        name: 'get_oncall_users',
        description: "Get the organization's current on-call users across all teams",
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Routing Keys ───────────────────────────────────────────────────────
      {
        name: 'get_routing_keys',
        description: 'List routing keys with associated escalation policy teams',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Scheduled Overrides ────────────────────────────────────────────────
      {
        name: 'list_overrides',
        description: 'List all scheduled on-call overrides for the organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_override',
        description: 'Create a new scheduled on-call override',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username of the person taking over on-call' },
            startTime: { type: 'string', description: 'ISO 8601 start time of the override' },
            endTime: { type: 'string', description: 'ISO 8601 end time of the override' },
          },
          required: ['username', 'startTime', 'endTime'],
        },
      },
      {
        name: 'delete_override',
        description: 'Delete a scheduled on-call override by public ID',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override to delete' },
          },
          required: ['publicId'],
        },
      },
      {
        name: 'get_override',
        description: 'Get a specific scheduled on-call override by public ID',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override to retrieve' },
          },
          required: ['publicId'],
        },
      },
      {
        name: 'get_override_assignments',
        description: 'Get all assignments for a specific scheduled override',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override' },
          },
          required: ['publicId'],
        },
      },
      {
        name: 'delete_override_assignment',
        description: 'Delete the scheduled override assignment for a specific policy',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override' },
            policySlug: { type: 'string', description: 'Escalation policy slug' },
          },
          required: ['publicId', 'policySlug'],
        },
      },
      {
        name: 'get_override_assignment',
        description: 'Get the scheduled override assignment for a specific policy',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override' },
            policySlug: { type: 'string', description: 'Escalation policy slug' },
          },
          required: ['publicId', 'policySlug'],
        },
      },
      {
        name: 'update_override_assignment',
        description: 'Update the scheduled override assignment for a specific policy',
        inputSchema: {
          type: 'object',
          properties: {
            publicId: { type: 'string', description: 'Public ID of the override' },
            policySlug: { type: 'string', description: 'Escalation policy slug' },
            username: { type: 'string', description: 'Username of the new override assignee' },
          },
          required: ['publicId', 'policySlug', 'username'],
        },
      },
      // ── Escalation Policies ────────────────────────────────────────────────
      {
        name: 'get_escalation_policies',
        description: 'Get escalation policy info for the organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_contact_types',
        description: 'Get the available contact method types for user notification',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_notification_types',
        description: 'Get the available notification types for escalation policies',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_timeout_values',
        description: 'Get the available timeout values for escalation policy steps',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'take_oncall',
        description: 'Create an on-call override (take on-call) for a specific escalation policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy: { type: 'string', description: 'Escalation policy slug' },
            fromUser: { type: 'string', description: 'Username currently on call' },
            toUser: { type: 'string', description: 'Username taking over on-call' },
          },
          required: ['policy', 'fromUser', 'toUser'],
        },
      },
      // ── Paging Policies ────────────────────────────────────────────────────
      {
        name: 'get_user_paging_policy',
        description: "Get a user's paging policy steps",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username to get paging policy for' },
          },
          required: ['username'],
        },
      },
      {
        name: 'create_paging_policy_step',
        description: "Create a new step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username to add the paging policy step to' },
            timeout: { type: 'number', description: 'Step timeout in minutes before escalating to next step' },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_paging_policy_step',
        description: "Get a specific step from a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number (0-indexed)' },
          },
          required: ['username', 'step'],
        },
      },
      {
        name: 'create_paging_policy_rule',
        description: "Create a new rule for a step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number' },
            contactType: { type: 'string', description: 'Contact type (e.g. email, push, phone)' },
            contactId: { type: 'string', description: 'Contact method ID to use for notification' },
          },
          required: ['username', 'step', 'contactType', 'contactId'],
        },
      },
      {
        name: 'update_paging_policy_step',
        description: "Update a step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number to update' },
            timeout: { type: 'number', description: 'Updated timeout in minutes' },
          },
          required: ['username', 'step'],
        },
      },
      {
        name: 'delete_paging_policy_rule',
        description: "Delete a rule from a step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number' },
            rule: { type: 'number', description: 'Rule number to delete' },
          },
          required: ['username', 'step', 'rule'],
        },
      },
      {
        name: 'get_paging_policy_rule',
        description: "Get a specific rule from a step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number' },
            rule: { type: 'number', description: 'Rule number' },
          },
          required: ['username', 'step', 'rule'],
        },
      },
      {
        name: 'update_paging_policy_rule',
        description: "Update a rule for a step in a user's paging policy",
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username' },
            step: { type: 'number', description: 'Step number' },
            rule: { type: 'number', description: 'Rule number to update' },
            contactType: { type: 'string', description: 'Updated contact type' },
            contactId: { type: 'string', description: 'Updated contact method ID' },
          },
          required: ['username', 'step', 'rule'],
        },
      },
      // ── Teams ──────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams in the organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_team',
        description: 'Add a new team to the organization',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the team' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_team',
        description: 'Remove a team from the organization',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug to delete' },
          },
          required: ['team'],
        },
      },
      {
        name: 'get_team',
        description: 'Retrieve information for a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
          },
          required: ['team'],
        },
      },
      {
        name: 'update_team',
        description: 'Update a team — rename it',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug to update' },
            name: { type: 'string', description: 'New team name' },
          },
          required: ['team', 'name'],
        },
      },
      {
        name: 'get_team_admins',
        description: 'Retrieve a list of admin users for a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
          },
          required: ['team'],
        },
      },
      {
        name: 'get_team_members',
        description: 'Retrieve a list of members for a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
          },
          required: ['team'],
        },
      },
      {
        name: 'add_team_member',
        description: 'Add a user to a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
            username: { type: 'string', description: 'Username to add to the team' },
          },
          required: ['team', 'username'],
        },
      },
      {
        name: 'remove_team_member',
        description: 'Remove a user from a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
            user: { type: 'string', description: 'Username to remove from the team' },
            replacement: { type: 'string', description: 'Username to replace them with in escalation policies' },
          },
          required: ['team', 'user'],
        },
      },
      {
        name: 'get_team_oncall_schedule',
        description: "Get a team's on-call schedule",
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
            daysForward: { type: 'number', description: 'Number of days forward to include in schedule (default: 14)' },
            daysSkip: { type: 'number', description: 'Number of days from now to skip before starting the schedule' },
          },
          required: ['team'],
        },
      },
      {
        name: 'take_team_oncall',
        description: 'Create an on-call override (take on-call) for a team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
            fromUser: { type: 'string', description: 'Username currently on call' },
            toUser: { type: 'string', description: 'Username taking over on-call' },
          },
          required: ['team', 'fromUser', 'toUser'],
        },
      },
      {
        name: 'get_team_escalation_policies',
        description: 'Retrieve a list of escalation policies for a specific team',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
          },
          required: ['team'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all users in the organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_user',
        description: 'Add a new user to the organization',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: "User's first name" },
            lastName: { type: 'string', description: "User's last name" },
            username: { type: 'string', description: 'Unique username' },
            email: { type: 'string', description: "User's email address" },
            admin: { type: 'boolean', description: 'Whether this user should be an org admin' },
          },
          required: ['firstName', 'lastName', 'username', 'email'],
        },
      },
      {
        name: 'delete_user',
        description: 'Remove a user from the organization',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username to delete' },
            replacement: { type: 'string', description: 'Username to replace them with in escalation policies' },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve information for a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username to retrieve' },
          },
          required: ['user'],
        },
      },
      {
        name: 'update_user',
        description: 'Update a user — change name, email, or admin status',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username to update' },
            firstName: { type: 'string', description: 'New first name' },
            lastName: { type: 'string', description: 'New last name' },
            email: { type: 'string', description: 'New email address' },
          },
          required: ['user'],
        },
      },
      // ── Contact Methods ────────────────────────────────────────────────────
      {
        name: 'get_user_contact_methods',
        description: 'Get a list of all contact methods for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user_contact_devices',
        description: 'Get a list of all contact devices (push notification) for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      {
        name: 'delete_contact_device',
        description: 'Delete a contact device for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact device ID to delete' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_contact_device',
        description: 'Get details for a specific contact device for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact device ID' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'update_contact_device',
        description: 'Update a contact device for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact device ID to update' },
            label: { type: 'string', description: 'New label for the device' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_user_contact_emails',
        description: 'Get a list of all contact email addresses for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      {
        name: 'create_contact_email',
        description: 'Create a new contact email address for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            email: { type: 'string', description: 'Email address to add' },
            label: { type: 'string', description: 'Label for the email (e.g. work, personal)' },
          },
          required: ['user', 'email'],
        },
      },
      {
        name: 'delete_contact_email',
        description: 'Delete a contact email address for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact email ID to delete' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_contact_email',
        description: 'Get a specific contact email address for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact email ID' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_user_contact_phones',
        description: 'Get a list of all contact phone numbers for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      {
        name: 'create_contact_phone',
        description: 'Create a new contact phone number for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            phone: { type: 'string', description: 'Phone number to add (E.164 format)' },
            label: { type: 'string', description: 'Label for the phone (e.g. mobile, work)' },
          },
          required: ['user', 'phone'],
        },
      },
      {
        name: 'delete_contact_phone',
        description: 'Delete a contact phone number for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact phone ID to delete' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_contact_phone',
        description: 'Get a specific contact phone number for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            contactId: { type: 'string', description: 'Contact phone ID' },
          },
          required: ['user', 'contactId'],
        },
      },
      {
        name: 'get_user_oncall_schedule',
        description: "Get a user's on-call schedule",
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
            daysForward: { type: 'number', description: 'Number of days forward to include (default: 14)' },
            daysSkip: { type: 'number', description: 'Number of days to skip before starting' },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user_paging_policies',
        description: 'Get a list of all paging policies for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user_teams',
        description: "Retrieve the user's team memberships",
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Username' },
          },
          required: ['user'],
        },
      },
      // ── Reporting ──────────────────────────────────────────────────────────
      {
        name: 'get_incident_history',
        description: 'Get or search incident history with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            startedAfter: { type: 'string', description: 'Return incidents that started after this time (ISO 8601)' },
            startedBefore: { type: 'string', description: 'Return incidents that started before this time (ISO 8601)' },
            entityId: { type: 'string', description: 'Filter by monitoring entity ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max number of results (default: 20)' },
          },
        },
      },
      {
        name: 'get_team_oncall_log',
        description: "Get a list of shift changes (on-call log) for a team",
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
            start: { type: 'string', description: 'Start of log period (ISO 8601)' },
            end: { type: 'string', description: 'End of log period (ISO 8601)' },
          },
          required: ['team'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_alert':                    return this.getAlert(args);
        case 'get_incidents':                return this.getIncidents();
        case 'create_incident':              return this.createIncident(args);
        case 'acknowledge_incidents':        return this.acknowledgeIncidents(args);
        case 'acknowledge_by_user':          return this.acknowledgeByUser(args);
        case 'resolve_by_user':              return this.resolveByUser(args);
        case 'reroute_incidents':            return this.rerouteIncidents(args);
        case 'resolve_incidents':            return this.resolveIncidents(args);
        case 'get_maintenance_mode':         return this.getMaintenanceMode();
        case 'start_maintenance_mode':       return this.startMaintenanceMode(args);
        case 'end_maintenance_mode':         return this.endMaintenanceMode(args);
        case 'get_oncall_users':             return this.getOncallUsers();
        case 'get_routing_keys':             return this.getRoutingKeys();
        case 'list_overrides':               return this.listOverrides();
        case 'create_override':              return this.createOverride(args);
        case 'delete_override':              return this.deleteOverride(args);
        case 'get_override':                 return this.getOverride(args);
        case 'get_override_assignments':     return this.getOverrideAssignments(args);
        case 'delete_override_assignment':   return this.deleteOverrideAssignment(args);
        case 'get_override_assignment':      return this.getOverrideAssignment(args);
        case 'update_override_assignment':   return this.updateOverrideAssignment(args);
        case 'get_escalation_policies':      return this.getEscalationPolicies();
        case 'get_contact_types':            return this.getContactTypes();
        case 'get_notification_types':       return this.getNotificationTypes();
        case 'get_timeout_values':           return this.getTimeoutValues();
        case 'take_oncall':                  return this.takeOncall(args);
        case 'get_user_paging_policy':       return this.getUserPagingPolicy(args);
        case 'create_paging_policy_step':    return this.createPagingPolicyStep(args);
        case 'get_paging_policy_step':       return this.getPagingPolicyStep(args);
        case 'create_paging_policy_rule':    return this.createPagingPolicyRule(args);
        case 'update_paging_policy_step':    return this.updatePagingPolicyStep(args);
        case 'delete_paging_policy_rule':    return this.deletePagingPolicyRule(args);
        case 'get_paging_policy_rule':       return this.getPagingPolicyRule(args);
        case 'update_paging_policy_rule':    return this.updatePagingPolicyRule(args);
        case 'list_teams':                   return this.listTeams();
        case 'create_team':                  return this.createTeam(args);
        case 'delete_team':                  return this.deleteTeam(args);
        case 'get_team':                     return this.getTeam(args);
        case 'update_team':                  return this.updateTeam(args);
        case 'get_team_admins':              return this.getTeamAdmins(args);
        case 'get_team_members':             return this.getTeamMembers(args);
        case 'add_team_member':              return this.addTeamMember(args);
        case 'remove_team_member':           return this.removeTeamMember(args);
        case 'get_team_oncall_schedule':     return this.getTeamOncallSchedule(args);
        case 'take_team_oncall':             return this.takeTeamOncall(args);
        case 'get_team_escalation_policies': return this.getTeamEscalationPolicies(args);
        case 'list_users':                   return this.listUsers();
        case 'create_user':                  return this.createUser(args);
        case 'delete_user':                  return this.deleteUser(args);
        case 'get_user':                     return this.getUser(args);
        case 'update_user':                  return this.updateUser(args);
        case 'get_user_contact_methods':     return this.getUserContactMethods(args);
        case 'get_user_contact_devices':     return this.getUserContactDevices(args);
        case 'delete_contact_device':        return this.deleteContactDevice(args);
        case 'get_contact_device':           return this.getContactDevice(args);
        case 'update_contact_device':        return this.updateContactDevice(args);
        case 'get_user_contact_emails':      return this.getUserContactEmails(args);
        case 'create_contact_email':         return this.createContactEmail(args);
        case 'delete_contact_email':         return this.deleteContactEmail(args);
        case 'get_contact_email':            return this.getContactEmail(args);
        case 'get_user_contact_phones':      return this.getUserContactPhones(args);
        case 'create_contact_phone':         return this.createContactPhone(args);
        case 'delete_contact_phone':         return this.deleteContactPhone(args);
        case 'get_contact_phone':            return this.getContactPhone(args);
        case 'get_user_oncall_schedule':     return this.getUserOncallSchedule(args);
        case 'get_user_paging_policies':     return this.getUserPagingPolicies(args);
        case 'get_user_teams':               return this.getUserTeams(args);
        case 'get_incident_history':         return this.getIncidentHistory(args);
        case 'get_team_oncall_log':          return this.getTeamOncallLog(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      'X-VO-Api-Id': this.apiId,
      'X-VO-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      url += `?${qs.toString()}`;
    }
    const init: RequestInit = { method, headers: this.authHeaders };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await fetch(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    if (response.status === 204) return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private err(msg: string): ToolResult {
    return { content: [{ type: 'text', text: msg }], isError: true };
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────

  private getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uuid) return Promise.resolve(this.err('uuid is required'));
    return this.request('GET', `/api-public/v1/alerts/${encodeURIComponent(args.uuid as string)}`);
  }

  // ── Incidents ──────────────────────────────────────────────────────────────

  private getIncidents(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/incidents');
  }

  private createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.summary || !args.userName || !args.targets) return Promise.resolve(this.err('summary, userName, and targets are required'));
    return this.request('POST', '/api-public/v1/incidents', args as Record<string, unknown>);
  }

  private acknowledgeIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName || !args.incidentNames) return Promise.resolve(this.err('userName and incidentNames are required'));
    return this.request('PATCH', '/api-public/v1/incidents/ack', args as Record<string, unknown>);
  }

  private acknowledgeByUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName) return Promise.resolve(this.err('userName is required'));
    return this.request('PATCH', '/api-public/v1/incidents/byUser/ack', args as Record<string, unknown>);
  }

  private resolveByUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName) return Promise.resolve(this.err('userName is required'));
    return this.request('PATCH', '/api-public/v1/incidents/byUser/resolve', args as Record<string, unknown>);
  }

  private rerouteIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName || !args.incidentNames || !args.targets) return Promise.resolve(this.err('userName, incidentNames, and targets are required'));
    return this.request('POST', '/api-public/v1/incidents/reroute', args as Record<string, unknown>);
  }

  private resolveIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.userName || !args.incidentNames) return Promise.resolve(this.err('userName and incidentNames are required'));
    return this.request('PATCH', '/api-public/v1/incidents/resolve', args as Record<string, unknown>);
  }

  // ── Maintenance Mode ───────────────────────────────────────────────────────

  private getMaintenanceMode(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/maintenancemode');
  }

  private startMaintenanceMode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.routingKeys) return Promise.resolve(this.err('routingKeys is required'));
    return this.request('POST', '/api-public/v1/maintenancemode/start', args as Record<string, unknown>);
  }

  private endMaintenanceMode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.maintenancemodeid) return Promise.resolve(this.err('maintenancemodeid is required'));
    return this.request('PUT', `/api-public/v1/maintenancemode/${encodeURIComponent(args.maintenancemodeid as string)}/end`);
  }

  // ── On-Call ────────────────────────────────────────────────────────────────

  private getOncallUsers(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/oncall/current');
  }

  // ── Routing Keys ───────────────────────────────────────────────────────────

  private getRoutingKeys(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/org/routing-keys');
  }

  // ── Overrides ──────────────────────────────────────────────────────────────

  private listOverrides(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/overrides');
  }

  private createOverride(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.startTime || !args.endTime) return Promise.resolve(this.err('username, startTime, and endTime are required'));
    return this.request('POST', '/api-public/v1/overrides', args as Record<string, unknown>);
  }

  private deleteOverride(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId) return Promise.resolve(this.err('publicId is required'));
    return this.request('DELETE', `/api-public/v1/overrides/${encodeURIComponent(args.publicId as string)}`);
  }

  private getOverride(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId) return Promise.resolve(this.err('publicId is required'));
    return this.request('GET', `/api-public/v1/overrides/${encodeURIComponent(args.publicId as string)}`);
  }

  private getOverrideAssignments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId) return Promise.resolve(this.err('publicId is required'));
    return this.request('GET', `/api-public/v1/overrides/${encodeURIComponent(args.publicId as string)}/assignments`);
  }

  private deleteOverrideAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId || !args.policySlug) return Promise.resolve(this.err('publicId and policySlug are required'));
    return this.request('DELETE', `/api-public/v1/overrides/${encodeURIComponent(args.publicId as string)}/assignments/${encodeURIComponent(args.policySlug as string)}`);
  }

  private getOverrideAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId || !args.policySlug) return Promise.resolve(this.err('publicId and policySlug are required'));
    return this.request('GET', `/api-public/v1/overrides/${encodeURIComponent(args.publicId as string)}/assignments/${encodeURIComponent(args.policySlug as string)}`);
  }

  private updateOverrideAssignment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.publicId || !args.policySlug || !args.username) return Promise.resolve(this.err('publicId, policySlug, and username are required'));
    const { publicId, policySlug, ...body } = args;
    return this.request('PUT', `/api-public/v1/overrides/${encodeURIComponent(publicId as string)}/assignments/${encodeURIComponent(policySlug as string)}`, body as Record<string, unknown>);
  }

  // ── Escalation Policies ────────────────────────────────────────────────────

  private getEscalationPolicies(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/policies');
  }

  private getContactTypes(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/policies/types/contacts');
  }

  private getNotificationTypes(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/policies/types/notifications');
  }

  private getTimeoutValues(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/policies/types/timeouts');
  }

  private takeOncall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy || !args.fromUser || !args.toUser) return Promise.resolve(this.err('policy, fromUser, and toUser are required'));
    const { policy, ...body } = args;
    return this.request('PATCH', `/api-public/v1/policies/${encodeURIComponent(policy as string)}/oncall/user`, body as Record<string, unknown>);
  }

  // ── Paging Policies ────────────────────────────────────────────────────────

  private getUserPagingPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return Promise.resolve(this.err('username is required'));
    return this.request('GET', `/api-public/v1/profile/${encodeURIComponent(args.username as string)}/policies`);
  }

  private createPagingPolicyStep(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return Promise.resolve(this.err('username is required'));
    const { username, ...body } = args;
    return this.request('POST', `/api-public/v1/profile/${encodeURIComponent(username as string)}/policies`, body as Record<string, unknown>);
  }

  private getPagingPolicyStep(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined) return Promise.resolve(this.err('username and step are required'));
    return this.request('GET', `/api-public/v1/profile/${encodeURIComponent(args.username as string)}/policies/${args.step}`);
  }

  private createPagingPolicyRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined || !args.contactType || !args.contactId)
      return Promise.resolve(this.err('username, step, contactType, and contactId are required'));
    const { username, step, ...body } = args;
    return this.request('POST', `/api-public/v1/profile/${encodeURIComponent(username as string)}/policies/${step}`, body as Record<string, unknown>);
  }

  private updatePagingPolicyStep(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined) return Promise.resolve(this.err('username and step are required'));
    const { username, step, ...body } = args;
    return this.request('PUT', `/api-public/v1/profile/${encodeURIComponent(username as string)}/policies/${step}`, body as Record<string, unknown>);
  }

  private deletePagingPolicyRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined || args.rule === undefined)
      return Promise.resolve(this.err('username, step, and rule are required'));
    return this.request('DELETE', `/api-public/v1/profile/${encodeURIComponent(args.username as string)}/policies/${args.step}/${args.rule}`);
  }

  private getPagingPolicyRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined || args.rule === undefined)
      return Promise.resolve(this.err('username, step, and rule are required'));
    return this.request('GET', `/api-public/v1/profile/${encodeURIComponent(args.username as string)}/policies/${args.step}/${args.rule}`);
  }

  private updatePagingPolicyRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || args.step === undefined || args.rule === undefined)
      return Promise.resolve(this.err('username, step, and rule are required'));
    const { username, step, rule, ...body } = args;
    return this.request('PUT', `/api-public/v1/profile/${encodeURIComponent(username as string)}/policies/${step}/${rule}`, body as Record<string, unknown>);
  }

  // ── Teams ──────────────────────────────────────────────────────────────────

  private listTeams(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/team');
  }

  private createTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return Promise.resolve(this.err('name is required'));
    return this.request('POST', '/api-public/v1/team', { name: args.name });
  }

  private deleteTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    return this.request('DELETE', `/api-public/v1/team/${encodeURIComponent(args.team as string)}`);
  }

  private getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    return this.request('GET', `/api-public/v1/team/${encodeURIComponent(args.team as string)}`);
  }

  private updateTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team || !args.name) return Promise.resolve(this.err('team and name are required'));
    return this.request('PUT', `/api-public/v1/team/${encodeURIComponent(args.team as string)}`, { name: args.name });
  }

  private getTeamAdmins(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    return this.request('GET', `/api-public/v1/team/${encodeURIComponent(args.team as string)}/admins`);
  }

  private getTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    return this.request('GET', `/api-public/v1/team/${encodeURIComponent(args.team as string)}/members`);
  }

  private addTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team || !args.username) return Promise.resolve(this.err('team and username are required'));
    return this.request('POST', `/api-public/v1/team/${encodeURIComponent(args.team as string)}/members`, { username: args.username });
  }

  private removeTeamMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team || !args.user) return Promise.resolve(this.err('team and user are required'));
    const body: Record<string, unknown> = {};
    if (args.replacement) body.replacement = args.replacement;
    return this.request('DELETE', `/api-public/v1/team/${encodeURIComponent(args.team as string)}/members/${encodeURIComponent(args.user as string)}`, body);
  }

  private getTeamOncallSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    const q: Record<string, unknown> = {};
    if (args.daysForward !== undefined) q.daysForward = args.daysForward;
    if (args.daysSkip !== undefined) q.daysSkip = args.daysSkip;
    return this.request('GET', `/api-public/v2/team/${encodeURIComponent(args.team as string)}/oncall/schedule`, undefined, q);
  }

  private takeTeamOncall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team || !args.fromUser || !args.toUser) return Promise.resolve(this.err('team, fromUser, and toUser are required'));
    const { team, ...body } = args;
    return this.request('PATCH', `/api-public/v1/team/${encodeURIComponent(team as string)}/oncall/user`, body as Record<string, unknown>);
  }

  private getTeamEscalationPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    return this.request('GET', `/api-public/v1/team/${encodeURIComponent(args.team as string)}/policies`);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  private listUsers(): Promise<ToolResult> {
    return this.request('GET', '/api-public/v1/user');
  }

  private createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.firstName || !args.lastName || !args.username || !args.email)
      return Promise.resolve(this.err('firstName, lastName, username, and email are required'));
    return this.request('POST', '/api-public/v1/user', args as Record<string, unknown>);
  }

  private deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    const body: Record<string, unknown> = {};
    if (args.replacement) body.replacement = args.replacement;
    return this.request('DELETE', `/api-public/v1/user/${encodeURIComponent(args.user as string)}`, body);
  }

  private getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}`);
  }

  private updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    const { user, ...body } = args;
    return this.request('PUT', `/api-public/v1/user/${encodeURIComponent(user as string)}`, body as Record<string, unknown>);
  }

  // ── Contact Methods ────────────────────────────────────────────────────────

  private getUserContactMethods(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods`);
  }

  private getUserContactDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/devices`);
  }

  private deleteContactDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('DELETE', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/devices/${encodeURIComponent(args.contactId as string)}`);
  }

  private getContactDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/devices/${encodeURIComponent(args.contactId as string)}`);
  }

  private updateContactDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    const { user, contactId, ...body } = args;
    return this.request('PUT', `/api-public/v1/user/${encodeURIComponent(user as string)}/contact-methods/devices/${encodeURIComponent(contactId as string)}`, body as Record<string, unknown>);
  }

  private getUserContactEmails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/emails`);
  }

  private createContactEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.email) return Promise.resolve(this.err('user and email are required'));
    const { user, ...body } = args;
    return this.request('POST', `/api-public/v1/user/${encodeURIComponent(user as string)}/contact-methods/emails`, body as Record<string, unknown>);
  }

  private deleteContactEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('DELETE', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/emails/${encodeURIComponent(args.contactId as string)}`);
  }

  private getContactEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/emails/${encodeURIComponent(args.contactId as string)}`);
  }

  private getUserContactPhones(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/phones`);
  }

  private createContactPhone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.phone) return Promise.resolve(this.err('user and phone are required'));
    const { user, ...body } = args;
    return this.request('POST', `/api-public/v1/user/${encodeURIComponent(user as string)}/contact-methods/phones`, body as Record<string, unknown>);
  }

  private deleteContactPhone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('DELETE', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/phones/${encodeURIComponent(args.contactId as string)}`);
  }

  private getContactPhone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.contactId) return Promise.resolve(this.err('user and contactId are required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/contact-methods/phones/${encodeURIComponent(args.contactId as string)}`);
  }

  private getUserOncallSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    const q: Record<string, unknown> = {};
    if (args.daysForward !== undefined) q.daysForward = args.daysForward;
    if (args.daysSkip !== undefined) q.daysSkip = args.daysSkip;
    return this.request('GET', `/api-public/v2/user/${encodeURIComponent(args.user as string)}/oncall/schedule`, undefined, q);
  }

  private getUserPagingPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/policies`);
  }

  private getUserTeams(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return Promise.resolve(this.err('user is required'));
    return this.request('GET', `/api-public/v1/user/${encodeURIComponent(args.user as string)}/teams`);
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  private getIncidentHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, unknown> = {};
    if (args.startedAfter) q.startedAfter = args.startedAfter;
    if (args.startedBefore) q.startedBefore = args.startedBefore;
    if (args.entityId) q.entityId = args.entityId;
    if (args.offset !== undefined) q.offset = args.offset;
    if (args.limit !== undefined) q.limit = args.limit;
    return this.request('GET', '/api-reporting/v2/incidents', undefined, q);
  }

  private getTeamOncallLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team) return Promise.resolve(this.err('team is required'));
    const q: Record<string, unknown> = {};
    if (args.start) q.start = args.start;
    if (args.end) q.end = args.end;
    return this.request('GET', `/api-reporting/v1/team/${encodeURIComponent(args.team as string)}/oncall/log`, undefined, q);
  }
}
