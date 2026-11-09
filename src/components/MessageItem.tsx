import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types';
import { getSkill } from '../skills';
import { copyToClipboard } from '../services/clipboard';
import { useAppStore } from '../stores/app-store';

interface MessageItemProps {
  message: Message;
  index: number;
  isLastAssistant?: boolean;
  isGenerating?: boolean;
  onRegenerate?: () => void;
}

export function MessageItem({ message, index, isLastAssistant, isGenerating, onRegenerate }: MessageItemProps) {
  const isUser = message.role === 'user';
  const showToast = useAppStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(message.content);
    if (!ok) {
      showToast('复制失败，请手动选中文本复制', 'error');
      return;
    }
    showToast('提示词已复制到剪贴板');
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  if (!isUser && !message.content && isLastAssistant && isGenerating) {
    return null;
  }

  const skill = !isUser && message.skillId ? getSkill(message.skillId) : null;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2.5 animate-slide-up`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={`max-w-[85%] ${isUser ? '' : 'flex flex-col items-start'}`}>
        {skill && (
          <div className="flex items-center gap-1 px-1 pb-1 text-[10px] text-text-muted/70">
            <span>{skill.icon}</span>
            <span>{skill.name}</span>
          </div>
        )}
        <div
          className={`group relative px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap transition-all duration-200 ${
            isUser
              ? 'rounded-2xl rounded-br-md bg-gradient-to-r from-primary to-primary-light text-white shadow-md shadow-primary/15 hover:shadow-primary/25'
              : 'rounded-2xl rounded-bl-md bg-bg-card border border-border/60 text-text-secondary hover:border-border-light hover:bg-bg-card-hover'
          }`}
        >
          {message.content || (isUser ? '' : '...')}
          {!isUser && message.content && (
            <div
              className={`absolute -bottom-5 left-0 flex items-center gap-1.5 transition-opacity duration-200 ${
                copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <button
                onClick={handleCopy}
                className={`px-1.5 py-0.5 rounded border bg-bg-card text-[10px] transition-colors duration-200 ${
                  copied
                    ? 'text-success border-success/50'
                    : 'text-text-muted border-border/40 hover:text-primary'
                }`}
              >
                {copied ? '已复制 ✓' : '复制'}
              </button>
              {isLastAssistant && !isGenerating && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="px-1.5 py-0.5 rounded border border-border/40 bg-bg-card text-[10px] text-text-muted hover:text-primary transition-colors duration-200"
                >
                  重新生成
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
