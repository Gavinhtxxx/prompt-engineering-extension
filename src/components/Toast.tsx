import { useAppStore } from '../stores/app-store';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute bottom-3 left-1/2 z-50 flex max-w-[86%] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs shadow-xl glass-panel ${
        isError ? 'border-danger/40 text-danger' : 'border-success/40 text-success'
      } ${toast.hiding ? 'animate-fade-out' : 'animate-slide-up'}`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        {isError ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </>
        ) : (
          <polyline points="20 6 9 17 4 12" />
        )}
      </svg>
      <span className="truncate">{toast.text}</span>
    </div>
  );
}
