/**
 * @epicai/legion/server — Public server API
 * Re-exports the multi-transport server building blocks.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export type { TransportHandle } from './TransportHandle.js';
export type { LegionState, AdapterEntry } from './LegionState.js';
export { loadLegionState } from './LegionState.js';
export { registerLegionTools } from './registerLegionTools.js';
export { bindStdio } from './transports/stdio.js';
export { bindHttp } from './transports/http.js';
export { bindRest } from './transports/rest.js';
