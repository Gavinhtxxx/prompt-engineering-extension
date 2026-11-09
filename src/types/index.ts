export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 生成本条回复所用的 skill id（assistant 消息） */
  skillId?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  /** null = 自动路由；非空 = 锁定该 skill */
  selectedSkillId?: string | null;
  createdAt: number;
  updatedAt: number;
}

/** 全局轻提示，瞬态 UI 状态，不落盘 */
export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
  hiding: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  billing: string;
  enabled: boolean;
  createdAt: number;
}

export const PROVIDER_PRESETS: { name: string; baseUrl: string; models: string[]; note?: string }[] = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
  { name: 'Anthropic', baseUrl: '', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'], note: '需使用 OpenAI 兼容代理（如 one-api）' },
  { name: 'Xiaomi MiMo', baseUrl: 'https://api.mimo.xiaomi.com/v1', models: ['mimo-v2.5-pro', 'mimo-v2.5-flash'] },
  { name: 'Custom', baseUrl: '', models: [] },
];

export interface GenerationSettings {
  autoSave: boolean;
  responseLanguage: 'auto' | 'zh' | 'en';
  maxLength: number;
  maxTokens: number;
  temperature: number;
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  /** 入口打开方式：浏览器侧边栏 或 独立悬浮小窗 */
  openMode: 'sidePanel' | 'popup';
}

export interface ShortcutSettings {
  openSidebar: string;
  quickGenerate: string;
  newChat: string;
}

export interface AppSettings {
  generation: GenerationSettings;
  appearance: AppearanceSettings;
  shortcuts: ShortcutSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  generation: {
    autoSave: true,
    responseLanguage: 'auto',
    maxLength: 4096,
    maxTokens: 2048,
    temperature: 0.7,
  },
  appearance: {
    theme: 'dark',
    fontSize: 'medium',
    compactMode: false,
    openMode: 'sidePanel',
  },
  shortcuts: {
    openSidebar: 'Alt+G',
    quickGenerate: 'Alt+Shift+G',
    newChat: 'Ctrl+N',
  },
};
