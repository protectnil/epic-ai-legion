/**
 * Trello MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Trello MCP server was found on GitHub or the Atlassian developer portal.
//
// Base URL: https://trello.com/1
// Auth: API Key + Token query parameters (key and token).
//   API Key: obtained from https://trello.com/app-key
//   Token: obtained via OAuth or manual generation at https://trello.com/app-key
// Docs: https://developer.atlassian.com/cloud/trello/rest/
// Rate limits: Approximately 100 requests per 10 seconds per token.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TrelloConfig {
  /** Trello API key obtained from https://trello.com/app-key */
  apiKey: string;
  /** Trello API token obtained via OAuth or manual generation */
  apiToken: string;
  /** Optional base URL override (default: https://trello.com/1) */
  baseUrl?: string;
}

export class TrelloMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: TrelloConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://trello.com/1';
  }

  static catalog() {
    return {
      name: 'trello',
      displayName: 'Trello',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'trello', 'kanban', 'board', 'card', 'list', 'task', 'project management',
        'checklist', 'member', 'label', 'organization', 'workspace',
        'productivity', 'collaboration', 'agile', 'scrum', 'atlassian',
      ],
      toolNames: [
        'create_board', 'get_board', 'update_board', 'get_board_lists', 'get_board_cards',
        'create_list', 'get_list', 'update_list', 'archive_list', 'get_list_cards',
        'create_card', 'get_card', 'update_card', 'delete_card', 'move_card',
        'get_card_checklists', 'add_card_checklist',
        'create_checklist', 'get_checklist', 'delete_checklist', 'add_checklist_item',
        'get_member', 'get_member_boards', 'get_member_cards',
      ],
      description: 'Full Trello project management via REST API. Manage boards, lists, cards, checklists, members, and labels for Kanban-style workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Boards ──────────────────────────────────────────────────────────────
      {
        name: 'create_board',
        description: 'Create a new Trello board with a name, optional description, and visibility settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the board to create',
            },
            desc: {
              type: 'string',
              description: 'Description of the board',
            },
            defaultLists: {
              type: 'boolean',
              description: 'Whether to create default lists (To Do, Doing, Done). Default: true',
            },
            idOrganization: {
              type: 'string',
              description: 'ID of the organization (workspace) to add the board to',
            },
            prefs_permissionLevel: {
              type: 'string',
              description: 'Board visibility: private, org, or public (default: private)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_board',
        description: 'Get details of a Trello board by ID including name, description, URL, and preferences',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The board ID or short link',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_board',
        description: 'Update a Trello board name, description, closed status, or other properties',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The board ID to update',
            },
            name: {
              type: 'string',
              description: 'New board name',
            },
            desc: {
              type: 'string',
              description: 'New board description',
            },
            closed: {
              type: 'boolean',
              description: 'Set to true to archive the board, false to unarchive',
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether the current user is subscribed to the board',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_board_lists',
        description: 'Get all lists on a Trello board, optionally filtering by open or closed status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The board ID to get lists for',
            },
            filter: {
              type: 'string',
              description: 'Filter lists by status: all, closed, none, open (default: open)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_board_cards',
        description: 'Get all cards on a Trello board, optionally filtering by status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The board ID to get cards for',
            },
            filter: {
              type: 'string',
              description: 'Filter cards by status: all, closed, none, open, visible (default: visible)',
            },
          },
          required: ['id'],
        },
      },
      // ── Lists ────────────────────────────────────────────────────────────────
      {
        name: 'create_list',
        description: 'Create a new list on a Trello board at a specified position',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the list to create',
            },
            idBoard: {
              type: 'string',
              description: 'ID of the board to create the list on',
            },
            pos: {
              type: 'string',
              description: 'Position of the list: top, bottom, or a positive number (default: top)',
            },
          },
          required: ['name', 'idBoard'],
        },
      },
      {
        name: 'get_list',
        description: 'Get details of a Trello list by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The list ID to retrieve',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_list',
        description: 'Update a Trello list name, position, or subscription status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The list ID to update',
            },
            name: {
              type: 'string',
              description: 'New list name',
            },
            pos: {
              type: 'string',
              description: 'New position: top, bottom, or a positive number',
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether the current user is subscribed to the list',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'archive_list',
        description: 'Archive (close) all cards in a Trello list or archive the list itself',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The list ID to archive all cards from',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_list_cards',
        description: 'Get all cards in a Trello list, optionally filtering by status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The list ID to get cards for',
            },
            filter: {
              type: 'string',
              description: 'Filter cards: all, closed, none, open (default: open)',
            },
          },
          required: ['id'],
        },
      },
      // ── Cards ────────────────────────────────────────────────────────────────
      {
        name: 'create_card',
        description: 'Create a new card in a Trello list with optional name, description, due date, and labels',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the card',
            },
            idList: {
              type: 'string',
              description: 'ID of the list to create the card in',
            },
            desc: {
              type: 'string',
              description: 'Description or detailed text for the card',
            },
            due: {
              type: 'string',
              description: 'Due date for the card in ISO 8601 format (e.g. 2026-04-01T12:00:00Z)',
            },
            idLabels: {
              type: 'string',
              description: 'Comma-separated list of label IDs to attach to the card',
            },
            idMembers: {
              type: 'string',
              description: 'Comma-separated list of member IDs to assign to the card',
            },
            pos: {
              type: 'string',
              description: 'Position in the list: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['name', 'idList'],
        },
      },
      {
        name: 'get_card',
        description: 'Get full details of a Trello card including name, description, due date, members, and labels',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID or short link',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_card',
        description: 'Update a Trello card name, description, due date, position, list, labels, or members',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID to update',
            },
            name: {
              type: 'string',
              description: 'New card name',
            },
            desc: {
              type: 'string',
              description: 'New card description',
            },
            due: {
              type: 'string',
              description: 'New due date in ISO 8601 format, or null to remove',
            },
            idList: {
              type: 'string',
              description: 'ID of the list to move the card to',
            },
            idBoard: {
              type: 'string',
              description: 'ID of the board to move the card to',
            },
            pos: {
              type: 'string',
              description: 'New position: top, bottom, or a positive number',
            },
            closed: {
              type: 'boolean',
              description: 'Set to true to archive the card, false to unarchive',
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether the current user is subscribed to the card',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_card',
        description: 'Permanently delete a Trello card by ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'move_card',
        description: 'Move a Trello card to a different list and optionally a different board',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID to move',
            },
            idList: {
              type: 'string',
              description: 'ID of the destination list',
            },
            idBoard: {
              type: 'string',
              description: 'ID of the destination board (required when moving cross-board)',
            },
            pos: {
              type: 'string',
              description: 'Position in the destination list: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['id', 'idList'],
        },
      },
      {
        name: 'get_card_checklists',
        description: 'Get all checklists attached to a Trello card',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID to get checklists for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_card_checklist',
        description: 'Add a new checklist to a Trello card',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The card ID to add a checklist to',
            },
            name: {
              type: 'string',
              description: 'Name of the new checklist (default: Checklist)',
            },
            idChecklistSource: {
              type: 'string',
              description: 'Optional ID of an existing checklist to copy items from',
            },
          },
          required: ['id'],
        },
      },
      // ── Checklists ───────────────────────────────────────────────────────────
      {
        name: 'create_checklist',
        description: 'Create a checklist on a Trello card with a name and optional source checklist to copy from',
        inputSchema: {
          type: 'object',
          properties: {
            idCard: {
              type: 'string',
              description: 'ID of the card to create the checklist on',
            },
            name: {
              type: 'string',
              description: 'Name of the checklist',
            },
            pos: {
              type: 'string',
              description: 'Position: top, bottom, or a positive number (default: bottom)',
            },
            idChecklistSource: {
              type: 'string',
              description: 'Optional ID of a checklist to copy items from',
            },
          },
          required: ['idCard', 'name'],
        },
      },
      {
        name: 'get_checklist',
        description: 'Get a Trello checklist by ID including all check items and their completion state',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The checklist ID to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_checklist',
        description: 'Delete a Trello checklist and all its items from a card',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The checklist ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_checklist_item',
        description: 'Add a new check item to a Trello checklist',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The checklist ID to add an item to',
            },
            name: {
              type: 'string',
              description: 'Name/text of the check item',
            },
            checked: {
              type: 'boolean',
              description: 'Whether the item starts as checked (default: false)',
            },
            pos: {
              type: 'string',
              description: 'Position: top, bottom, or a positive number (default: bottom)',
            },
          },
          required: ['id', 'name'],
        },
      },
      // ── Members ──────────────────────────────────────────────────────────────
      {
        name: 'get_member',
        description: 'Get a Trello member profile by ID or username including name, username, and avatar',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The member ID or username (use "me" for the authenticated user)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (default: all)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_member_boards',
        description: 'Get all boards that a Trello member belongs to, optionally filtering by status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The member ID or username (use "me" for the authenticated user)',
            },
            filter: {
              type: 'string',
              description: 'Filter boards: all, closed, members, open, organization, public, starred (default: all)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of board fields to return',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_member_cards',
        description: 'Get all cards assigned to a Trello member, optionally filtering by status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The member ID or username (use "me" for the authenticated user)',
            },
            filter: {
              type: 'string',
              description: 'Filter cards: all, closed, none, open, visible (default: visible)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_board':         return this.createBoard(args);
        case 'get_board':            return this.getBoard(args);
        case 'update_board':         return this.updateBoard(args);
        case 'get_board_lists':      return this.getBoardLists(args);
        case 'get_board_cards':      return this.getBoardCards(args);
        case 'create_list':          return this.createList(args);
        case 'get_list':             return this.getList(args);
        case 'update_list':          return this.updateList(args);
        case 'archive_list':         return this.archiveList(args);
        case 'get_list_cards':       return this.getListCards(args);
        case 'create_card':          return this.createCard(args);
        case 'get_card':             return this.getCard(args);
        case 'update_card':          return this.updateCard(args);
        case 'delete_card':          return this.deleteCard(args);
        case 'move_card':            return this.moveCard(args);
        case 'get_card_checklists':  return this.getCardChecklists(args);
        case 'add_card_checklist':   return this.addCardChecklist(args);
        case 'create_checklist':     return this.createChecklist(args);
        case 'get_checklist':        return this.getChecklist(args);
        case 'delete_checklist':     return this.deleteChecklist(args);
        case 'add_checklist_item':   return this.addChecklistItem(args);
        case 'get_member':           return this.getMember(args);
        case 'get_member_boards':    return this.getMemberBoards(args);
        case 'get_member_cards':     return this.getMemberCards(args);
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

  private get authParams(): Record<string, string> {
    return { key: this.apiKey, token: this.apiToken };
  }


  private buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams({ ...this.authParams });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `?${qs.toString()}`;
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQuery(params)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Trello returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams(this.authParams).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Trello returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams(this.authParams).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Trello returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const qs = new URLSearchParams(this.authParams).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Board implementations ────────────────────────────────────────────────────

  private async createBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.desc !== undefined) body.desc = args.desc;
    if (args.defaultLists !== undefined) body.defaultLists = args.defaultLists;
    if (args.idOrganization !== undefined) body.idOrganization = args.idOrganization;
    if (args.prefs_permissionLevel !== undefined) body['prefs/permissionLevel'] = args.prefs_permissionLevel;
    return this.post('/boards', body);
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/boards/${encodeURIComponent(args.id as string)}`, {
      fields: args.fields as string | undefined,
    });
  }

  private async updateBoard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.desc !== undefined) body.desc = args.desc;
    if (args.closed !== undefined) body.closed = args.closed;
    if (args.subscribed !== undefined) body.subscribed = args.subscribed;
    return this.put(`/boards/${encodeURIComponent(args.id as string)}`, body);
  }

  private async getBoardLists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const filter = args.filter as string | undefined;
    const path = filter
      ? `/boards/${encodeURIComponent(args.id as string)}/lists/${encodeURIComponent(filter)}`
      : `/boards/${encodeURIComponent(args.id as string)}/lists`;
    return this.get(path);
  }

  private async getBoardCards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const filter = args.filter as string | undefined;
    const path = filter
      ? `/boards/${encodeURIComponent(args.id as string)}/cards/${encodeURIComponent(filter)}`
      : `/boards/${encodeURIComponent(args.id as string)}/cards`;
    return this.get(path);
  }

  // ── List implementations ─────────────────────────────────────────────────────

  private async createList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.idBoard) return { content: [{ type: 'text', text: 'name and idBoard are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, idBoard: args.idBoard };
    if (args.pos !== undefined) body.pos = args.pos;
    return this.post('/lists', body);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/lists/${encodeURIComponent(args.id as string)}`, {
      fields: args.fields as string | undefined,
    });
  }

  private async updateList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.pos !== undefined) body.pos = args.pos;
    if (args.subscribed !== undefined) body.subscribed = args.subscribed;
    return this.put(`/lists/${encodeURIComponent(args.id as string)}`, body);
  }

  private async archiveList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const qs = new URLSearchParams(this.authParams).toString();
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/lists/${encodeURIComponent(args.id as string)}/archiveAllCards?${qs}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getListCards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const filter = args.filter as string | undefined;
    const path = filter
      ? `/lists/${encodeURIComponent(args.id as string)}/cards/${encodeURIComponent(filter)}`
      : `/lists/${encodeURIComponent(args.id as string)}/cards`;
    return this.get(path);
  }

  // ── Card implementations ─────────────────────────────────────────────────────

  private async createCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.idList) return { content: [{ type: 'text', text: 'name and idList are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, idList: args.idList };
    if (args.desc !== undefined) body.desc = args.desc;
    if (args.due !== undefined) body.due = args.due;
    if (args.idLabels !== undefined) body.idLabels = args.idLabels;
    if (args.idMembers !== undefined) body.idMembers = args.idMembers;
    if (args.pos !== undefined) body.pos = args.pos;
    return this.post('/cards', body);
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/cards/${encodeURIComponent(args.id as string)}`, {
      fields: args.fields as string | undefined,
    });
  }

  private async updateCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.desc !== undefined) body.desc = args.desc;
    if (args.due !== undefined) body.due = args.due;
    if (args.idList !== undefined) body.idList = args.idList;
    if (args.idBoard !== undefined) body.idBoard = args.idBoard;
    if (args.pos !== undefined) body.pos = args.pos;
    if (args.closed !== undefined) body.closed = args.closed;
    if (args.subscribed !== undefined) body.subscribed = args.subscribed;
    return this.put(`/cards/${encodeURIComponent(args.id as string)}`, body);
  }

  private async deleteCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.del(`/cards/${encodeURIComponent(args.id as string)}`);
  }

  private async moveCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.idList) return { content: [{ type: 'text', text: 'id and idList are required' }], isError: true };
    const body: Record<string, unknown> = { idList: args.idList };
    if (args.idBoard !== undefined) body.idBoard = args.idBoard;
    body.pos = args.pos ?? 'bottom';
    return this.put(`/cards/${encodeURIComponent(args.id as string)}`, body);
  }

  private async getCardChecklists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/cards/${encodeURIComponent(args.id as string)}/checklists`);
  }

  private async addCardChecklist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.idChecklistSource !== undefined) body.idChecklistSource = args.idChecklistSource;
    return this.post(`/cards/${encodeURIComponent(args.id as string)}/checklists`, body);
  }

  // ── Checklist implementations ────────────────────────────────────────────────

  private async createChecklist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.idCard || !args.name) return { content: [{ type: 'text', text: 'idCard and name are required' }], isError: true };
    const body: Record<string, unknown> = { idCard: args.idCard, name: args.name };
    if (args.pos !== undefined) body.pos = args.pos;
    if (args.idChecklistSource !== undefined) body.idChecklistSource = args.idChecklistSource;
    return this.post('/checklists', body);
  }

  private async getChecklist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/checklists/${encodeURIComponent(args.id as string)}`);
  }

  private async deleteChecklist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.del(`/checklists/${encodeURIComponent(args.id as string)}`);
  }

  private async addChecklistItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.name) return { content: [{ type: 'text', text: 'id and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.checked !== undefined) body.checked = args.checked;
    if (args.pos !== undefined) body.pos = args.pos;
    return this.post(`/checklists/${encodeURIComponent(args.id as string)}/checkItems`, body);
  }

  // ── Member implementations ───────────────────────────────────────────────────

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/members/${encodeURIComponent(args.id as string)}`, {
      fields: args.fields as string | undefined,
    });
  }

  private async getMemberBoards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const filter = args.filter as string | undefined;
    const path = filter
      ? `/members/${encodeURIComponent(args.id as string)}/boards/${encodeURIComponent(filter)}`
      : `/members/${encodeURIComponent(args.id as string)}/boards`;
    return this.get(path, { fields: args.fields as string | undefined });
  }

  private async getMemberCards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const filter = args.filter as string | undefined;
    const path = filter
      ? `/members/${encodeURIComponent(args.id as string)}/cards/${encodeURIComponent(filter)}`
      : `/members/${encodeURIComponent(args.id as string)}/cards`;
    return this.get(path);
  }
}
