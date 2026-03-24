/**
 * Google Calendar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface GoogleCalendarConfig {
  accessToken: string;
}

export class GoogleCalendarMCPServer {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';
  private readonly headers: Record<string, string>;

  constructor(config: GoogleCalendarConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_events',
        description: 'List events from a Google Calendar',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            timeMin: {
              type: 'string',
              description: 'RFC3339 timestamp lower bound for events (e.g., "2026-01-01T00:00:00Z")',
            },
            timeMax: {
              type: 'string',
              description: 'RFC3339 timestamp upper bound for events',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
            q: {
              type: 'string',
              description: 'Free-text search query',
            },
          },
        },
      },
      {
        name: 'create_event',
        description: 'Create a new event on a Google Calendar',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            summary: {
              type: 'string',
              description: 'Event title',
            },
            description: {
              type: 'string',
              description: 'Event description',
            },
            location: {
              type: 'string',
              description: 'Event location',
            },
            start: {
              type: 'string',
              description: 'Start time as RFC3339 timestamp (e.g., "2026-03-21T10:00:00-07:00")',
            },
            end: {
              type: 'string',
              description: 'End time as RFC3339 timestamp',
            },
            attendees: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of attendee email addresses',
            },
          },
          required: ['summary', 'start', 'end'],
        },
      },
      {
        name: 'get_event',
        description: 'Get details of a specific calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'The event ID',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event (patch semantics — only supplied fields are changed)',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'The event ID to update',
            },
            summary: {
              type: 'string',
              description: 'New event title',
            },
            description: {
              type: 'string',
              description: 'New event description',
            },
            location: {
              type: 'string',
              description: 'New event location',
            },
            start: {
              type: 'string',
              description: 'New start time as RFC3339 timestamp',
            },
            end: {
              type: 'string',
              description: 'New end time as RFC3339 timestamp',
            },
            attendees: {
              type: 'array',
              items: { type: 'string' },
              description: 'Replacement list of attendee email addresses',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'list_calendars',
        description: 'List all calendars accessible to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of calendars to return (default: 100)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
        },
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            calendarId: {
              type: 'string',
              description: 'Calendar ID (default: "primary")',
            },
            eventId: {
              type: 'string',
              description: 'The event ID to delete',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'query_free_busy',
        description: 'Query free/busy information for a set of calendars over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            timeMin: {
              type: 'string',
              description: 'Start of the interval as RFC3339 timestamp (e.g., "2026-03-23T08:00:00Z")',
            },
            timeMax: {
              type: 'string',
              description: 'End of the interval as RFC3339 timestamp',
            },
            calendarIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of calendar IDs to query (e.g., ["primary", "user@example.com"])',
            },
            timeZone: {
              type: 'string',
              description: 'Time zone in IANA format used in the response (default: UTC)',
            },
          },
          required: ['timeMin', 'timeMax', 'calendarIds'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_events':
          return await this.listEvents(
            args.calendarId as string | undefined,
            args.timeMin as string | undefined,
            args.timeMax as string | undefined,
            args.maxResults as number | undefined,
            args.pageToken as string | undefined,
            args.q as string | undefined
          );
        case 'create_event':
          return await this.createEvent(
            args.calendarId as string | undefined,
            args.summary as string,
            args.start as string,
            args.end as string,
            args.description as string | undefined,
            args.location as string | undefined,
            args.attendees as string[] | undefined
          );
        case 'get_event':
          return await this.getEvent(
            args.calendarId as string | undefined,
            args.eventId as string
          );
        case 'update_event':
          return await this.updateEvent(
            args.calendarId as string | undefined,
            args.eventId as string,
            args.summary as string | undefined,
            args.start as string | undefined,
            args.end as string | undefined,
            args.description as string | undefined,
            args.location as string | undefined,
            args.attendees as string[] | undefined
          );
        case 'list_calendars':
          return await this.listCalendars(
            args.maxResults as number | undefined,
            args.pageToken as string | undefined
          );
        case 'delete_event':
          return await this.deleteEvent(
            args.calendarId as string | undefined,
            args.eventId as string
          );
        case 'query_free_busy':
          return await this.queryFreeBusy(
            args.timeMin as string,
            args.timeMax as string,
            args.calendarIds as string[],
            args.timeZone as string | undefined
          );
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listEvents(
    calendarId?: string,
    timeMin?: string,
    timeMax?: string,
    maxResults?: number,
    pageToken?: string,
    q?: string
  ): Promise<ToolResult> {
    const cal = calendarId ?? 'primary';
    const params = new URLSearchParams();
    params.append('maxResults', String(maxResults ?? 25));
    params.append('singleEvents', 'true');
    params.append('orderBy', 'startTime');
    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);
    if (pageToken) params.append('pageToken', pageToken);
    if (q) params.append('q', q);

    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(cal)}/events?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createEvent(
    calendarId?: string,
    summary?: string,
    start?: string,
    end?: string,
    description?: string,
    location?: string,
    attendees?: string[]
  ): Promise<ToolResult> {
    const cal = calendarId ?? 'primary';
    const body: Record<string, unknown> = {
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
    };
    if (description) body.description = description;
    if (location) body.location = location;
    if (attendees) body.attendees = attendees.map(email => ({ email }));

    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(cal)}/events`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getEvent(calendarId?: string, eventId?: string): Promise<ToolResult> {
    const cal = calendarId ?? 'primary';
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(cal)}/events/${eventId}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateEvent(
    calendarId?: string,
    eventId?: string,
    summary?: string,
    start?: string,
    end?: string,
    description?: string,
    location?: string,
    attendees?: string[]
  ): Promise<ToolResult> {
    const cal = calendarId ?? 'primary';
    const body: Record<string, unknown> = {};
    if (summary !== undefined) body.summary = summary;
    if (description !== undefined) body.description = description;
    if (location !== undefined) body.location = location;
    if (start !== undefined) body.start = { dateTime: start };
    if (end !== undefined) body.end = { dateTime: end };
    if (attendees !== undefined) body.attendees = attendees.map(email => ({ email }));

    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(cal)}/events/${eventId}`,
      { method: 'PATCH', headers: this.headers, body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listCalendars(maxResults?: number, pageToken?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('maxResults', String(maxResults ?? 100));
    if (pageToken) params.append('pageToken', pageToken);

    const response = await fetch(
      `${this.baseUrl}/users/me/calendarList?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteEvent(calendarId?: string, eventId?: string): Promise<ToolResult> {
    const cal = calendarId ?? 'primary';
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(cal)}/events/${eventId}`,
      { method: 'DELETE', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, eventId }) }], isError: false };
  }

  private async queryFreeBusy(
    timeMin: string,
    timeMax: string,
    calendarIds: string[],
    timeZone?: string
  ): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      timeMin,
      timeMax,
      items: calendarIds.map(id => ({ id })),
    };
    if (timeZone) body.timeZone = timeZone;

    const response = await fetch(
      `${this.baseUrl}/freeBusy`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) }
    );
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Google Calendar returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
