# 设计文档：Skill 预设 + 两段式自动路由

日期：2026-09-19 ｜ 状态：已获用户批准（B 方案）

## 1. 背景与定位修正

用户明确否决"不断追问细节"的交互式提示词工具。目标形态：

> 一句需求进 → 一段详细、专业、精准的成品提示词出，专业深度来自**封装的 skill 预设**，而非向用户提问。

产品定位从"聊天助手"改为**提示词工厂**：回复永远是可直接粘贴使用的成品提示词（不是对用户需求的直接作答），全文禁止反问。

## 2. 交互设计

- **入口不变**：单一输入框描述需求；顶部 4 模式标签（文本/图片/视频/音频）删除。
- **自动路由**：每条新消息先做一次轻量分类调用选出 skill；回复气泡上方显示 skill 徽章（图标+名称）。
- **锁定/改选**：输入栏工具行的 skill 下拉，默认「⚡自动」；选定具体 skill 后锁定（跳过路由，零额外延迟），可随时切回自动。
- **修改类指令**："再短点""换成赛博朋克风"等由路由器返回 `keep`，沿用上一轮 skill。
- **重新生成**：最后一条回复悬停出现「重新生成」——删掉该回复，按当前锁定 skill（或重新路由）用同一条用户消息再跑一次。配合改选 skill 即"换个 skill 重跑"。
- **空状态**：快捷标签从"直接发送模板"改为"点击填入示例需求"，避免无草稿时产生无意义请求。

## 3. Skill 库（内置 11 个）

| id | 名称 | 领域方法论要点 |
|---|---|---|
| image-prompt | 图片提示词 | 主体/构图/光线/风格分层；MJ 参数、SD 权重语法+负面词、DALL-E 自然语言 |
| video-prompt | 视频提示词 | 分镜节拍、镜头语言（dolly/pan/rack focus）、时长、音画线索 |
| audio-prompt | 音乐音频提示词 | 流派/BPM/配器/人声描述、[Verse][Chorus] 结构标签、歌词 |
| writing-prompt | 写作文案提示词 | 人设/受众/平台格式/钩子-正文-CTA/禁用语清单 |
| code-prompt | 代码任务提示词 | 技术栈+版本、验收标准、边界情况、先计划后编码 |
| translate-prompt | 翻译提示词 | 语言对变体、术语表、占位符/格式保留、只输出译文 |
| persona-prompt | 角色设定提示词 | 背景/性格锚点/示例台词/知识边界/OOC 防护 |
| extract-prompt | 数据抽取提示词 | 字段定义+JSON Schema、缺失→null、禁止编造、仅输出合法 JSON |
| agent-prompt | 智能体系统提示词 | 使命边界/工具规则/决策流程/拒答与升级策略 |
| optimize-prompt | 提示词优化 | 诊断草稿弱点→保留原意重构 |
| general | 通用兜底 | 自选最优结构完成需求 |

**公共输出规则**（拼在每个 skill 系统提示词前）：永不提问/寒暄/解释；信息不足用专业默认值补齐，末尾一行「已假设：…」（≤3 条）；成品按 角色/任务/上下文/约束/输出格式 等模块化组织；具体化（数字、具名风格、显式约束）；提示词语种遵循回复语言设置。

## 4. 技术实现

- 新增 `src/skills/index.ts`：`SKILLS` 数组、`buildRouterPrompt()`、`buildGeneratorSystemPrompt(skillId, language)`。
- `src/services/llm.ts`：
  - `routeSkill(userText, currentSkillId, model)`：非流式、temperature 0、max_tokens≈16；解析返回（`keep`/非法 id → 回退 current ?? general）；**任何异常静默回退，绝不阻塞生成**。
  - `chat()` 签名 `mode: ContentMode` → `skillId: string`。
- 类型：删除 `ContentMode`、`Message.mode`、`GenerationSettings.defaultMode`；`Message.skillId?: string`；`ChatSession.selectedSkillId?: string | null`（null=自动）。
- `app-store`：删除 `currentMode/setMode`；`sendMessage` 先路由（有锁跳过）再生成，assistant 消息写入 skillId；新增 `setSkillLock()`、`regenerateLast()`；生成逻辑抽为内部复用函数。
- UI：`ModeTabs.tsx` 删除；新增 `SkillPicker.tsx`（下拉：自动+11 skill）；`MessageItem` 加徽章与重新生成；`InputBar` 接收 prefill 示例填入。
- 旧数据兼容：存储中多余的 `mode`/`defaultMode` 字段自然废弃，无需迁移。

## 5. 验证（交付门槛）

mock LLM 区分路由请求（小 max_tokens、含 "skill router" 系统词）与生成请求（流式），断言：
1. 路由请求体正确、生成请求体含对应 skill 方法论；
2. "再短点"类消息触发 keep 不换 skill；
3. 路由 500/坏 JSON → 静默回退 general 且正常出词；
4. 锁定 skill 后无路由调用；
5. 重新生成沿用用户消息并更新 skillId；
6. 真实浏览器全链路、console/network 零错误。
