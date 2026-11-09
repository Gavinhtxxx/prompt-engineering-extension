import { useState } from 'react';
import type { ChatSession } from '../types';

interface HeaderProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
  onSwitchSession: (id: string) => void;
  sessionTitle: string;
  sessions: ChatSession[];
  activeSessionId: string | null;
}

export function Header({ onNewChat, onOpenSettings, onSwitchSession, sessionTitle, sessions, activeSessionId }: HeaderProps) {
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);

  return (
    <div className="glass-panel sticky top-0 z-20 border-b border-border/50">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <div className="relative w-6 h-6 rounded-lg bg-gradient-to-br from-primary via-primary-light to-accent flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-primary/20 shrink-0">
            G
          </div>
          <div className="relative min-w-0 flex-1">
            <button
              onClick={() => setSessionMenuOpen(!sessionMenuOpen)}
              className="flex items-center gap-1 max-w-full text-xs font-semibold text-text hover:text-primary transition-colors"
            >
              <span className="truncate">{sessionTitle}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${sessionMenuOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {sessionMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSessionMenuOpen(false)} />
                <div className="absolute left-0 top-6 z-30 w-52 max-h-60 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-xl shadow-black/20 py-1 animate-scale-in">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onSwitchSession(s.id); setSessionMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                        s.id === activeSessionId
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-text-secondary hover:bg-hover-overlay hover:text-text'
                      }`}
                    >
                      <span className="truncate flex-1 text-left">{s.title || '新对话'}</span>
                      {s.id === activeSessionId && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0 shrink-0">
          <button
            onClick={onNewChat}
            title="新对话"
            className="group p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover-overlay active:scale-95 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform duration-300">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={onOpenSettings}
            title="设置"
            className="group p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover-overlay active:scale-95 transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-45 transition-transform duration-300">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
