# @avatargaia/canvas-mcp

**stdio 马甲**：让只支持 stdio 的 MCP 客户端（Claude Desktop / Cursor / 各类本地 Agent）接入 TeamAgent 的 Canvas MCP（`streamable-http`）。
纯转调，无状态、不缓存、不改写请求。

## 用

```bash
CANVAS_MCP_URL=https://agent.avatargaia.top/api/mcp/canvas \
CANVAS_MCP_TOKEN=ta_xxxxxxxx \
npx -y @avatargaia/canvas-mcp
```

客户端配置（Claude Desktop `claude_desktop_config.json` 为例）：

```json
{
  "mcpServers": {
    "teamagent-canvas": {
      "command": "npx",
      "args": ["-y", "@avatargaia/canvas-mcp"],
      "env": {
        "CANVAS_MCP_URL": "https://agent.avatargaia.top/api/mcp/canvas",
        "CANVAS_MCP_TOKEN": "ta_xxxxxxxx"
      }
    }
  }
}
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `CANVAS_MCP_TOKEN` | 是 | `ta_`（平台令牌）或后续 `dk_`（开发者 Key） |
| `CANVAS_MCP_URL` | 否 | 默认官方端点；自建部署时改这里 |
| `CANVAS_MCP_KEY` | 否 | `CANVAS_MCP_TOKEN` 的别名 |

## 行为

- stdin/stdout 逐行 JSON-RPC 2.0；通知（无 `id`）不回包
- 上游 HTTP 错误**原样透传**成 JSON-RPC error（`401: Missing Authorization header` / `402: …` / `429: …`），客户端能看见真正原因
- 上游返回 SSE 或 JSON 都能解析（取最后一条 `data:`）
- stdin 关闭后等所有在途请求落地再退出

## 验证记录（2026-09-12）

```
initialize   ✅ serverInfo teamagent-canvas 0.3.0
tools/list   ✅ 13 个工具
tools/call   ✅ list_my_staff 返回岗位列表
无令牌        ✅ {"error":{"code":-32000,"message":"401: Missing Authorization header"}}
mcporter 接入 ✅ 作为 stdio server 连上并调用成功
```

## 拿 Key（自助，30 秒）

外部 / 本地 Agent 无需 TeamAgent 账号：

```bash
curl -X POST https://agent.avatargaia.top/api/dev/register \
  -H "Content-Type: application/json" \
  -d '{"name":"my-agent","email":"you@example.com"}'
# → 返回 dk_ Key（只显示一次）+ 20 credits + 接入信息
```

- 开发者入口（控制台 / 计费 / 错误码）：https://agent.avatargaia.top/developers
- 机器可读自描述（Agent 自发现首选）：`GET https://agent.avatargaia.top/api/dev`

## 收录

- 官方 MCP Registry：`io.github.AvatarGaia/canvas-mcp`
- 接入文档：https://agent.avatargaia.top/mcp/canvas.html ｜ LLM 索引：/llms.txt
