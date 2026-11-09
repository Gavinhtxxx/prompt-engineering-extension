import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore } from './stores/app-store';
import { Header } from './components/Header';
import { ChatList } from './components/ChatList';
import { InputBar } from './components/InputBar';
import { SettingsPanel } from './components/SettingsPanel';
import { Toast } from './components/Toast';
import { storage } from './services/storage';

export default function App() {
  const {
    settings, sessions, activeSessionId,
    isGenerating, showSettings, isLoaded,
    load, updateSettings, setShowSettings,
    createSession, switchSession, sendMessage, regenerateLast,
  } = useAppStore();

  const [prefill, setPrefill] = useState<{ text: string; nonce: number }>();

  const pendingHandled = useRef(false);

  useEffect(() => {
    load().then(() => {
      if (pendingHandled.current) return;
      pendingHandled.current = true;
      const hasChromeStorage = typeof chrome !== 'undefined' && !!chrome.storage?.local;
      if (!hasChromeStorage) return;
      chrome.storage.local.get('gestalt_pending_text', (result) => {
        const text = result.gestalt_pending_text as string | undefined;
        if (text) {
          chrome.storage.local.remove('gestalt_pending_text');
          setTimeout(() => {
            useAppStore.getState().sendMessage(text);
          }, 100);
        }
      });
    });
  }, [load]);

  const theme = settings.appearance.theme;
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const fs = settings.appearance.fontSize;
    const z = fs === 'small' ? 0.92 : fs === 'large' ? 1.08 : 1;
    document.documentElement.style.zoom = String(z);
    document.documentElement.style.setProperty('--app-zoom', String(z));
  }, [settings.appearance.fontSize]);

  useEffect(() => {
    if (settings.appearance.compactMode) {
      document.documentElement.setAttribute('data-compact', 'true');
    } else {
      document.documentElement.removeAttribute('data-compact');
    }
  }, [settings.appearance.compactMode]);

  useEffect(() => {
    const parseShortcut = (s: string) => {
      const parts = s.toLowerCase().split('+');
      return {
        ctrl: parts.includes('ctrl'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
        key: parts[parts.length - 1],
      };
    };
    const sc = parseShortcut(settings.shortcuts.newChat);
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === sc.key &&
        e.ctrlKey === sc.ctrl &&
        e.shiftKey === sc.shift &&
        e.altKey === sc.alt
      ) {
        e.preventDefault();
        createSession();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts.newChat, createSession]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleExample = useCallback((text: string) => {
    setPrefill({ text, nonce: Date.now() });
  }, []);

  const handleExport = async () => {
    const json = await storage.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestalt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = await storage.importData(text);
      if (!result.ok) {
        alert(`导入失败: ${result.error}`);
        return;
      }
      await load();
    };
    input.click();
  };

  const handleClear = async () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await storage.clearAll();
      await load();
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg gap-2">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-primary-light animate-pulse-soft" />
          <div className="absolute inset-0 rounded-lg border-2 border-primary/30 border-t-transparent animate-spin" />
        </div>
        <span className="text-[10px] text-text-muted animate-shimmer">加载中...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg noise-bg relative overflow-hidden">
      <Header
        sessionTitle={activeSession?.title ?? '新对话'}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={createSession}
        onSwitchSession={switchSession}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatList
        messages={activeSession?.messages ?? []}
        isGenerating={isGenerating}
        onExample={handleExample}
        onRegenerate={regenerateLast}
      />
      <InputBar
        onSend={sendMessage}
        disabled={isGenerating}
        prefill={prefill}
      />
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
          onExport={handleExport}
          onImport={handleImport}
          onClear={handleClear}
        />
      )}
      <Toast />
    </div>
  );
}
