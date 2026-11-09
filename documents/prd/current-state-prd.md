# 提示词工程 - 当前版本 PRD（修复前状态）

> 版本: v1.0.0 | 日期: 2026-09-13 | 状态: 已归档（修复前快照）

## 产品概述

Chrome 侧边栏 AI 提示词生成器扩展，支持多模型管理、多模式内容生成、主题切换。技术栈：React 18 + Vite + TypeScript + Tailwind CSS 4 + CRXJS + Zustand，Chrome Manifest V3 side_panel。

## 已实现功能

### 核心功能
- **多模型管理**: 添加/编辑/删除/启用禁用/设为默认/测试连接，支持 DeepSeek/OpenAI/Anthropic/Xiaomi MiMo/Custom 预设
- **聊天对话**: 流式响应(SSE)、多会话创建、模式切换(文本/图片/视频/音频)
- **主题系统**: 深色/浅色/跟随系统三档切换，CSS 变量驱动
- **字体缩放**: 小/中/大三档
- **数据管理**: 导出/导入 JSON 备份、清除所有数据
- **快捷键**: Alt+G 打开侧边栏、Alt+Shift+G 快速生成（manifest 声明）

### UI 组件
- Header（Logo + 会话标题 + 新建/设置按钮）
- ModeTabs（四种内容模式切换）
- ChatList（消息列表 + 欢迎页快捷标签 + 生成指示器）
- InputBar（模型选择器 + 输入框 + 发送按钮）
- SettingsPanel（6 个 Tab：模型/生成设置/外观/数据存储/快捷键/关于）
- ModelManager（Qoder 风格模型管理界面）

## 已知问题清单

### Critical（核心功能损坏）
1. **Anthropic 预设 Base URL 错误** — 原生 API 使用 `/v1/messages`，但 llm.ts 拼接 `/chat/completions`，所有 Anthropic 模型调用必定 4xx 失败
2. **右键菜单选中文本是死链** — background.ts 写入 `gestalt_pending_text` 但侧边栏从不读取，选中文本被静默丢弃
3. **无法切换历史会话** — `switchSession` 已定义但无 UI 调用入口，sessions 无限堆积
4. **导入零校验** — 畸形 JSON 抛未捕获异常，错误结构文件直接污染 storage

### Major（UI 呈现但功能未接通）
5. **"回复语言"设置未生效** — 保存了 `responseLanguage` 但 llm.ts 从未读取
6. **"最大长度"设置未生效** — `maxLength` 未被使用
7. **"自动保存"开关未生效** — 无条件写入 storage
8. **"紧凑模式"开关未生效** — 无任何 CSS 消费
9. **"新对话"快捷键可编辑但未绑定** — 只有 manifest 声明的快捷键有效
10. **快捷标签语义错位** — 点击标签发送裸文本而非有意义的 prompt 模板
11. **testConnection 只返回 bool** — 用户无法区分 key 错/URL 错/网络错/model ID 错
12. **生成指示器重复** — "..." 气泡 + 三点跳动动画同时显示
13. **流式中断覆盖已接收内容** — appendError 替换整条消息，丢失部分响应

### Minor（体验/规范）
14. 浅色模式下硬编码暗色阴影 (`shadow-black/*`, `bg-black/*`)
15. 字号缩放用非标准 `zoom` 属性
16. 关于页版本号写死 `v1.0.0`
17. createSession/switchSession 存储写入未 await
18. 设置面板关闭无未保存更改提示
19. manifest 缺 content_security_policy
20. noise-bg overlay z-index:0 可能与子元素冲突
