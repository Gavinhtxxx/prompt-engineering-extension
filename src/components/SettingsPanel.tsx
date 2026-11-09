import { useState } from 'react';
import type { AppSettings } from '../types';
import { ModelManager } from './ModelManager';
import manifest from '../../manifest.json' with { type: 'json' };

interface SettingsPanelProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  onExport: () => Promise<void>;
  onImport: () => Promise<void>;
  onClear: () => Promise<void>;
}

type Tab = 'ai' | 'generation' | 'appearance' | 'data' | 'shortcuts' | 'about';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ai', label: '模型' },
  { key: 'generation', label: '生成设置' },
  { key: 'appearance', label: '外观' },
  { key: 'data', label: '数据存储' },
  { key: 'shortcuts', label: '快捷键' },
  { key: 'about', label: '关于' },
];

export function SettingsPanel({ settings, onSave, onClose, onExport, onImport, onClear }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('ai');
  const [savedFlash, setSavedFlash] = useState(false);

  const patch = <K extends keyof AppSettings>(section: K, values: Partial<AppSettings[K]>) => {
    onSave({ ...settings, [section]: { ...settings[section], ...values } });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm flex animate-fade-in">
      <div className="w-full h-full flex flex-col bg-bg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-text">设置</h2>
            <span className={`text-[11px] text-success transition-opacity duration-300 ${savedFlash ? 'opacity-100' : 'opacity-0'}`}>已自动保存</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-hover-overlay transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-32 shrink-0 border-r border-border p-2.5 flex flex-col gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`text-left px-3.5 py-2.5 text-[13px] rounded-lg transition-colors ${
                  tab === t.key
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-muted hover:text-text hover:bg-hover-overlay'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {tab === 'ai' && <ModelManager />}

            {tab !== 'ai' && (
              <div className="h-full overflow-y-auto p-6">
                {tab === 'generation' && (
                  <div className="space-y-6">
                    <p className="text-[11px] text-text-muted leading-relaxed">提示词技能由 AI 自动路由，也可在输入栏的技能下拉中手动锁定。</p>
                    <Field label="回复语言">
                      <select
                        value={settings.generation.responseLanguage}
                        onChange={(e) => patch('generation', { responseLanguage: e.target.value as AppSettings['generation']['responseLanguage'] })}
                        className="input-field"
                      >
                        <option value="auto">自动</option>
                        <option value="zh">中文</option>
                        <option value="en">English</option>
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Max Tokens">
                        <input
                          type="number"
                          value={settings.generation.maxTokens}
                          onChange={(e) => patch('generation', { maxTokens: Number(e.target.value) })}
                          className="input-field"
                        />
                      </Field>
                      <Field label="Temperature">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={settings.generation.temperature}
                          onChange={(e) => patch('generation', { temperature: Number(e.target.value) })}
                          className="input-field"
                        />
                      </Field>
                    </div>
                    <Field label="最大长度">
                      <input
                        type="number"
                        value={settings.generation.maxLength}
                        onChange={(e) => patch('generation', { maxLength: Number(e.target.value) })}
                        className="input-field"
                      />
                    </Field>
                    <label className="flex items-center gap-2.5 text-[13px] text-text-secondary cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={settings.generation.autoSave}
                        onChange={(e) => patch('generation', { autoSave: e.target.checked })}
                        className="rounded border-border accent-primary"
                      />
                      自动保存对话
                    </label>
                  </div>
                )}

                {tab === 'appearance' && (
                  <div className="space-y-6">
                    <Field label="主题">
                      <select
                        value={settings.appearance.theme}
                        onChange={(e) => patch('appearance', { theme: e.target.value as AppSettings['appearance']['theme'] })}
                        className="input-field"
                      >
                        <option value="dark">深色</option>
                        <option value="light">浅色</option>
                        <option value="auto">跟随系统</option>
                      </select>
                    </Field>
                    <Field label="字体大小">
                      <select
                        value={settings.appearance.fontSize}
                        onChange={(e) => patch('appearance', { fontSize: e.target.value as AppSettings['appearance']['fontSize'] })}
                        className="input-field"
                      >
                        <option value="small">小</option>
                        <option value="medium">中</option>
                        <option value="large">大</option>
                      </select>
                    </Field>
                    <Field label="打开方式">
                      <select
                        value={settings.appearance.openMode}
                        onChange={(e) => patch('appearance', { openMode: e.target.value as AppSettings['appearance']['openMode'] })}
                        className="input-field"
                      >
                        <option value="sidePanel">浏览器侧边栏</option>
                        <option value="popup">悬浮小窗（独立窗口，可拖动）</option>
                      </select>
                      <p className="text-[10px] text-text-muted mt-1">切换后立即生效；也决定工具栏图标、Alt+G 与右键菜单的打开方式</p>
                    </Field>
                    <label className="flex items-center gap-2.5 text-[13px] text-text-secondary cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={settings.appearance.compactMode}
                        onChange={(e) => patch('appearance', { compactMode: e.target.checked })}
                        className="rounded border-border accent-primary"
                      />
                      紧凑模式
                    </label>
                  </div>
                )}

                {tab === 'data' && (
                  <div className="space-y-4">
                    <p className="text-[11px] text-text-muted">导出或导入你的设置、模型和对话历史</p>
                    <div className="flex gap-2">
                      <button onClick={onExport} className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors">
                        导出数据
                      </button>
                      <button onClick={onImport} className="flex-1 px-3 py-2 text-[11px] rounded-lg bg-hover-overlay text-text-secondary hover:text-text transition-colors">
                        导入数据
                      </button>
                    </div>
                    <div className="border-t border-border pt-3.5">
                      <p className="text-[11px] text-text-muted mb-2">清除所有本地数据（不可恢复）</p>
                      <button onClick={onClear} className="px-3 py-2 text-[11px] rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                        清除所有数据
                      </button>
                    </div>
                  </div>
                )}

                {tab === 'shortcuts' && (
                  <div className="space-y-6">
                    <Field label="打开侧边栏">
                      <input type="text" value={settings.shortcuts.openSidebar} readOnly className="input-field opacity-60 cursor-not-allowed" />
                      <p className="text-[10px] text-text-muted mt-1">在 chrome://extensions/shortcuts 修改</p>
                    </Field>
                    <Field label="快速生成">
                      <input type="text" value={settings.shortcuts.quickGenerate} readOnly className="input-field opacity-60 cursor-not-allowed" />
                    </Field>
                    <Field label="新对话">
                      <input
                        type="text"
                        value={settings.shortcuts.newChat}
                        onChange={(e) => patch('shortcuts', { newChat: e.target.value })}
                        className="input-field"
                      />
                    </Field>
                  </div>
                )}

                {tab === 'about' && (
                  <div className="space-y-3 text-center py-8">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary/20">
                      G
                    </div>
                    <h3 className="text-base font-semibold text-text">提示词工程</h3>
                    <p className="text-[11px] text-text-muted">v{manifest.version}</p>
                    <p className="text-[11px] text-text-muted mt-3">AI Prompt Generator<br />Chrome Sidebar Extension</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-2">{label}</label>
      {children}
    </div>
  );
}
