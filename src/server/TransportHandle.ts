/**
 * @epicai/legion — Transport Handle
 * Minimal lifecycle interface returned by HTTP and REST transport binders.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export interface TransportHandle {
  /** Actual port the transport is bound to. */
  readonly port: number;
  /** Gracefully close the transport with a 5-second drain timeout. */
  close(): Promise<void>;
}
