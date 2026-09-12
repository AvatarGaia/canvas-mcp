#!/usr/bin/env node
/**
 * @avatargaia/canvas-mcp —— stdio 马甲（M4）
 * ─────────────────────────────────────────────────────────────
 * 作用：把"只支持 stdio 的 MCP 客户端"接到我们的 streamable-http MCP 上。
 * 纯转调，不缓存、不改写、不持有状态；一个进程一个上游。
 *
 * 用法：
 *   CANVAS_MCP_URL=https://agent.avatargaia.top/api/mcp/canvas \
 *   CANVAS_MCP_TOKEN=ta_xxx \
 *   npx @avatargaia/canvas-mcp
 *
 * 客户端配置（Claude Desktop / Cursor 等）：
 *   { "command": "npx", "args": ["-y", "@avatargaia/canvas-mcp"],
 *     "env": { "CANVAS_MCP_URL": "...", "CANVAS_MCP_TOKEN": "ta_..." } }
 *
 * 协议：stdin/stdout 逐行 JSON-RPC 2.0（MCP stdio transport）。
 * 作者：八爪 🐙 2026-09-12
 */
const VERSION = '0.1.0';

// ---- CLI 参数（有些客户端只给 args 不给 env）----
function argOf(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  const withEq = process.argv.find((a) => a.startsWith(flag + '='));
  return withEq ? withEq.slice(flag.length + 1) : null;
}
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stderr.write(
    [
      'canvas-mcp —— TeamAgent Canvas MCP 的 stdio 马甲',
      '',
      '用法: canvas-mcp [--url <端点>] [--token <ta_|dk_>]',
      '',
      '也可用环境变量: CANVAS_MCP_URL / CANVAS_MCP_TOKEN（CLI 优先）',
      '',
      '客户端配置示例:',
      '  { "command": "npx", "args": ["-y", "@avatargaia/canvas-mcp", "--token", "dk_xxx"] }',
    ].join('\n') + '\n',
  );
  process.exit(0);
}

const URL_ = argOf('--url') || process.env.CANVAS_MCP_URL || 'https://agent.avatargaia.top/api/mcp/canvas';
const TOKEN = argOf('--token') || process.env.CANVAS_MCP_TOKEN || process.env.CANVAS_MCP_KEY || '';

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/** 把上游响应（可能是 SSE 或 JSON）解析成一条 JSON-RPC 消息 */
async function post(body) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (TOKEN) headers.Authorization = 'Bearer ' + TOKEN;
  const r = await fetch(URL_, { method: 'POST', headers, body: JSON.stringify(body) });
  const ct = r.headers.get('content-type') || '';
  const text = await r.text();
  if (!r.ok) {
    // 把 HTTP 错误包成 JSON-RPC 错误，客户端能看见原因（401/402/429…）
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text).error || msg; } catch {}
    return { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32000, message: `${r.status}: ${msg}` } };
  }
  if (ct.includes('text/event-stream')) {
    const lines = text.split(/\r?\n/).filter((l) => l.startsWith('data:'));
    const last = lines[lines.length - 1];
    if (!last) return { jsonrpc: '2.0', id: body.id ?? null, result: {} };
    try { return JSON.parse(last.slice(5).trim()); } catch { /* fallthrough */ }
  }
  try { return JSON.parse(text); } catch { return { jsonrpc: '2.0', id: body.id ?? null, result: { raw: text.slice(0, 500) } }; }
}

let buf = '';
let inflight = 0;
let stdinEnded = false;

function maybeExit() {
  if (stdinEnded && inflight === 0) setTimeout(() => process.exit(0), 30);
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); continue; }
    inflight++;
    post(msg)
      .then((out) => {
        // 通知（无 id）不需要回包
        if (msg.id !== undefined && msg.id !== null) send(out);
      })
      .catch((e) => {
        if (msg.id !== undefined && msg.id !== null) {
          send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'upstream failed: ' + (e && e.message) } });
        }
      })
      .finally(() => { inflight--; maybeExit(); });
  }
});
process.stdin.on('end', () => { stdinEnded = true; maybeExit(); });
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

process.stderr.write(`[canvas-mcp] v${VERSION} stdio 马甲已启动 → ${URL_}${TOKEN ? ' (带令牌)' : ' (⚠️ 无令牌)'}\n`);
