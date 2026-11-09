import { useRef, useEffect } from 'react';
import type { Message } from '../types';
import { MessageItem } from './MessageItem';

interface ChatListProps {
  messages: Message[];
  isGenerating: boolean;
  onExample?: (text: string) => void;
  onRegenerate?: () => void;
}

const EXAMPLES = [
  { icon: '🖼', label: '游戏主视觉图', text: '为一支独立游戏生成一张宣传主视觉：雨夜赛博朋克街道，霓虹灯倒影，一个撑透明伞的主角背影' },
  { icon: '💻', label: '个人网站搭建', text: '我想做一个个人网站，展示我的设计作品和简历，帮我生成一个可以直接发给 AI 编程助手的建站提示词' },
  { icon: '✍️', label: '小红书文案', text: '给我的手冲咖啡工作室写一篇小红书探店引流笔记的提示词，目标读者是都市白领女性' },
  { icon: '🎵', label: 'Lo-fi 音乐', text: '生成一首适合深夜写作的 lo-fi 嘻哈钢琴曲，用在 Suno 里' },
];

export function ChatList({ messages, isGenerating, onExample, onRegenerate }: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 text-center animate-fade-in">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary-light to-accent flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-xl shadow-primary/25 animate-pulse-soft">
          G
          <div className="absolute -inset-2.5 rounded-[22px] bg-gradient-to-br from-primary/15 to-accent/15 blur-lg -z-10" />
        </div>
        <h2 className="text-lg font-bold mb-1.5 gradient-text">描述需求，即刻获得专业提示词</h2>
        <p className="text-[13px] text-text-muted mb-6 max-w-[250px] leading-relaxed">
          一句话说明你的需求，AI 自动选择专业领域技能，<br />直接输出可复制使用的成品提示词
        </p>
        <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
          {EXAMPLES.map((tag, i) => (
            <button
              key={tag.label}
              onClick={() => onExample?.(tag.text)}
              className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-card/70 border border-border/60 text-xs text-text-muted hover:text-text hover:border-primary/40 hover:bg-bg-card-hover active:scale-[0.97] transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${i * 60 + 150}ms` }}
            >
              <span className="text-sm group-hover:scale-110 transition-transform duration-200">{tag.icon}</span>
              <span className="truncate">{tag.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const lastAssistantIdx = messages.length - 1 - [...messages].reverse().findIndex((m) => m.role === 'assistant');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5">
      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id}
          message={msg}
          index={i}
          isLastAssistant={i === messages.length - 1 && msg.role === 'assistant'}
          isGenerating={isGenerating}
          onRegenerate={i === lastAssistantIdx && msg.role === 'assistant' ? onRegenerate : undefined}
        />
      ))}
      {isGenerating && (
        <div className="flex justify-start mb-2.5 animate-fade-in">
          <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-bg-card border border-border/60">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-primary/70 rounded-full"
                  style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.16}s infinite` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
