import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { SkillPicker } from './SkillPicker';

interface InputBarProps {
  onSend: (content: string) => void;
  disabled: boolean;
  prefill?: { text: string; nonce: number };
}

export function InputBar({ onSend, disabled, prefill }: InputBarProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { models, activeModelId, setActiveModel, setShowSettings, sessions, activeSessionId, setSkillLock } = useAppStore();

  const enabledModels = models.filter((m) => m.enabled);
  const activeModel = models.find((m) => m.id === activeModelId && m.enabled);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const skillLock = activeSession?.selectedSkillId ?? null;

  useEffect(() => {
    if (!prefill) return;
    setValue(prefill.text);
    textareaRef.current?.focus();
  }, [prefill?.nonce]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="px-3 pb-2.5 pt-1.5 bg-gradient-to-t from-bg via-bg to-transparent shrink-0">
      <div className="flex items-center justify-between px-0.5 pb-1.5">
        <div className="relative">
          <button
            onClick={() => (enabledModels.length ? setModelMenuOpen(!modelMenuOpen) : setShowSettings(true))}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-card border border-border/70 text-[11px] text-text-muted hover:text-text hover:border-border-light transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
            </svg>
            <span className="max-w-[130px] truncate">{activeModel ? activeModel.name : '未配置模型'}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${modelMenuOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {modelMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setModelMenuOpen(false)} />
              <div className="absolute left-0 bottom-8 z-30 w-44 rounded-lg border border-border bg-bg-card shadow-xl shadow-border/40 py-1 animate-scale-in">
                {enabledModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setActiveModel(m.id); setModelMenuOpen(false); }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] text-text-secondary hover:bg-hover-overlay hover:text-text transition-colors"
                  >
                    <span className="truncate">{m.name}</span>
                    {m.id === activeModelId && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <SkillPicker value={skillLock} onChange={setSkillLock} />
        <span className="text-[10px] text-text-muted/50">Enter 发送 · Shift+Enter 换行</span>
      </div>
      <div
        className={`relative flex gap-2 items-end rounded-2xl border px-3.5 py-3 transition-all duration-300 ${
          focused
            ? 'bg-bg-card border-primary/60 shadow-[0_0_16px_-4px_rgba(99,102,241,0.3)]'
            : 'bg-bg-card border-border-light hover:border-border-light'
        }`}
      >
        {focused && (
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 blur-sm" />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="描述你的需求..."
          rows={2}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted resize-none outline-none min-h-[56px] max-h-[200px] leading-relaxed py-1"
        />
        <button
          onClick={handleSend}
          disabled={!hasContent || disabled}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
            hasContent && !disabled
              ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-md shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95'
              : 'bg-hover-overlay text-text-muted/50 cursor-not-allowed'
          }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
