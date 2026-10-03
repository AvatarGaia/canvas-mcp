# @avatargaia/canvas-mcp

**stdio 马甲**：让只支持 stdio 的 MCP 客户端（Claude Desktop / Cursor / Cline / 各类本地 Agent）接入 TeamAgent 的 MCP 服务器（`streamable-http`）。
纯转调，无状态、不缓存、不改写请求。

两个门，同一把 Key：

| 门 | 端点 | 工具 | 鉴权 |
|---|---|---|---|
| Canvas | `https://agent.avatargaia.top/api/mcp/canvas` | **91 个**（岗位类 18 + 协作类 73），服务端 0.4.0 | **可不带 Key**：匿名沙箱开放免费工具；带 `dk_`/`ta_` 解锁全部 |
| AICare | `https://agent.avatargaia.top/api/mcp/aicare` | 7 个（AI 健康检测 13 类：舌苔/面部/指甲…） | 必须带 Key，按次计费 |

自动安装说明（给 Agent 读）：[`llms-install.md`](./llms-install.md) ｜ 隐私政策与支持：https://agent.avatargaia.top/privacy

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
      "args": ["-y", "@avatargaia/canvas-mcp", "--token", "dk_xxxxxxxx"]
    }
  }
}
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `CANVAS_MCP_TOKEN` | 否 | `dk_`（开发者 Key）或 `ta_`（平台令牌）；不带 = 匿名沙箱，只能用免费工具 |
| `CANVAS_MCP_URL` | 否 | 默认 Canvas 门；AICare 门填 `https://agent.avatargaia.top/api/mcp/aicare`；自建部署时改这里 |
| `CANVAS_MCP_KEY` | 否 | `CANVAS_MCP_TOKEN` 的别名 |

## 给数字员工喂知识（v0.4.0 起）

岗位可以配知识库：访客问到时，数字员工**先查库再答**，并把依据的那一页显示在画布上；库里没有的，它会直说没有。

| 工具 | 作用 |
|---|---|
| `list_kbs` | 我名下的知识库 + 每个岗位配了哪些库 |
| `read_kb` | 库的页面清单，或某一页原文 |
| `publish_kb` | 发布一套 wiki（整库替换，可顺手配给岗位）；`checked` 不为 `true` 不发 |
| `set_staff_kbs` | 设定岗位用哪些库 |
| `hire_staff` | 按模板开岗，可带 `kbs` |

三步：**整理**（一套 Markdown，`wiki/index.md` 总目录 + `wiki/<主题>/<文章>.md`，一个概念一篇，数字日期照原文写）→ **发布**（`publish_kb`，库名 + 全部页面 + `checked: true`，同名再发是整库替换）→ **配给岗位**（`set_staff_kbs`，或发布时带 `slug`，或 `hire_staff` 直接带 `kbs`）。

> ⚠️ **发布等于公开**：岗位是匿名访客都能聊的，库里写了什么访客就能问出什么。个人隐私、客户资料、令牌、内部运维内容不要放。上限：200 个文件 / 单个 64KB / 合计 2MB。

## 行为

- stdin/stdout 逐行 JSON-RPC 2.0；通知（无 `id`）不回包
- 上游 HTTP 错误**原样透传**成 JSON-RPC error（`401: Missing Authorization header` / `402: …` / `429: …`），客户端能看见真正原因
- 上游返回 SSE 或 JSON 都能解析（取最后一条 `data:`）
- stdin 关闭后等所有在途请求落地再退出

## 验证记录（2026-10-03）

```
initialize   ✅ serverInfo teamagent-canvas 0.4.0
tools/list   ✅ 91 个工具
publish_kb   ✅ checked:false 被拦下；checked:true 发布成功
hire_staff   ✅ 开岗并同时配知识库，返回里带 kbs
set_staff_kbs ✅ 正向成功；跨账号岗位返回 404（越权被拒）
匿名调用      ✅ {"error":{"code":-32000,"message":"401: Missing Authorization header"}}
```

（早期 0.3.0 的 stdio 马甲验证：initialize / tools/list / tools/call / 无令牌 401 / mcporter 接入，均通过。）

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

## 工具注解

每个工具都带 MCP `annotations`（`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`），付费工具在描述里写明 credit 数，客户端可据此做二次确认。

## 收录

- 官方 MCP Registry：`io.github.AvatarGaia/canvas-mcp`
- 接入文档：https://agent.avatargaia.top/mcp/canvas.html ｜ LLM 索引：/llms.txt
