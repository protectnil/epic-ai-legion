/**
 * Netatmo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Netatmo MCP server was found on GitHub as of March 2026.
//
// Base URL: https://api.netatmo.net/api
// Auth: OAuth2 authorization_code or password flow. Access token passed as Bearer in Authorization header.
//   Scopes: read_station, read_thermostat, write_thermostat, read_camera, access_camera,
//           write_camera, read_homecoach
// Docs: https://dev.netatmo.com/apidocumentation
// Rate limits: 500 requests per 10 seconds, 10,000 requests per hour per user

import { ToolDefinition, ToolResult } from './types.js';

interface NetatmoConfig {
  /** OAuth2 access token obtained via Netatmo authorization flow */
  accessToken: string;
  /** Base URL override (default: https://api.netatmo.net/api) */
  baseUrl?: string;
}

export class NetatmoMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NetatmoConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.netatmo.net/api';
  }

  static catalog() {
    return {
      name: 'netatmo',
      displayName: 'Netatmo',
      version: '1.0.0',
      category: 'iot' as const,
      keywords: [
        'netatmo', 'iot', 'weather', 'station', 'thermostat', 'camera', 'home', 'smart-home',
        'temperature', 'humidity', 'co2', 'air-quality', 'schedule', 'heating', 'person',
        'security', 'sensor', 'measurement', 'indoor', 'outdoor', 'homecoach',
      ],
      toolNames: [
        'get_user',
        'get_stations_data',
        'get_homecoach_data',
        'get_measure',
        'get_public_data',
        'get_device_list',
        'get_thermostats_data',
        'get_therm_state',
        'set_therm_point',
        'create_new_schedule',
        'switch_schedule',
        'sync_schedule',
        'get_home_data',
        'get_events_until',
        'get_next_events',
        'get_last_event_of',
        'get_camera_picture',
        'set_persons_away',
        'set_persons_home',
        'add_webhook',
        'drop_webhook',
        'get_partner_devices',
      ],
      description: 'Smart home IoT: read weather stations, thermostats, cameras, and air quality sensors; control heating schedules, set thermostat points, and manage home presence.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── User ────────────────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Get the profile and preferences of the authenticated Netatmo user',
        inputSchema: { type: 'object', properties: {} },
      },

      // ── Weather Stations ─────────────────────────────────────────────────────
      {
        name: 'get_stations_data',
        description: 'Get data from Netatmo weather stations including temperature, humidity, CO2, noise, and pressure readings',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the weather station to retrieve. Omit to retrieve all stations.',
            },
            get_favorites: {
              type: 'boolean',
              description: 'Whether to include favorite weather stations shared by others (default: false)',
            },
          },
        },
      },

      // ── Home Coach ───────────────────────────────────────────────────────────
      {
        name: 'get_homecoach_data',
        description: 'Get data from Netatmo Healthy Home Coach including CO2, humidity, noise, temperature, and health index',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the Home Coach device to retrieve. Omit to retrieve all Home Coach devices.',
            },
          },
        },
      },

      // ── Measurements ─────────────────────────────────────────────────────────
      {
        name: 'get_measure',
        description: 'Get historical measurements from a weather station or module at a specified time scale and type',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the weather station',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of a specific module. Omit to get base station measurements.',
            },
            scale: {
              type: 'string',
              description: 'Time interval between measurements: max (real-time), 30min, 1hour, 3hours, 1day, 1week, 1month',
            },
            type: {
              type: 'array',
              items: { type: 'string' },
              description: 'Measurement types to retrieve: Temperature, CO2, Humidity, Pressure, Noise, Rain, WindStrength, WindAngle, GustStrength, GustAngle, HealthIdx',
            },
            date_begin: {
              type: 'number',
              description: 'Start timestamp (Unix UTC) for measurements. Defaults to 24h ago.',
            },
            date_end: {
              type: 'number',
              description: 'End timestamp (Unix UTC) for measurements. Defaults to now.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of measurements to return (default and max: 1024)',
            },
            optimize: {
              type: 'boolean',
              description: 'If true, returns compact array format suitable for mobile (default: false)',
            },
            real_time: {
              type: 'boolean',
              description: 'If true, returns the exact measurement timestamp rather than the aggregated interval start',
            },
          },
          required: ['device_id', 'scale', 'type'],
        },
      },

      // ── Public Weather Data ──────────────────────────────────────────────────
      {
        name: 'get_public_data',
        description: 'Get weather data from public Netatmo stations within a geographic bounding box',
        inputSchema: {
          type: 'object',
          properties: {
            lat_ne: {
              type: 'number',
              description: 'Latitude of the north-east corner of the bounding box',
            },
            lon_ne: {
              type: 'number',
              description: 'Longitude of the north-east corner of the bounding box',
            },
            lat_sw: {
              type: 'number',
              description: 'Latitude of the south-west corner of the bounding box',
            },
            lon_sw: {
              type: 'number',
              description: 'Longitude of the south-west corner of the bounding box',
            },
            required_data: {
              type: 'string',
              description: 'Filter stations by available measurement types: Temperature, Humidity, Pressure, Wind, Rain, CO2',
            },
            filter: {
              type: 'boolean',
              description: 'If true, exclude stations with abnormal data (default: false)',
            },
          },
          required: ['lat_ne', 'lon_ne', 'lat_sw', 'lon_sw'],
        },
      },

      // ── Device List ──────────────────────────────────────────────────────────
      {
        name: 'get_device_list',
        description: 'Get the full list of devices associated with the user account, optionally filtered by app type',
        inputSchema: {
          type: 'object',
          properties: {
            app_type: {
              type: 'string',
              description: 'Filter by application type: app_station (weather), app_thermostat (heating)',
            },
            device_id: {
              type: 'string',
              description: 'MAC address of a specific device to retrieve',
            },
            get_favorites: {
              type: 'boolean',
              description: 'Whether to include favorite devices shared by others (default: false)',
            },
          },
        },
      },

      // ── Thermostats ──────────────────────────────────────────────────────────
      {
        name: 'get_thermostats_data',
        description: 'Get current state and schedule data for Netatmo thermostat relays and thermostat modules',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay. Omit to retrieve all thermostats.',
            },
          },
        },
      },
      {
        name: 'get_therm_state',
        description: 'Get the current setpoint, schedule, and measured temperature for a specific thermostat module',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of the thermostat module',
            },
          },
          required: ['device_id', 'module_id'],
        },
      },
      {
        name: 'set_therm_point',
        description: 'Set the thermostat setpoint mode and temperature for a thermostat module',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of the thermostat module',
            },
            setpoint_mode: {
              type: 'string',
              description: 'Setpoint mode: program (follow schedule), away, hg (frost guard), manual (fixed temperature), off, max',
            },
            setpoint_endtime: {
              type: 'number',
              description: 'Unix timestamp when manual or max setpoint expires (required for manual and max modes)',
            },
            setpoint_temp: {
              type: 'number',
              description: 'Target temperature in degrees Celsius (required for manual mode)',
            },
          },
          required: ['device_id', 'module_id', 'setpoint_mode'],
        },
      },

      // ── Thermostat Schedules ──────────────────────────────────────────────────
      {
        name: 'create_new_schedule',
        description: 'Create a new heating schedule for a thermostat with defined time slots and temperature zones',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of the thermostat module',
            },
            therm_program: {
              type: 'object',
              description: 'Schedule definition object with name, zones (temperature targets), and timetable (weekly slot assignments)',
            },
          },
          required: ['device_id', 'module_id', 'therm_program'],
        },
      },
      {
        name: 'switch_schedule',
        description: 'Switch the active heating schedule for a thermostat to a different existing schedule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of the thermostat module',
            },
            schedule_id: {
              type: 'string',
              description: 'ID of the schedule to activate (obtain from get_thermostats_data)',
            },
          },
          required: ['device_id', 'module_id', 'schedule_id'],
        },
      },
      {
        name: 'sync_schedule',
        description: 'Update an existing heating schedule with new zone temperatures and timetable slots',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'MAC address of the thermostat relay',
            },
            module_id: {
              type: 'string',
              description: 'MAC address of the thermostat module',
            },
            therm_program: {
              type: 'object',
              description: 'Updated schedule definition with program_id, name, zones, and timetable',
            },
          },
          required: ['device_id', 'module_id', 'therm_program'],
        },
      },

      // ── Camera / Home Security ────────────────────────────────────────────────
      {
        name: 'get_home_data',
        description: 'Get home security data including camera status, persons detected, and recent security events',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home to retrieve data for. Omit to retrieve all homes.',
            },
            size: {
              type: 'number',
              description: 'Number of recent events to include (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_events_until',
        description: 'Get all camera security events for a home up to a specific event ID',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home',
            },
            event_id: {
              type: 'string',
              description: 'Retrieve events that occurred before this event ID',
            },
          },
          required: ['home_id', 'event_id'],
        },
      },
      {
        name: 'get_next_events',
        description: 'Get camera security events for a home that occurred after a specific event ID',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home',
            },
            event_id: {
              type: 'string',
              description: 'Retrieve events that occurred after this event ID',
            },
            size: {
              type: 'number',
              description: 'Number of events to retrieve (default: 30)',
            },
          },
          required: ['home_id', 'event_id'],
        },
      },
      {
        name: 'get_last_event_of',
        description: 'Get the most recent camera event for a specific tracked person in a home',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home',
            },
            person_id: {
              type: 'string',
              description: 'ID of the person to retrieve the last event for',
            },
            offset: {
              type: 'number',
              description: 'Number of events to skip for pagination (default: 0)',
            },
          },
          required: ['home_id', 'person_id'],
        },
      },
      {
        name: 'get_camera_picture',
        description: 'Get a specific camera snapshot image by image ID and key from a security event',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: {
              type: 'string',
              description: 'Image ID obtained from a camera event',
            },
            key: {
              type: 'string',
              description: 'Access key for the image, obtained from a camera event',
            },
          },
          required: ['image_id', 'key'],
        },
      },

      // ── Presence / Persons ────────────────────────────────────────────────────
      {
        name: 'set_persons_away',
        description: 'Mark one or all persons as away from home to update presence status and camera behavior',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home',
            },
            person_id: {
              type: 'string',
              description: 'ID of the specific person to mark as away. Omit to mark all persons as away.',
            },
          },
          required: ['home_id'],
        },
      },
      {
        name: 'set_persons_home',
        description: 'Mark one or more persons as home to update presence status and camera behavior',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'ID of the home',
            },
            person_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of person IDs to mark as home',
            },
          },
          required: ['home_id', 'person_ids'],
        },
      },

      // ── Webhooks ─────────────────────────────────────────────────────────────
      {
        name: 'add_webhook',
        description: 'Register a webhook URL to receive real-time Netatmo event notifications for a specific app type',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST notifications',
            },
            app_type: {
              type: 'string',
              description: 'App type to receive events for: app_camera',
            },
          },
          required: ['url', 'app_type'],
        },
      },
      {
        name: 'drop_webhook',
        description: 'Unregister the current webhook for a Netatmo app type to stop receiving event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            app_type: {
              type: 'string',
              description: 'App type whose webhook to remove: app_camera',
            },
          },
          required: ['app_type'],
        },
      },

      // ── Partner ──────────────────────────────────────────────────────────────
      {
        name: 'get_partner_devices',
        description: 'Get the list of devices associated with the developer partner application',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':             return await this.getUser();
        case 'get_stations_data':    return await this.getStationsData(args);
        case 'get_homecoach_data':   return await this.getHomecoachData(args);
        case 'get_measure':          return await this.getMeasure(args);
        case 'get_public_data':      return await this.getPublicData(args);
        case 'get_device_list':      return await this.getDeviceList(args);
        case 'get_thermostats_data': return await this.getThermostatsData(args);
        case 'get_therm_state':      return await this.getThermState(args);
        case 'set_therm_point':      return await this.setThermPoint(args);
        case 'create_new_schedule':  return await this.createNewSchedule(args);
        case 'switch_schedule':      return await this.switchSchedule(args);
        case 'sync_schedule':        return await this.syncSchedule(args);
        case 'get_home_data':        return await this.getHomeData(args);
        case 'get_events_until':     return await this.getEventsUntil(args);
        case 'get_next_events':      return await this.getNextEvents(args);
        case 'get_last_event_of':    return await this.getLastEventOf(args);
        case 'get_camera_picture':   return await this.getCameraPicture(args);
        case 'set_persons_away':     return await this.setPersonsAway(args);
        case 'set_persons_home':     return await this.setPersonsHome(args);
        case 'add_webhook':          return await this.addWebhook(args);
        case 'drop_webhook':         return await this.dropWebhook(args);
        case 'get_partner_devices':  return await this.getPartnerDevices();
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private truncate(text: string): string {
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private async fetchGet(endpoint: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          qs.set(key, value.join(','));
        } else {
          qs.set(key, String(value));
        }
      }
    }
    const url = `${this.baseUrl}${endpoint}${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await fetch(url, { headers: this.headers() });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    const out = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: this.truncate(out) }],
      isError: !response.ok,
    };
  }

  private async fetchPost(endpoint: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          qs.set(key, JSON.stringify(value));
        } else {
          qs.set(key, String(value));
        }
      }
    }
    const url = `${this.baseUrl}${endpoint}?${qs.toString()}`;
    const response = await fetch(url, { method: 'POST', headers: this.headers() });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    const out = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: this.truncate(out) }],
      isError: !response.ok,
    };
  }

  private async getUser(): Promise<ToolResult> {
    return this.fetchGet('/getuser');
  }

  private async getStationsData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/getstationsdata', {
      device_id: args.device_id,
      get_favorites: args.get_favorites,
    });
  }

  private async getHomecoachData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/gethomecoachsdata', { device_id: args.device_id });
  }

  private async getMeasure(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) {
      return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    }
    if (!args.scale) {
      return { content: [{ type: 'text', text: 'scale is required' }], isError: true };
    }
    if (!args.type) {
      return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    }
    const typeVal = Array.isArray(args.type) ? (args.type as string[]).join(',') : String(args.type);
    return this.fetchGet('/getmeasure', {
      device_id: args.device_id,
      module_id: args.module_id,
      scale: args.scale,
      type: typeVal,
      date_begin: args.date_begin,
      date_end: args.date_end,
      limit: args.limit,
      optimize: args.optimize,
      real_time: args.real_time,
    });
  }

  private async getPublicData(args: Record<string, unknown>): Promise<ToolResult> {
    for (const field of ['lat_ne', 'lon_ne', 'lat_sw', 'lon_sw']) {
      if (args[field] === undefined || args[field] === null) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    return this.fetchGet('/getpublicdata', {
      lat_ne: args.lat_ne,
      lon_ne: args.lon_ne,
      lat_sw: args.lat_sw,
      lon_sw: args.lon_sw,
      required_data: args.required_data,
      filter: args.filter,
    });
  }

  private async getDeviceList(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/devicelist', {
      app_type: args.app_type,
      device_id: args.device_id,
      get_favorites: args.get_favorites,
    });
  }

  private async getThermostatsData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/getthermostatsdata', { device_id: args.device_id });
  }

  private async getThermState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.module_id) {
      return { content: [{ type: 'text', text: 'device_id and module_id are required' }], isError: true };
    }
    return this.fetchGet('/getthermstate', {
      device_id: args.device_id,
      module_id: args.module_id,
    });
  }

  private async setThermPoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.module_id || !args.setpoint_mode) {
      return { content: [{ type: 'text', text: 'device_id, module_id, and setpoint_mode are required' }], isError: true };
    }
    return this.fetchPost('/setthermpoint', {
      device_id: args.device_id,
      module_id: args.module_id,
      setpoint_mode: args.setpoint_mode,
      setpoint_endtime: args.setpoint_endtime,
      setpoint_temp: args.setpoint_temp,
    });
  }

  private async createNewSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.module_id || !args.therm_program) {
      return { content: [{ type: 'text', text: 'device_id, module_id, and therm_program are required' }], isError: true };
    }
    return this.fetchPost('/createnewschedule', {
      device_id: args.device_id,
      module_id: args.module_id,
      therm_program: args.therm_program,
    });
  }

  private async switchSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.module_id || !args.schedule_id) {
      return { content: [{ type: 'text', text: 'device_id, module_id, and schedule_id are required' }], isError: true };
    }
    return this.fetchPost('/switchschedule', {
      device_id: args.device_id,
      module_id: args.module_id,
      schedule_id: args.schedule_id,
    });
  }

  private async syncSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.module_id || !args.therm_program) {
      return { content: [{ type: 'text', text: 'device_id, module_id, and therm_program are required' }], isError: true };
    }
    return this.fetchPost('/syncschedule', {
      device_id: args.device_id,
      module_id: args.module_id,
      therm_program: args.therm_program,
    });
  }

  private async getHomeData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/gethomedata', {
      home_id: args.home_id,
      size: args.size,
    });
  }

  private async getEventsUntil(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_id || !args.event_id) {
      return { content: [{ type: 'text', text: 'home_id and event_id are required' }], isError: true };
    }
    return this.fetchGet('/geteventsuntil', {
      home_id: args.home_id,
      event_id: args.event_id,
    });
  }

  private async getNextEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_id || !args.event_id) {
      return { content: [{ type: 'text', text: 'home_id and event_id are required' }], isError: true };
    }
    return this.fetchGet('/getnextevents', {
      home_id: args.home_id,
      event_id: args.event_id,
      size: args.size,
    });
  }

  private async getLastEventOf(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_id || !args.person_id) {
      return { content: [{ type: 'text', text: 'home_id and person_id are required' }], isError: true };
    }
    return this.fetchGet('/getlasteventof', {
      home_id: args.home_id,
      person_id: args.person_id,
      offset: args.offset,
    });
  }

  private async getCameraPicture(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image_id || !args.key) {
      return { content: [{ type: 'text', text: 'image_id and key are required' }], isError: true };
    }
    return this.fetchGet('/getcamerapicture', {
      image_id: args.image_id,
      key: args.key,
    });
  }

  private async setPersonsAway(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_id) {
      return { content: [{ type: 'text', text: 'home_id is required' }], isError: true };
    }
    return this.fetchPost('/setpersonsaway', {
      home_id: args.home_id,
      person_id: args.person_id,
    });
  }

  private async setPersonsHome(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_id || !args.person_ids) {
      return { content: [{ type: 'text', text: 'home_id and person_ids are required' }], isError: true };
    }
    const ids = Array.isArray(args.person_ids)
      ? (args.person_ids as string[]).join(',')
      : String(args.person_ids);
    return this.fetchPost('/setpersonshome', {
      home_id: args.home_id,
      person_ids: ids,
    });
  }

  private async addWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url || !args.app_type) {
      return { content: [{ type: 'text', text: 'url and app_type are required' }], isError: true };
    }
    return this.fetchGet('/addwebhook', {
      url: args.url,
      app_type: args.app_type,
    });
  }

  private async dropWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.app_type) {
      return { content: [{ type: 'text', text: 'app_type is required' }], isError: true };
    }
    return this.fetchGet('/dropwebhook', { app_type: args.app_type });
  }

  private async getPartnerDevices(): Promise<ToolResult> {
    return this.fetchGet('/partnerdevices');
  }
}
