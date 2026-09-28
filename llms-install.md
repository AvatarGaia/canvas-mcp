# Install @avatargaia/canvas-mcp

This file is for AI agents (Cline, Cursor, Claude Desktop, etc.) that install MCP servers automatically.

## What it is
`@avatargaia/canvas-mcp` is a stdio shim for the TeamAgent MCP servers (remote, streamable-http):
- Canvas door `https://agent.avatargaia.top/api/mcp/canvas` — 13 tools (staff templates, actions, async jobs, stats). Works **without a key** in sandbox mode (free tools only).
- AICare door `https://agent.avatargaia.top/api/mcp/aicare` — 7 tools for AI health checks (tongue/face/nail/... 13 kinds). Requires a key; paid per call.

## Step 1 — get a key (optional for sandbox, required for paid tools)
```bash
curl -X POST https://agent.avatargaia.top/api/dev/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","email":"you@example.com","purpose":"MCP"}'
# → { key: "dk_...", credits: 20, mcp: { url, auth } }   (key shown once)
```

## Step 2 — add to the client config
Node >= 18 required. No build step; `npx` fetches the package.

```json
{
  "mcpServers": {
    "teamagent-canvas": {
      "command": "npx",
      "args": ["-y", "@avatargaia/canvas-mcp", "--token", "dk_xxx"]
    }
  }
}
```
Sandbox (no key): omit `--token`. AICare door: add `"--url", "https://agent.avatargaia.top/api/mcp/aicare"`.

Environment variables `CANVAS_MCP_URL` / `CANVAS_MCP_TOKEN` work as alternatives to the CLI flags.

## Step 3 — verify
Call `list_templates` (canvas door) or `aicare_list_kinds` (AICare door). Both are free and read-only.

## Notes
- Every tool carries MCP annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`); paid tools are marked in their descriptions with the credit cost.
- Machine-readable self-description: `GET https://agent.avatargaia.top/api/dev`. Human docs: https://agent.avatargaia.top/developers . Privacy & support: https://agent.avatargaia.top/privacy
- Health-check results are wellness assessments, not medical diagnoses.
