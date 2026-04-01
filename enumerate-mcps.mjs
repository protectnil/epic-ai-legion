import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync, writeFileSync } from 'fs';

const TIMEOUT = 10000;
const registry = JSON.parse(readFileSync('mcp-registry.json', 'utf-8'));
const mcpOnly = registry.filter(r => r.type === 'mcp');

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms));
}

async function testHTTP(url, id) {
  let client;
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url));
    client = new Client({ name: 'legion-enum', version: '1.0' }, { capabilities: {} });
    await Promise.race([client.connect(transport), timeout(TIMEOUT)]);
    const result = await Promise.race([client.listTools(), timeout(TIMEOUT)]);
    const tools = result.tools || [];
    try { await client.close(); } catch {}
    return { id, status: 'OK', toolCount: tools.length, tools: tools.map(t => t.name) };
  } catch (err) {
    try { if (client) await client.close(); } catch {}
    return { id, status: 'FAIL', toolCount: 0, error: (err.message || '').slice(0, 100) };
  }
}

async function testStdio(pkg, id) {
  let client, transport;
  try {
    transport = new StdioClientTransport({ command: 'npx', args: ['-y', pkg] });
    client = new Client({ name: 'legion-enum', version: '1.0' }, { capabilities: {} });
    await Promise.race([client.connect(transport), timeout(30000)]);
    const result = await Promise.race([client.listTools(), timeout(TIMEOUT)]);
    const tools = result.tools || [];
    try { await client.close(); } catch {}
    return { id, status: 'OK', toolCount: tools.length, tools: tools.map(t => t.name), package: pkg };
  } catch (err) {
    try { if (client) await client.close(); } catch {}
    try { if (transport) await transport.close(); } catch {}
    return { id, status: 'FAIL', toolCount: 0, error: (err.message || '').slice(0, 100), package: pkg };
  }
}

async function main() {
  const httpEntries = mcpOnly.filter(r => (r.mcp?.transport === 'streamable-http' || r.mcp?.transport === 'sse') && r.mcp?.url);
  const stdioEntries = mcpOnly.filter(r => r.mcp?.transport === 'stdio' && r.mcp?.packageName);
  
  console.log('HTTP MCPs to test:', httpEntries.length);
  console.log('Stdio MCPs to test:', stdioEntries.length);
  
  const results = { http: [], stdio: [], summary: {} };
  let httpOk = 0, httpFail = 0;
  
  // HTTP — batch of 5 concurrent
  for (let i = 0; i < httpEntries.length; i += 5) {
    const batch = httpEntries.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(r => testHTTP(r.mcp.url, r.id)));
    for (const r of batchResults) {
      results.http.push(r);
      if (r.status === 'OK') httpOk++;
      else httpFail++;
    }
    if ((i + 5) % 25 === 0 || i + 5 >= httpEntries.length) {
      console.log('  HTTP: ' + Math.min(i + 5, httpEntries.length) + '/' + httpEntries.length + ' | OK: ' + httpOk + ' FAIL: ' + httpFail);
    }
  }
  
  let stdioOk = 0, stdioFail = 0;
  
  // Stdio — sequential (each spawns a process)
  for (let i = 0; i < stdioEntries.length; i++) {
    const r = stdioEntries[i];
    const result = await testStdio(r.mcp.packageName, r.id);
    results.stdio.push(result);
    if (result.status === 'OK') stdioOk++;
    else stdioFail++;
    console.log('  Stdio: ' + (i + 1) + '/' + stdioEntries.length + ' | ' + r.id + ': ' + result.status + (result.toolCount ? ' (' + result.toolCount + ' tools)' : ''));
  }
  
  results.summary = { httpTotal: httpEntries.length, httpOk, httpFail, stdioTotal: stdioEntries.length, stdioOk, stdioFail };
  
  writeFileSync('/tmp/mcp-enumeration.json', JSON.stringify(results, null, 2));
  console.log('\nDONE. OK: ' + (httpOk + stdioOk) + ' FAIL: ' + (httpFail + stdioFail));
  console.log('Total tools discovered: ' + [...results.http, ...results.stdio].reduce((sum, r) => sum + r.toolCount, 0));
}

main().catch(e => { console.error(e); process.exit(1); });
