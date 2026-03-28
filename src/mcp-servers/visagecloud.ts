/**
 * VisageCloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VisageCloud MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://visagecloud.com
// Auth: Query parameters accessKey + secretKey on every request
// Docs: https://visagecloud.com/developer
// Spec: https://api.apis.guru/v2/specs/visagecloud.com/1.1/openapi.json
// Category: ai
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';

interface VisageCloudConfig {
  accessKey: string;
  secretKey: string;
  baseUrl?: string;
}

export class VisageCloudMCPServer {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: VisageCloudConfig) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://visagecloud.com';
  }

  static catalog() {
    return {
      name: 'visagecloud',
      displayName: 'VisageCloud',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'visagecloud', 'face recognition', 'facial analysis', 'biometrics', 'computer vision',
        'face detection', 'profile', 'collection', 'stream', 'classifier', 'svm',
        'attendance', 'presence', 'counting', 'analytics', 'identity',
      ],
      toolNames: [
        'get_account',
        'get_billing',
        'login',
        'compare_faces',
        'perform_detection',
        'perform_recognition',
        'retrieve_analysis',
        'list_latest_analyses',
        'count_individuals',
        'presence_timeseries',
        'presence_total',
        'get_classifier',
        'get_classifier_status',
        'add_svm_classifier',
        'remove_classifier',
        'list_collections',
        'add_collection',
        'get_collection',
        'delete_collection',
        'update_collection',
        'get_collection_profiles',
        'export_collection_csv',
        'repurpose_collection',
        'add_profile',
        'get_profile',
        'delete_profile',
        'update_profile',
        'get_enrollment_status',
        'map_faces_to_profile',
        'get_faces_from_profile',
        'remove_faces_from_profile',
        'get_classification_attributes',
        'map_classification_attributes',
        'remove_classification_attributes',
        'list_streams',
        'add_stream',
        'get_stream',
        'update_stream',
        'delete_stream',
        'start_stream',
        'stop_stream',
        'get_stream_frames',
        'get_frame_image',
        'get_stream_attendance',
        'cleanup_stream',
      ],
      description: 'VisageCloud: face recognition, detection, profiling, collections, streams, and presence analytics via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account ────────────────────────────────────────────────────────────
      {
        name: 'get_account',
        description: 'Get account information by accessKey and secretKey',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_billing',
        description: 'Get billing information for the account within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            start_date_time: { type: 'string', description: 'Start of billing period (ISO 8601)' },
            end_date_time: { type: 'string', description: 'End of billing period (ISO 8601)' },
            date_template: { type: 'string', description: 'Predefined date template (e.g. LAST_MONTH)' },
          },
        },
      },
      {
        name: 'login',
        description: 'Get account information including accessKey and secretKey by email and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Account email address' },
            password: { type: 'string', description: 'Account password' },
          },
          required: ['email', 'password'],
        },
      },
      // ── Analysis ───────────────────────────────────────────────────────────
      {
        name: 'compare_faces',
        description: 'Compare several faces identified by faceHash without depending on a collection',
        inputSchema: {
          type: 'object',
          properties: {
            face_hashes: { type: 'array', items: { type: 'string' }, description: 'List of faceHash values to compare' },
            show_details: { type: 'boolean', description: 'Include detailed comparison scores in response' },
          },
          required: ['face_hashes'],
        },
      },
      {
        name: 'perform_detection',
        description: 'Perform face detection on a given picture or picture URL',
        inputSchema: {
          type: 'object',
          properties: {
            picture_url: { type: 'string', description: 'URL of the image to analyze' },
            picture_data: { type: 'string', description: 'Base64-encoded image data' },
            store_analysis_picture: { type: 'boolean', description: 'Store the analysis picture for later retrieval' },
            store_face_pictures: { type: 'boolean', description: 'Store individual face crop pictures' },
            store_result: { type: 'boolean', description: 'Store the analysis result' },
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Collection IDs for context' },
          },
        },
      },
      {
        name: 'perform_recognition',
        description: 'Perform labeled face recognition on a given picture or picture URL against enrolled profiles',
        inputSchema: {
          type: 'object',
          properties: {
            picture_url: { type: 'string', description: 'URL of the image to recognize faces in' },
            picture_data: { type: 'string', description: 'Base64-encoded image data' },
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Collection IDs to match against' },
            store_analysis_picture: { type: 'boolean', description: 'Store the analysis picture' },
            store_face_pictures: { type: 'boolean', description: 'Store individual face crop pictures' },
            store_result: { type: 'boolean', description: 'Store the result' },
          },
        },
      },
      {
        name: 'retrieve_analysis',
        description: 'Retrieve a complete analysis object including detection and recognition results by analysisId',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_id: { type: 'string', description: 'Analysis ID to retrieve' },
          },
          required: ['analysis_id'],
        },
      },
      {
        name: 'list_latest_analyses',
        description: 'Retrieve the last N analysis operations for the current account',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of latest analyses to retrieve' },
          },
        },
      },
      // ── Analytics ──────────────────────────────────────────────────────────
      {
        name: 'count_individuals',
        description: 'Count distinct individuals in streams or collections over a time period',
        inputSchema: {
          type: 'object',
          properties: {
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Collection IDs to count in' },
            stream_ids: { type: 'array', items: { type: 'string' }, description: 'Stream IDs to count in' },
            start_date_time: { type: 'string', description: 'Start of counting period (ISO 8601)' },
            end_date_time: { type: 'string', description: 'End of counting period (ISO 8601)' },
          },
        },
      },
      {
        name: 'presence_timeseries',
        description: 'Show audience timeseries occurrences of each person over time for given streams',
        inputSchema: {
          type: 'object',
          properties: {
            stream_ids: { type: 'array', items: { type: 'string' }, description: 'Stream IDs to analyze' },
            start_date_time: { type: 'string', description: 'Start of time range (ISO 8601)' },
            end_date_time: { type: 'string', description: 'End of time range (ISO 8601)' },
          },
          required: ['stream_ids'],
        },
      },
      {
        name: 'presence_total',
        description: 'Show total presence — number of occurrences of each face for given streams',
        inputSchema: {
          type: 'object',
          properties: {
            stream_ids: { type: 'array', items: { type: 'string' }, description: 'Stream IDs to analyze' },
            start_date_time: { type: 'string', description: 'Start of time range (ISO 8601)' },
            end_date_time: { type: 'string', description: 'End of time range (ISO 8601)' },
          },
          required: ['stream_ids'],
        },
      },
      // ── Classifiers ────────────────────────────────────────────────────────
      {
        name: 'get_classifier',
        description: 'Get full details of a classifier by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Classifier ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_classifier_status',
        description: 'Get the training status of a classifier by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Classifier ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_svm_classifier',
        description: 'Create a new SVM classifier with given name and collection IDs',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the classifier' },
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Collection IDs to train on' },
            preprocessor: { type: 'string', description: 'Preprocessor type to apply before training' },
          },
          required: ['name'],
        },
      },
      {
        name: 'remove_classifier',
        description: 'Delete an existing classifier by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Classifier ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Collections ────────────────────────────────────────────────────────
      {
        name: 'list_collections',
        description: 'Retrieve all face collections for the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_collection',
        description: 'Create a new empty face collection with a given name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the collection' },
            preload: { type: 'boolean', description: 'Preload collection into memory on startup' },
            evictable: { type: 'boolean', description: 'Allow collection to be evicted from memory under pressure' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_collection',
        description: 'Retrieve an existing collection and its content by collection ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to retrieve' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete an existing collection with all associated profiles and face data',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to delete' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'update_collection',
        description: 'Update an existing collection — rename or change purposes',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to update' },
            name: { type: 'string', description: 'New collection name' },
            purposes: { type: 'array', items: { type: 'string' }, description: 'Updated list of collection purposes' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'get_collection_profiles',
        description: 'Get all profiles associated with a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'export_collection_csv',
        description: 'Export collection content as CSV for data analysis',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to export' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'repurpose_collection',
        description: 'Change the purpose of an existing collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to repurpose' },
            purposes: { type: 'array', items: { type: 'string' }, description: 'New purposes for the collection' },
          },
          required: ['collection_id', 'purposes'],
        },
      },
      // ── Profiles ───────────────────────────────────────────────────────────
      {
        name: 'add_profile',
        description: 'Create a new profile with no faces associated to it in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Collection ID to add the profile to' },
            external_id: { type: 'string', description: 'External identifier for the profile (your system ID)' },
            screen_name: { type: 'string', description: 'Display name for the profile' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'get_profile',
        description: 'Retrieve a profile by ID from a collection, optionally including associated faces',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to retrieve' },
            collection_id: { type: 'string', description: 'Collection ID the profile belongs to' },
            with_faces: { type: 'boolean', description: 'Include associated face hashes in response' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'delete_profile',
        description: 'Delete a profile and unmap all its associated faces from a collection',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to delete' },
            collection_id: { type: 'string', description: 'Collection ID the profile belongs to' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'update_profile',
        description: 'Update an existing profile — change external ID or screen name',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to update' },
            collection_id: { type: 'string', description: 'Collection ID the profile belongs to' },
            external_id: { type: 'string', description: 'Updated external identifier' },
            screen_name: { type: 'string', description: 'Updated display name' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'get_enrollment_status',
        description: 'Get the enrollment status of a profile — whether it has enough faces for recognition',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to check' },
            collection_id: { type: 'string', description: 'Collection ID the profile belongs to' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'map_faces_to_profile',
        description: 'Add (map) a list of faces identified by faceHashes to a profile in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            face_hashes: { type: 'array', items: { type: 'string' }, description: 'Face hash values to map to the profile' },
            profile_id: { type: 'string', description: 'Profile ID to add faces to' },
            collection_id: { type: 'string', description: 'Collection ID containing the profile' },
          },
          required: ['face_hashes', 'profile_id', 'collection_id'],
        },
      },
      {
        name: 'get_faces_from_profile',
        description: 'Get all faceHashes associated with a profile in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID to get faces for' },
            collection_id: { type: 'string', description: 'Collection ID the profile belongs to' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'remove_faces_from_profile',
        description: 'Remove (unmap) a list of faces identified by faceHashes from a profile',
        inputSchema: {
          type: 'object',
          properties: {
            face_hashes: { type: 'array', items: { type: 'string' }, description: 'Face hash values to remove from the profile' },
            profile_id: { type: 'string', description: 'Profile ID to remove faces from' },
            collection_id: { type: 'string', description: 'Collection ID containing the profile' },
          },
          required: ['face_hashes', 'profile_id', 'collection_id'],
        },
      },
      {
        name: 'get_classification_attributes',
        description: 'Get classification attributes mapped to a profile in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      {
        name: 'map_classification_attributes',
        description: 'Map classification attributes to a profile in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            collection_id: { type: 'string', description: 'Collection ID' },
            classification_attributes: { type: 'object', description: 'Key-value classification attributes to associate with the profile' },
          },
          required: ['profile_id', 'collection_id', 'classification_attributes'],
        },
      },
      {
        name: 'remove_classification_attributes',
        description: 'Remove classification attributes from a profile in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Profile ID' },
            collection_id: { type: 'string', description: 'Collection ID' },
          },
          required: ['profile_id', 'collection_id'],
        },
      },
      // ── Streams ────────────────────────────────────────────────────────────
      {
        name: 'list_streams',
        description: 'Show status of all streams from the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_stream',
        description: 'Create a new video stream with given name and URL for real-time face analysis',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name for the stream' },
            url: { type: 'string', description: 'Video stream URL (RTSP, HTTP, etc.)' },
            method: { type: 'string', description: 'Stream ingestion method' },
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Collection IDs to match faces against' },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'get_stream',
        description: 'Get an existing stream with a given stream ID',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to retrieve' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'update_stream',
        description: 'Update an existing stream — change name, URL, or collection associations',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to update' },
            name: { type: 'string', description: 'New display name' },
            url: { type: 'string', description: 'New stream URL' },
            collection_ids: { type: 'array', items: { type: 'string' }, description: 'Updated collection IDs' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'delete_stream',
        description: 'Delete an existing stream by ID',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to delete' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'start_stream',
        description: 'Start an existing stream to begin real-time face analysis',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to start' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'stop_stream',
        description: 'Stop an existing stream to pause real-time face analysis',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to stop' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'get_stream_frames',
        description: 'Get the last N processed frames from a stream, optionally filtered by collection',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID' },
            count: { type: 'number', description: 'Number of recent frames to retrieve' },
            collection_id: { type: 'string', description: 'Filter frames by collection ID' },
          },
          required: ['stream_id'],
        },
      },
      {
        name: 'get_frame_image',
        description: 'Get an individual frame image from a stream by timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID' },
            timestamp: { type: 'number', description: 'Timestamp of the frame to retrieve' },
          },
          required: ['stream_id', 'timestamp'],
        },
      },
      {
        name: 'get_stream_attendance',
        description: 'Get the last N recognized individuals from one or more streams',
        inputSchema: {
          type: 'object',
          properties: {
            stream_ids: { type: 'array', items: { type: 'string' }, description: 'Stream IDs to get attendance from' },
            count: { type: 'number', description: 'Number of recent recognized individuals to retrieve' },
          },
          required: ['stream_ids'],
        },
      },
      {
        name: 'cleanup_stream',
        description: 'Cleanup frames older than a specified timeframe from a stream',
        inputSchema: {
          type: 'object',
          properties: {
            stream_id: { type: 'string', description: 'Stream ID to clean up' },
            interval: { type: 'string', description: 'Age threshold — frames older than this will be deleted (e.g. 7d)' },
          },
          required: ['stream_id', 'interval'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account':                      return this.getAccount();
        case 'get_billing':                      return this.getBilling(args);
        case 'login':                            return this.login(args);
        case 'compare_faces':                    return this.compareFaces(args);
        case 'perform_detection':                return this.performDetection(args);
        case 'perform_recognition':              return this.performRecognition(args);
        case 'retrieve_analysis':                return this.retrieveAnalysis(args);
        case 'list_latest_analyses':             return this.listLatestAnalyses(args);
        case 'count_individuals':                return this.countIndividuals(args);
        case 'presence_timeseries':              return this.presenceTimeseries(args);
        case 'presence_total':                   return this.presenceTotal(args);
        case 'get_classifier':                   return this.getClassifier(args);
        case 'get_classifier_status':            return this.getClassifierStatus(args);
        case 'add_svm_classifier':               return this.addSvmClassifier(args);
        case 'remove_classifier':                return this.removeClassifier(args);
        case 'list_collections':                 return this.listCollections();
        case 'add_collection':                   return this.addCollection(args);
        case 'get_collection':                   return this.getCollection(args);
        case 'delete_collection':                return this.deleteCollection(args);
        case 'update_collection':                return this.updateCollection(args);
        case 'get_collection_profiles':          return this.getCollectionProfiles(args);
        case 'export_collection_csv':            return this.exportCollectionCsv(args);
        case 'repurpose_collection':             return this.repurposeCollection(args);
        case 'add_profile':                      return this.addProfile(args);
        case 'get_profile':                      return this.getProfile(args);
        case 'delete_profile':                   return this.deleteProfile(args);
        case 'update_profile':                   return this.updateProfile(args);
        case 'get_enrollment_status':            return this.getEnrollmentStatus(args);
        case 'map_faces_to_profile':             return this.mapFacesToProfile(args);
        case 'get_faces_from_profile':           return this.getFacesFromProfile(args);
        case 'remove_faces_from_profile':        return this.removeFacesFromProfile(args);
        case 'get_classification_attributes':    return this.getClassificationAttributes(args);
        case 'map_classification_attributes':    return this.mapClassificationAttributes(args);
        case 'remove_classification_attributes': return this.removeClassificationAttributes(args);
        case 'list_streams':                     return this.listStreams();
        case 'add_stream':                       return this.addStream(args);
        case 'get_stream':                       return this.getStream(args);
        case 'update_stream':                    return this.updateStream(args);
        case 'delete_stream':                    return this.deleteStream(args);
        case 'start_stream':                     return this.startStream(args);
        case 'stop_stream':                      return this.stopStream(args);
        case 'get_stream_frames':                return this.getStreamFrames(args);
        case 'get_frame_image':                  return this.getFrameImage(args);
        case 'get_stream_attendance':            return this.getStreamAttendance(args);
        case 'cleanup_stream':                   return this.cleanupStream(args);
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

  private buildQueryString(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    const auth = { accessKey: this.accessKey, secretKey: this.secretKey };
    const merged = { ...auth, ...params };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== null) {
        if (Array.isArray(v)) {
          for (const item of v) qs.append(k, String(item));
        } else {
          qs.set(k, String(v));
        }
      }
    }
    return qs.toString() ? `?${qs.toString()}` : '';
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
    queryParams: Record<string, unknown> = {},
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const qs = this.buildQueryString(queryParams);
    const url = `${this.baseUrl}${path}${qs}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    };
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

  // ── Account ────────────────────────────────────────────────────────────────

  private getAccount(): Promise<ToolResult> {
    return this.request('GET', '/rest/v1.1/account/account');
  }

  private getBilling(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, unknown> = {};
    if (args.start_date_time) q.startDateTime = args.start_date_time;
    if (args.end_date_time) q.endDateTime = args.end_date_time;
    if (args.date_template) q.dateTemplate = args.date_template;
    return this.request('GET', '/rest/v1.1/account/billing', q);
  }

  private login(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password)
      return Promise.resolve({ content: [{ type: 'text', text: 'email and password are required' }], isError: true });
    return this.request('POST', '/rest/v1.1/account/login', { email: args.email as string, password: args.password as string });
  }

  // ── Analysis ───────────────────────────────────────────────────────────────

  private compareFaces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.face_hashes)
      return Promise.resolve({ content: [{ type: 'text', text: 'face_hashes is required' }], isError: true });
    const q: Record<string, unknown> = { faceHashes: args.face_hashes };
    if (args.show_details !== undefined) q.showDetails = args.show_details;
    return this.request('GET', '/rest/v1.1/analysis/compare', q);
  }

  private performDetection(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, unknown> = {};
    if (args.store_analysis_picture !== undefined) q.storeAnalysisPicture = args.store_analysis_picture;
    if (args.store_face_pictures !== undefined) q.storeFacePictures = args.store_face_pictures;
    if (args.store_result !== undefined) q.storeResult = args.store_result;
    const body: Record<string, unknown> = {};
    if (args.picture_url) body.pictureURL = args.picture_url;
    if (args.picture_data) body.picture = args.picture_data;
    if (args.collection_ids) body.collectionIds = args.collection_ids;
    return this.request('POST', '/rest/v1.1/analysis/detection', q, body);
  }

  private performRecognition(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, unknown> = {};
    if (args.store_analysis_picture !== undefined) q.storeAnalysisPicture = args.store_analysis_picture;
    if (args.store_face_pictures !== undefined) q.storeFacePictures = args.store_face_pictures;
    if (args.store_result !== undefined) q.storeResult = args.store_result;
    const body: Record<string, unknown> = {};
    if (args.picture_url) body.pictureURL = args.picture_url;
    if (args.picture_data) body.picture = args.picture_data;
    if (args.collection_ids) body.collectionIds = args.collection_ids;
    return this.request('POST', '/rest/v1.1/analysis/recognition', q, body);
  }

  private retrieveAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.analysis_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'analysis_id is required' }], isError: true });
    return this.request('GET', '/rest/v1.1/analysis/retrieve', { analysisId: args.analysis_id });
  }

  private listLatestAnalyses(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, unknown> = {};
    if (args.count) q.count = args.count;
    return this.request('GET', '/rest/v1.1/analysis/listLatest', q);
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  private countIndividuals(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.collection_ids) body.collectionIds = args.collection_ids;
    if (args.stream_ids) body.streamIds = args.stream_ids;
    if (args.start_date_time) body.startDateTime = args.start_date_time;
    if (args.end_date_time) body.endDateTime = args.end_date_time;
    return this.request('POST', '/rest/v1.1/analytics/counting', {}, body);
  }

  private presenceTimeseries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_ids)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_ids is required' }], isError: true });
    const body: Record<string, unknown> = { streamIds: args.stream_ids };
    if (args.start_date_time) body.startDateTime = args.start_date_time;
    if (args.end_date_time) body.endDateTime = args.end_date_time;
    return this.request('POST', '/rest/v1.1/analytics/presence/timeseries', {}, body);
  }

  private presenceTotal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_ids)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_ids is required' }], isError: true });
    const body: Record<string, unknown> = { streamIds: args.stream_ids };
    if (args.start_date_time) body.startDateTime = args.start_date_time;
    if (args.end_date_time) body.endDateTime = args.end_date_time;
    return this.request('POST', '/rest/v1.1/analytics/presence/total', {}, body);
  }

  // ── Classifiers ────────────────────────────────────────────────────────────

  private getClassifier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id)
      return Promise.resolve({ content: [{ type: 'text', text: 'id is required' }], isError: true });
    return this.request('GET', '/rest/v1.1/classifier/svm', { id: args.id });
  }

  private getClassifierStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id)
      return Promise.resolve({ content: [{ type: 'text', text: 'id is required' }], isError: true });
    return this.request('GET', '/rest/v1.1/classifier/svm/status', { id: args.id });
  }

  private addSvmClassifier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name)
      return Promise.resolve({ content: [{ type: 'text', text: 'name is required' }], isError: true });
    const q: Record<string, unknown> = { name: args.name };
    if (args.collection_ids) q.collectionIds = args.collection_ids;
    if (args.preprocessor) q.preprocessor = args.preprocessor;
    return this.request('POST', '/rest/v1.1/classifier/svm', q);
  }

  private removeClassifier(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id)
      return Promise.resolve({ content: [{ type: 'text', text: 'id is required' }], isError: true });
    return this.request('DELETE', '/rest/v1.1/classifier/svm', { id: args.id });
  }

  // ── Collections ────────────────────────────────────────────────────────────

  private listCollections(): Promise<ToolResult> {
    return this.request('GET', '/rest/v1.1/collection/');
  }

  private addCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name)
      return Promise.resolve({ content: [{ type: 'text', text: 'name is required' }], isError: true });
    const q: Record<string, unknown> = { name: args.name };
    if (args.preload !== undefined) q.preload = args.preload;
    if (args.evictable !== undefined) q.evictable = args.evictable;
    return this.request('POST', '/rest/v1.1/collection/', q);
  }

  private getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    return this.request('GET', '/rest/v1.1/collection/collection', { collectionId: args.collection_id });
  }

  private deleteCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    return this.request('DELETE', '/rest/v1.1/collection/collection', { collectionId: args.collection_id });
  }

  private updateCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    const q: Record<string, unknown> = {};
    if (args.name) q.name = args.name;
    if (args.purposes) q.purposes = args.purposes;
    return this.request('PATCH', `/rest/v1.1/collection/${encodeURIComponent(args.collection_id as string)}`, q);
  }

  private getCollectionProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    return this.request('GET', `/rest/v1.1/collection/${encodeURIComponent(args.collection_id as string)}/profile`);
  }

  private exportCollectionCsv(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    return this.request('GET', '/rest/v1.1/collection/export/csv', { collectionId: args.collection_id });
  }

  private repurposeCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.purposes)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id and purposes are required' }], isError: true });
    return this.request('PUT', '/rest/v1.1/collection/purpose', { collectionId: args.collection_id, purposes: args.purposes });
  }

  // ── Profiles ───────────────────────────────────────────────────────────────

  private addProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'collection_id is required' }], isError: true });
    const q: Record<string, unknown> = { collectionId: args.collection_id };
    if (args.external_id) q.externalId = args.external_id;
    if (args.screen_name) q.screenName = args.screen_name;
    return this.request('POST', '/rest/v1.1/profile/profile', q);
  }

  private getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    const q: Record<string, unknown> = { collectionId: args.collection_id };
    if (args.with_faces !== undefined) q.withFaces = args.with_faces;
    return this.request('GET', `/rest/v1.1/profile/${encodeURIComponent(args.profile_id as string)}`, q);
  }

  private deleteProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    return this.request('DELETE', '/rest/v1.1/profile/profile', { collectionId: args.collection_id, profileId: args.profile_id });
  }

  private updateProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    const q: Record<string, unknown> = { collectionId: args.collection_id };
    if (args.external_id) q.externalId = args.external_id;
    if (args.screen_name) q.screenName = args.screen_name;
    return this.request('PATCH', `/rest/v1.1/profile/${encodeURIComponent(args.profile_id as string)}`, q);
  }

  private getEnrollmentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    return this.request('GET', '/rest/v1.1/profile/enrollmentStatus', { profileId: args.profile_id, collectionId: args.collection_id });
  }

  private mapFacesToProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.face_hashes || !args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'face_hashes, profile_id, and collection_id are required' }], isError: true });
    return this.request('POST', '/rest/v1.1/profile/map', { faceHashes: args.face_hashes, profileId: args.profile_id, collectionId: args.collection_id });
  }

  private getFacesFromProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    return this.request('GET', '/rest/v1.1/profile/map', { profileId: args.profile_id, collectionId: args.collection_id });
  }

  private removeFacesFromProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.face_hashes || !args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'face_hashes, profile_id, and collection_id are required' }], isError: true });
    return this.request('DELETE', '/rest/v1.1/profile/map', { faceHashes: args.face_hashes, profileId: args.profile_id, collectionId: args.collection_id });
  }

  private getClassificationAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    return this.request('GET', '/rest/v1.1/profile/classificationAttributes', { profileId: args.profile_id, collectionId: args.collection_id });
  }

  private mapClassificationAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id || !args.classification_attributes)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id, collection_id, and classification_attributes are required' }], isError: true });
    return this.request('PUT', '/rest/v1.1/profile/classificationAttributes', { profileId: args.profile_id, collectionId: args.collection_id, classificationAttributes: args.classification_attributes });
  }

  private removeClassificationAttributes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.collection_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'profile_id and collection_id are required' }], isError: true });
    return this.request('DELETE', '/rest/v1.1/profile/classificationAttributes', { profileId: args.profile_id, collectionId: args.collection_id });
  }

  // ── Streams ────────────────────────────────────────────────────────────────

  private listStreams(): Promise<ToolResult> {
    return this.request('GET', '/rest/v1.1/stream/all');
  }

  private addStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.url)
      return Promise.resolve({ content: [{ type: 'text', text: 'name and url are required' }], isError: true });
    const q: Record<string, unknown> = { name: args.name, url: args.url };
    if (args.method) q.method = args.method;
    if (args.collection_ids) q.collectionIds = args.collection_ids;
    return this.request('POST', '/rest/v1.1/stream/stream', q);
  }

  private getStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    return this.request('GET', `/rest/v1.1/stream/${encodeURIComponent(args.stream_id as string)}`);
  }

  private updateStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    const q: Record<string, unknown> = {};
    if (args.name) q.name = args.name;
    if (args.url) q.url = args.url;
    if (args.collection_ids) q.collectionIds = args.collection_ids;
    return this.request('PATCH', `/rest/v1.1/stream/${encodeURIComponent(args.stream_id as string)}`, q);
  }

  private deleteStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    return this.request('DELETE', `/rest/v1.1/stream/${encodeURIComponent(args.stream_id as string)}`);
  }

  private startStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    return this.request('PATCH', '/rest/v1.1/stream/start', { streamId: args.stream_id });
  }

  private stopStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    return this.request('PATCH', '/rest/v1.1/stream/stop', { streamId: args.stream_id });
  }

  private getStreamFrames(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id is required' }], isError: true });
    const q: Record<string, unknown> = { streamId: args.stream_id };
    if (args.count) q.count = args.count;
    if (args.collection_id) q.collectionId = args.collection_id;
    return this.request('GET', '/rest/v1.1/stream/frames', q);
  }

  private getFrameImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id || !args.timestamp)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id and timestamp are required' }], isError: true });
    return this.request('GET', '/rest/v1.1/stream/frameImage', { streamId: args.stream_id, timestamp: args.timestamp });
  }

  private getStreamAttendance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_ids)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_ids is required' }], isError: true });
    const q: Record<string, unknown> = { streamIds: args.stream_ids };
    if (args.count) q.count = args.count;
    return this.request('GET', '/rest/v1.1/stream/attendance', q);
  }

  private cleanupStream(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stream_id || !args.interval)
      return Promise.resolve({ content: [{ type: 'text', text: 'stream_id and interval are required' }], isError: true });
    return this.request('PATCH', '/rest/v1.1/stream/cleanup', { streamId: args.stream_id, interval: args.interval });
  }
}
