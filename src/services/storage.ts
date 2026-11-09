import type { AppSettings, ChatSession, ModelConfig } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const KEYS = {
  SETTINGS: 'gestalt_settings',
  SESSIONS: 'gestalt_sessions',
  ACTIVE_SESSION: 'gestalt_active_session',
  MODELS: 'gestalt_models',
  ACTIVE_MODEL: 'gestalt_active_model',
} as const;

const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;
const memoryStore = new Map<string, unknown>();

async function get<T>(key: string, fallback: T): Promise<T> {
  if (!hasChromeStorage) {
    return (memoryStore.get(key) as T) ?? fallback;
  }
  try {
    const result = await chrome.storage.local.get(key);
    const value = (result as Record<string, T>)[key];
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

async function set(key: string, value: unknown): Promise<void> {
  if (!hasChromeStorage) {
    memoryStore.set(key, value);
    return;
  }
  await chrome.storage.local.set({ [key]: value });
}

export const storage = {
  async getSettings(): Promise<AppSettings> {
    const saved = await get<Partial<AppSettings>>(KEYS.SETTINGS, {});
    return {
      generation: { ...DEFAULT_SETTINGS.generation, ...saved.generation },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...saved.appearance },
      shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...saved.shortcuts },
    };
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await set(KEYS.SETTINGS, settings);
  },

  async getSessions(): Promise<ChatSession[]> {
    return get<ChatSession[]>(KEYS.SESSIONS, []);
  },

  async saveSessions(sessions: ChatSession[]): Promise<void> {
    await set(KEYS.SESSIONS, sessions);
  },

  async getActiveSessionId(): Promise<string | null> {
    return get<string | null>(KEYS.ACTIVE_SESSION, null);
  },

  async setActiveSessionId(id: string | null): Promise<void> {
    await set(KEYS.ACTIVE_SESSION, id);
  },

  async getModels(): Promise<ModelConfig[]> {
    return get<ModelConfig[]>(KEYS.MODELS, []);
  },

  async saveModels(models: ModelConfig[]): Promise<void> {
    await set(KEYS.MODELS, models);
  },

  async getActiveModelId(): Promise<string | null> {
    return get<string | null>(KEYS.ACTIVE_MODEL, null);
  },

  async setActiveModelId(id: string | null): Promise<void> {
    await set(KEYS.ACTIVE_MODEL, id);
  },

  async exportData(): Promise<string> {
    const [settings, sessions, models] = await Promise.all([
      this.getSettings(),
      this.getSessions(),
      this.getModels(),
    ]);
    return JSON.stringify({ settings, sessions, models, exportedAt: Date.now() }, null, 2);
  },

  async importData(json: string): Promise<{ ok: boolean; error?: string }> {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(json);
    } catch {
      return { ok: false, error: 'JSON 格式无效' };
    }
    if (!data || typeof data !== 'object') {
      return { ok: false, error: '数据格式不正确' };
    }
    if (data.settings && typeof data.settings !== 'object') {
      return { ok: false, error: 'settings 字段格式错误' };
    }
    if (data.sessions && !Array.isArray(data.sessions)) {
      return { ok: false, error: 'sessions 字段必须是数组' };
    }
    if (data.models && !Array.isArray(data.models)) {
      return { ok: false, error: 'models 字段必须是数组' };
    }
    try {
      if (data.settings && typeof data.settings === 'object') await this.saveSettings(data.settings as AppSettings);
      if (Array.isArray(data.sessions)) await this.saveSessions(data.sessions as ChatSession[]);
      if (Array.isArray(data.models)) await this.saveModels(data.models as ModelConfig[]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : '写入存储失败' };
    }
  },

  async clearAll(): Promise<void> {
    if (!hasChromeStorage) {
      memoryStore.clear();
      return;
    }
    await chrome.storage.local.clear();
  },
};
