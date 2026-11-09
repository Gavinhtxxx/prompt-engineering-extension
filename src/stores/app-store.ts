import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppSettings, ChatSession, Message, ModelConfig, ToastMessage } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { storage } from '../services/storage';
import { llmService } from '../services/llm';

interface LegacyAI {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface AppState {
  settings: AppSettings;
  sessions: ChatSession[];
  activeSessionId: string | null;
  models: ModelConfig[];
  activeModelId: string | null;
  isGenerating: boolean;
  showSettings: boolean;
  isLoaded: boolean;
  toast: ToastMessage | null;

  load: () => Promise<void>;
  showToast: (text: string, type?: ToastMessage['type']) => void;
  updateSettings: (settings: AppSettings) => Promise<void>;
  setSkillLock: (skillId: string | null) => Promise<void>;
  setShowSettings: (show: boolean) => void;

  addModel: (model: Omit<ModelConfig, 'id' | 'createdAt'>) => Promise<void>;
  updateModel: (id: string, patch: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  toggleModel: (id: string) => Promise<void>;
  setActiveModel: (id: string) => Promise<void>;

  createSession: () => string;
  switchSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateLast: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => {
  let toastSeq = 0;
  let toastDismissTimer: ReturnType<typeof setTimeout> | undefined;
  let toastRemoveTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * 核心生成流程：假定会话末尾已存在空的 assistant 占位消息。
   * 先做 skill 路由（有锁定则跳过），再流式生成并写入结果。
   */
  const runGeneration = async (
    sessionIdx: number,
    assistantMessageId: string,
    userText: string,
    model: ModelConfig,
  ) => {
    const { settings } = get();

    const mutateLast = (fn: (m: Message) => Message) => {
      const { sessions: cur } = get();
      const idx = cur.findIndex((s) => s.id === get().activeSessionId);
      if (idx === -1) return;
      const s = { ...cur[idx] };
      const msgs = [...s.messages];
      const lastIdx = msgs.findIndex((m) => m.id === assistantMessageId);
      if (lastIdx === -1) return;
      msgs[lastIdx] = fn(msgs[lastIdx]);
      s.messages = msgs;
      const next = [...cur];
      next[idx] = s;
      set({ sessions: next });
      if (settings.generation.autoSave) storage.saveSessions(next);
    };

    const appendError = (errText: string) => {
      mutateLast((last) => ({
        ...last,
        content: last.content ? `${last.content}\n\n⚠️ ${errText}` : `⚠️ ${errText}`,
      }));
    };

    try {
      const { sessions } = get();
      const s = sessions[sessionIdx];
      const lock = s.selectedSkillId ?? null;

      let skillId: string;
      if (lock) {
        skillId = lock;
      } else {
        const prevAssistant = [...s.messages]
          .slice(0, s.messages.findIndex((m) => m.id === assistantMessageId))
          .reverse()
          .find((m) => m.role === 'assistant' && m.skillId);
        skillId = await llmService.routeSkill(userText, prevAssistant?.skillId ?? null, model);
      }
      mutateLast((last) => ({ ...last, skillId }));

      const chatMessages = get().sessions[sessionIdx].messages
        .filter((m) => m.id !== assistantMessageId && (m.role === 'user' || (m.role === 'assistant' && m.content)))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      await llmService.chat(
        chatMessages,
        skillId,
        model,
        {
          maxTokens: settings.generation.maxTokens,
          temperature: settings.generation.temperature,
          responseLanguage: settings.generation.responseLanguage,
          maxLength: settings.generation.maxLength,
        },
        (chunk) => {
          mutateLast((last) => ({ ...last, content: last.content + chunk }));
        },
      );

      mutateLast((last) => ({
        ...last,
        content: last.content || '(空响应)',
        timestamp: Date.now(),
      }));
    } catch (err) {
      appendError(`错误: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      set({ isGenerating: false });
    }
  };

  return {
    settings: DEFAULT_SETTINGS,
    sessions: [],
    activeSessionId: null,
    models: [],
    activeModelId: null,
    isGenerating: false,
    showSettings: false,
    isLoaded: false,
    toast: null,

    load: async () => {
      const [rawSettings, sessions, activeId, storedModels, storedActiveModel] = await Promise.all([
        storage.getSettings(),
        storage.getSessions(),
        storage.getActiveSessionId(),
        storage.getModels(),
        storage.getActiveModelId(),
      ]);

      const settings = { ...rawSettings } as AppSettings & { ai?: LegacyAI };
      let models = storedModels;

      const legacyAi = settings.ai;
      if (models.length === 0 && legacyAi && legacyAi.apiKey) {
        const providerName =
          legacyAi.provider === 'openai' ? 'OpenAI' :
          legacyAi.provider === 'anthropic' ? 'Anthropic' : 'Custom';
        models = [{
          id: uuidv4(),
          name: legacyAi.model || 'Default Model',
          provider: providerName,
          model: legacyAi.model || '',
          apiKey: legacyAi.apiKey,
          baseUrl: legacyAi.baseUrl || '',
          billing: 'Pay As You Go',
          enabled: true,
          createdAt: Date.now(),
        }];
        await storage.saveModels(models);
      }
      delete settings.ai;

      let activeModelId = storedActiveModel;
      const activeModel = models.find((m) => m.id === activeModelId && m.enabled);
      if (!activeModel) {
        activeModelId = models.find((m) => m.enabled)?.id ?? null;
        await storage.setActiveModelId(activeModelId);
      }

      let finalActiveId = activeId;
      if (!finalActiveId || !sessions.find((s) => s.id === finalActiveId)) {
        if (sessions.length > 0) {
          finalActiveId = sessions[0].id;
        } else {
          const newSession: ChatSession = {
            id: uuidv4(),
            title: '新对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          sessions.push(newSession);
          finalActiveId = newSession.id;
          await storage.saveSessions(sessions);
        }
        await storage.setActiveSessionId(finalActiveId);
      }

      set({
        settings,
        sessions,
        activeSessionId: finalActiveId,
        models,
        activeModelId,
        isLoaded: true,
      });
    },

    updateSettings: async (settings) => {
      await storage.saveSettings(settings);
      set({ settings });
    },

    setSkillLock: async (skillId) => {
      const { sessions, activeSessionId } = get();
      const idx = sessions.findIndex((s) => s.id === activeSessionId);
      if (idx === -1) return;
      const next = [...sessions];
      next[idx] = { ...next[idx], selectedSkillId: skillId, updatedAt: Date.now() };
      set({ sessions: next });
      await storage.saveSessions(next);
    },

    setShowSettings: (show) => set({ showSettings: show }),

    showToast: (text, type = 'success') => {
      clearTimeout(toastDismissTimer);
      clearTimeout(toastRemoveTimer);
      set({ toast: { id: ++toastSeq, text, type, hiding: false } });
      toastDismissTimer = setTimeout(() => {
        const cur = get().toast;
        if (!cur) return;
        set({ toast: { ...cur, hiding: true } });
        toastRemoveTimer = setTimeout(() => set({ toast: null }), 200);
      }, 1800);
    },

    addModel: async (model) => {
      const entry: ModelConfig = { ...model, id: uuidv4(), createdAt: Date.now() };
      const models = [...get().models, entry];
      let { activeModelId } = get();
      if (!activeModelId && entry.enabled) activeModelId = entry.id;
      set({ models, activeModelId });
      await Promise.all([storage.saveModels(models), storage.setActiveModelId(activeModelId)]);
    },

    updateModel: async (id, patch) => {
      const models = get().models.map((m) => (m.id === id ? { ...m, ...patch } : m));
      set({ models });
      await storage.saveModels(models);
    },

    deleteModel: async (id) => {
      let models = get().models.filter((m) => m.id !== id);
      let { activeModelId } = get();
      if (activeModelId === id) {
        activeModelId = models.find((m) => m.enabled)?.id ?? null;
        await storage.setActiveModelId(activeModelId);
      }
      set({ models, activeModelId });
      await storage.saveModels(models);
    },

    toggleModel: async (id) => {
      const models = get().models.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m));
      let { activeModelId } = get();
      const toggled = models.find((m) => m.id === id);
      if (toggled && !toggled.enabled && activeModelId === id) {
        activeModelId = models.find((m) => m.enabled)?.id ?? null;
        await storage.setActiveModelId(activeModelId);
      } else if (toggled?.enabled && !activeModelId) {
        activeModelId = id;
        await storage.setActiveModelId(activeModelId);
      }
      set({ models, activeModelId });
      await storage.saveModels(models);
    },

    setActiveModel: async (id) => {
      set({ activeModelId: id });
      await storage.setActiveModelId(id);
    },

    createSession: async () => {
      const session: ChatSession = {
        id: uuidv4(),
        title: '新对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const sessions = [session, ...get().sessions];
      set({ sessions, activeSessionId: session.id });
      await Promise.all([storage.saveSessions(sessions), storage.setActiveSessionId(session.id)]);
      return session.id;
    },

    switchSession: async (id) => {
      set({ activeSessionId: id });
      await storage.setActiveSessionId(id);
    },

    sendMessage: async (content) => {
      const { sessions, activeSessionId, settings, isGenerating, models, activeModelId } = get();
      if (isGenerating || !activeSessionId) return;

      const model = models.find((m) => m.id === activeModelId && m.enabled);

      const sessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
      if (sessionIndex === -1) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      const updatedSessions = [...sessions];
      const session = { ...updatedSessions[sessionIndex] };
      session.messages = [...session.messages, userMessage, assistantMessage];
      session.updatedAt = Date.now();
      if (session.messages.filter((m) => m.role === 'user').length === 1) {
        session.title = content.slice(0, 30) || '新对话';
      }
      updatedSessions[sessionIndex] = session;
      set({ sessions: updatedSessions, isGenerating: true });

      if (!model) {
        const { sessions: cur } = get();
        const idx = cur.findIndex((s) => s.id === activeSessionId);
        if (idx !== -1) {
          const s = { ...cur[idx] };
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: '⚠️ 尚未配置可用模型。请打开 设置 → 模型，添加并启用一个模型。',
          };
          s.messages = msgs;
          const next = [...cur];
          next[idx] = s;
          set({ sessions: next, isGenerating: false });
          if (settings.generation.autoSave) storage.saveSessions(next);
        }
        return;
      }

      await runGeneration(sessionIndex, assistantMessage.id, content, model);
    },

    regenerateLast: async () => {
      const { sessions, activeSessionId, models, activeModelId, isGenerating } = get();
      if (isGenerating || !activeSessionId) return;

      const model = models.find((m) => m.id === activeModelId && m.enabled);
      if (!model) return;

      const sessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
      if (sessionIndex === -1) return;

      const session = sessions[sessionIndex];
      const lastUserIdx = session.messages.map((m) => m.role).lastIndexOf('user');
      if (lastUserIdx === -1) return;

      const userText = session.messages[lastUserIdx].content;
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      const updatedSessions = [...sessions];
      const s = { ...updatedSessions[sessionIndex] };
      s.messages = [...s.messages.slice(0, lastUserIdx + 1), assistantMessage];
      s.updatedAt = Date.now();
      updatedSessions[sessionIndex] = s;
      set({ sessions: updatedSessions, isGenerating: true });

      await runGeneration(sessionIndex, assistantMessage.id, userText, model);
    },
  };
});
