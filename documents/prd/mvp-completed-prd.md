# 提示词工程 - MVP 完成版 PRD

> 版本: v1.0.0 | 日期: 2026-09-13 | 状态: MVP 已完成

## 产品定位

Chrome 侧边栏 AI 提示词生成器扩展。用户在浏览网页时通过侧边栏与 AI 对话，生成、优化、翻译各类提示词。支持多模型切换、多内容模式、主题自定义。

## 技术架构

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite + CRXJS (@crxjs/vite-plugin@beta) |
| 样式 | Tailwind CSS 4 (@theme tokens + CSS 变量) |
| 状态 | Zustand |
| 存储 | chrome.storage.local（含内存回退用于开发测试） |
| 扩展 | Chrome Manifest V3, side_panel API |
| LLM | OpenAI 兼容 /chat/completions SSE 流式 |

## 功能清单（MVP 完整）

### 1. 模型管理 ✅
- **添加模型**: 选择服务商预设（DeepSeek/OpenAI/Anthropic/Xiaomi MiMo/Custom），自动填充 Base URL 和推荐模型 ID
- **编辑/删除**: 修改任意字段，确认后删除
- **启用/禁用**: Toggle 开关，禁用的模型不出现在选择器中
- **设为默认**: 一键切换活跃模型，InputBar chip 同步更新
- **测试连接**: 返回具体错误信息（API Key 无效/Base URL 错误/网络超时/模型不存在等），5 秒后自动消失
- **Anthropic 说明**: 预设 Base URL 为空，显示"需使用 OpenAI 兼容代理"提示，避免用户误用原生 API
- **遗留迁移**: 旧版单 `settings.ai` 对象自动转换为 ModelConfig 条目

### 2. 聊天对话 ✅
- **流式响应**: SSE 实时追加文本，打字机效果
- **多会话**: 创建新会话、切换历史会话（Header 标题下拉列表）、自动以首条消息命名
- **Skill 预设 + 自动路由**: 11 个内置领域技能（图片/视频/音频/写作/代码/翻译/角色/抽取/智能体/优化/通用），每条需求先经轻量路由选定 skill，输出为一段可直接复制的成品提示词；输入栏下拉可手动锁定 skill，修改类指令沿用上一轮，路由失败静默兜底不阻塞
- **示例标签**: 欢迎页四个示例按钮将真实需求文本填入输入框（不直接发送），供快速上手
- **生成指示器**: 仅显示三点跳动动画，无重复 "..." 气泡
- **错误处理**: 流式中断时保留已接收内容，在末尾追加 ⚠️ 错误提示而非覆盖
- **复制功能**: 鼠标悬停 assistant 消息显示"复制"按钮

### 3. 设置系统 ✅
- **回复语言**: auto/中文/English，注入系统提示词实际生效
- **最大长度**: maxLength 截断超长响应并标注"[…已截断至最大长度]"
- **Max Tokens / Temperature**: 传递给 API
- **自动保存**: 关闭时不再写入 storage，仅保留内存状态
- **紧凑模式**: data-compact 属性驱动 CSS 缩减 padding/margin/gap
- **打开方式**: 浏览器侧边栏 / 独立悬浮小窗（chrome.windows popup，420×720 可拖动、单例复用），设置后工具栏图标、Alt+G、右键菜单入口全部按所选方式打开；两种形态共享同一份 chrome.storage 数据
- **字体大小**: 小(0.92)/中(1.0)/大(1.08) 三档 zoom
- **主题**: 深色/浅色/跟随系统，CSS 变量实时切换，matchMedia 监听系统变化
- **快捷键**: 新对话快捷键可自定义（解析 Ctrl/Shift/Alt+Key 组合），window keydown 监听
- **设置系统**: 即改即生效即存（无保存按钮，修改即时应用并持久化，标题栏"已自动保存"提示）

### 4. 数据管理 ✅
- **导出**: JSON 格式包含 settings/sessions/models/exportedAt
- **导入**: 完整校验（JSON 语法 + 结构类型检查），失败时 alert 具体错误原因
- **清除**: confirm 二次确认后清空所有本地数据

### 5. 浏览器集成 ✅
- **侧边栏**: 点击扩展图标打开 side_panel
- **右键菜单**: 选中文本 → "用 Gestalt 生成提示词" → 打开侧边栏并自动发送选中文本
- **键盘快捷键**: Alt+G 打开侧边栏、Alt+Shift+G 快速生成（manifest 声明）+ 自定义新对话快捷键
- **CSP**: manifest 声明 `script-src 'self'; object-src 'self'`

### 6. UI/UX ✅
- **紫蓝渐变深色主题**: primary #6366f1 → primary-light #8b5cf6
- **浅色主题**: 完整 CSS 变量覆盖，阴影/overlay 均使用 theme-aware token
- **Glass morphism**: Header 毛玻璃效果
- **Noise texture**: 背景噪点纹理 z-index:-1 不遮挡内容
- **动画**: fade-in/slide-up/scale-in/shimmer/pulse-soft/typing-dot
- **版本号**: 从 manifest.json 动态读取

## 文件结构

```
gestalt/
├── manifest.json              # MV3 配置 + CSP
├── vite.config.ts             # base:'./' + CRXJS + Tailwind
├── tsconfig.app.json          # types: [vite/client, chrome]
├── src/
│   ├── index.css              # @theme tokens + light overrides + compact rules + animations
│   ├── App.tsx                # 主题/字号/紧凑/快捷键 effects + pending text 消费
│   ├── background.ts          # sidePanel + contextMenus + commands
│   ├── skills/index.ts        # 11 个内置 skill + 路由器/生成器系统提示词构建
│   ├── types/index.ts         # ModelConfig/ChatSession/AppSettings + PROVIDER_PRESETS
│   ├── services/
│   │   ├── llm.ts             # chat(SSE) + routeSkill 路由 + testConnection(TestResult)
│   │   └── storage.ts         # chrome.storage.local + 内存回退 + 导入校验
│   ├── stores/
│   │   └── app-store.ts       # Zustand: models/sessions/settings + skill 锁定 + 重新生成
│   └── components/
│       ├── Header.tsx          # Logo + 会话下拉 + 新建/设置
│       ├── SkillPicker.tsx     # 自动路由/锁定 skill 下拉
│       ├── ChatList.tsx        # 消息列表 + 欢迎页 + 示例填入输入框
│       ├── MessageItem.tsx     # 消息气泡 + skill 徽章 + 复制 + 重新生成
│       ├── InputBar.tsx        # 模型选择器chip + 输入框 + 发送
│       ├── ModelManager.tsx    # 模型CRUD + 测试(详细错误) + preset note
│       └── SettingsPanel.tsx   # 6 Tab + dirty check + 动态版本
└── documents/prd/
    ├── current-state-prd.md   # 修复前状态快照
    └── mvp-completed-prd.md   # 本文档
```

## 用户使用流程

1. **安装扩展** → chrome://extensions 加载 `dist/` 目录
2. **配置模型** → 点击设置 → 模型 Tab → 添加模型 → 填写 API Key → 测试连接
3. **开始对话** → 直接输入一句话需求 → AI 自动选 skill（或下拉锁定）→ 流式输出成品提示词 → 悬停复制；不满意可改选 skill 后点「重新生成」
4. **切换模型** → InputBar 上方 chip 下拉选择，或设置中设为默认
5. **管理会话** → Header 标题下拉切换历史会话，+ 按钮新建
6. **右键生成** → 网页选中文本 → 右键"用 Gestalt 生成提示词" → 侧边栏自动发送
7. **自定义外观** → 设置 → 外观 → 切换主题/字号/紧凑模式
8. **备份数据** → 设置 → 数据存储 → 导出/导入 JSON

## 非目标（后续迭代）

- 云端同步 / 账号系统
- Markdown 渲染 / 代码高亮
- 提示词模板库
- 历史记录搜索
- 多语言 UI（当前仅中文）
- Firefox / Edge 兼容适配
- 图片/视频/音频场景的实际多模态调用（当前仅文本 LLM 生成对应提示词）
- 用户自定义 skill（当前为内置精选库）
