import { useState } from 'react';
import type { ModelConfig } from '../types';
import { PROVIDER_PRESETS } from '../types';
import { useAppStore } from '../stores/app-store';
import { llmService } from '../services/llm';

export function ModelManager() {
  const { models, activeModelId, addModel, updateModel, deleteModel, toggleModel, setActiveModel } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModelConfig | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; error?: string } | null>(null);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (m: ModelConfig) => {
    setEditing(m);
    setMenuFor(null);
    setModalOpen(true);
  };

  const handleDelete = async (m: ModelConfig) => {
    setMenuFor(null);
    if (confirm(`确定删除模型「${m.name}」吗？`)) {
      await deleteModel(m.id);
    }
  };

  const handleTest = async (m: ModelConfig) => {
    setMenuFor(null);
    setTestingId(m.id);
    setTestResult(null);
    const result = await llmService.testConnection(m);
    setTestResult({ id: m.id, ok: result.ok, error: result.error });
    setTestingId(null);
    setTimeout(() => setTestResult(null), 5000);
  };

  return (
    <div className="h-full overflow-y-auto p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-text">模型</h2>
          <p className="text-[11px] text-text-muted mt-1">使用自有 API Key 管理自定义模型。</p>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-text text-bg text-[11px] font-medium hover:opacity-85 active:scale-95 transition-all duration-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          添加模型
        </button>
      </div>

      {models.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border-light py-10 px-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-hover-overlay flex items-center justify-center text-text-muted mb-3">
            <BoltIcon />
          </div>
          <p className="text-xs text-text-muted mb-1">暂无模型</p>
          <p className="text-[11px] text-text-muted/70 mb-4">添加一个模型并启用后即可开始对话</p>
          <button onClick={openAdd} className="px-3 py-1.5 rounded-lg bg-text text-bg text-[11px] font-medium hover:opacity-85 active:scale-95 transition-all">
            添加模型
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-bg-card overflow-visible">
          {models.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-2.5 px-3 py-3 ${i > 0 ? 'border-t border-dashed border-border/70' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-hover-overlay flex items-center justify-center text-text-muted shrink-0">
                <BoltIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-text truncate">{m.name}</span>
                  {m.id === activeModelId && (
                    <span className="shrink-0 text-[9px] px-1.5 py-px rounded-full bg-primary/15 text-primary font-medium">默认</span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 truncate">
                  {m.provider} · {m.billing}
                  {testResult?.id === m.id && (
                    <span className={testResult.ok ? 'text-success ml-1.5' : 'text-danger ml-1.5'}>
                      {testResult.ok ? '· 连接成功' : `· ${testResult.error?.slice(0, 60) ?? '连接失败'}`}
                    </span>
                  )}
                  {testingId === m.id && <span className="text-text-muted ml-1.5">· 测试中...</span>}
                </p>
              </div>
              <div className="relative flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                  className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover-overlay transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
                </button>
                {menuFor === m.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 top-8 z-30 w-28 rounded-lg border border-border bg-bg-card shadow-xl shadow-border/40 py-1 animate-scale-in">
                      {m.id !== activeModelId && (
                        <MenuBtn onClick={() => { setActiveModel(m.id); setMenuFor(null); }}>设为默认</MenuBtn>
                      )}
                      <MenuBtn onClick={() => handleTest(m)}>测试连接</MenuBtn>
                      <MenuBtn onClick={() => openEdit(m)}>编辑</MenuBtn>
                      <MenuBtn danger onClick={() => handleDelete(m)}>删除</MenuBtn>
                    </div>
                  </>
                )}
                <Toggle checked={m.enabled} onChange={() => toggleModel(m.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ModelModal
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSave={async (data) => {
            if (editing) {
              await updateModel(editing.id, data);
            } else {
              await addModel(data);
            }
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MenuBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-text-secondary hover:bg-hover-overlay hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-text' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
          checked ? 'left-[18px] bg-bg' : 'left-0.5 bg-bg-card'
        }`}
      />
    </button>
  );
}

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

interface ModelModalProps {
  initial: ModelConfig | null;
  onClose: () => void;
  onSave: (data: Omit<ModelConfig, 'id' | 'createdAt'>) => Promise<void>;
}

function ModelModal({ initial, onClose, onSave }: ModelModalProps) {
  const [provider, setProvider] = useState(initial?.provider ?? 'DeepSeek');
  const [name, setName] = useState(initial?.name ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? PROVIDER_PRESETS[0].baseUrl);
  const [error, setError] = useState('');

  const preset = PROVIDER_PRESETS.find((p) => p.name === provider);

  const handleProvider = (p: string) => {
    setProvider(p);
    const found = PROVIDER_PRESETS.find((x) => x.name === p);
    if (found) {
      setBaseUrl(found.baseUrl);
      if (found.models.length === 1) setModel(found.models[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('请填写模型名称');
    if (!model.trim()) return setError('请填写模型 ID');
    if (!apiKey.trim()) return setError('请填写 API Key');
    if (!baseUrl.trim()) return setError('请填写 Base URL');
    await onSave({
      name: name.trim(),
      provider,
      model: model.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      billing: 'Pay As You Go',
      enabled: initial?.enabled ?? true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-[88%] max-w-sm rounded-2xl border border-border bg-bg-card p-4 shadow-2xl shadow-border/50 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-text mb-3">{initial ? '编辑模型' : '添加模型'}</h3>
        <div className="space-y-3">
          <Field label="服务商">
            <select value={provider} onChange={(e) => handleProvider(e.target.value)} className="input-field">
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            {preset?.note && <p className="text-[10px] text-text-muted mt-1">{preset.note}</p>}
          </Field>
          <Field label="显示名称">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 DeepSeek-V4-Flash" className="input-field" />
          </Field>
          <Field label="模型 ID">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={preset?.models[0] ?? 'model-id'}
              list="preset-models"
              className="input-field"
            />
            <datalist id="preset-models">
              {preset?.models.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>
          <Field label="API Key">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="input-field" />
          </Field>
          <Field label="Base URL">
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="input-field" />
          </Field>
        </div>
        {error && <p className="text-[11px] text-danger mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[11px] text-text-muted hover:text-text hover:bg-hover-overlay transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-text text-bg text-[11px] font-medium hover:opacity-85 active:scale-95 transition-all">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
