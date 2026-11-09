import { useState } from 'react';
import { SKILLS } from '../skills';
import { getSkill } from '../skills';

interface SkillPickerProps {
  /** null = 自动路由 */
  value: string | null;
  onChange: (skillId: string | null) => void;
}

export function SkillPicker({ value, onChange }: SkillPickerProps) {
  const [open, setOpen] = useState(false);
  const skill = value ? getSkill(value) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-colors ${
          skill
            ? 'bg-primary/10 border-primary/40 text-primary'
            : 'bg-bg-card border-border/70 text-text-muted hover:text-text hover:border-border-light'
        }`}
      >
        <span className="text-[12px] leading-none">{skill ? skill.icon : '⚡'}</span>
        <span className="max-w-[110px] truncate">{skill ? skill.name : '自动'}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-8 z-30 w-52 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-xl shadow-border/40 py-1 animate-scale-in">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] hover:bg-hover-overlay transition-colors"
            >
              <span className="flex items-center gap-2 text-text-secondary">
                <span>⚡</span>
                <span>自动路由</span>
              </span>
              {!value && <CheckIcon />}
            </button>
            <div className="my-1 border-t border-border/60" />
            {SKILLS.map((s) => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] hover:bg-hover-overlay transition-colors"
              >
                <span className="flex items-center gap-2 text-text-secondary">
                  <span>{s.icon}</span>
                  <span className="truncate">{s.name}</span>
                </span>
                {value === s.id && <CheckIcon />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
