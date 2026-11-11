import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, tone = 'info') => {
    if (!message) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ id: Date.now(), message, tone });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 4200);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const toneStyles =
    toast?.tone === 'success'
      ? { bar: 'bg-[#15803D]', icon: <CheckCircle2 size={18} className="text-[#15803D]" /> }
      : toast?.tone === 'error'
      ? { bar: 'bg-[#D93829]', icon: <AlertCircle size={18} className="text-[#D93829]" /> }
      : { bar: 'bg-neo-cobalt', icon: <Info size={18} className="text-neo-cobalt" /> };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[250] max-w-sm w-[calc(100vw-2.5rem)] bg-neo-surface text-neo-ink border-[1.5px] border-neo-ink rounded-[8px] shadow-tactile-modal overflow-hidden flex items-stretch animate-modal-pop"
        >
          <div className={`w-1.5 shrink-0 ${toneStyles.bar}`} aria-hidden="true" />
          <div className="flex items-center gap-3 px-3.5 py-3 flex-1 min-w-0">
            <span className="shrink-0" aria-hidden="true">{toneStyles.icon}</span>
            <p className="text-xs sm:text-sm font-medium text-neo-ink leading-snug flex-1">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Fermer la notification"
              className="w-7 h-7 rounded-[4px] hover:bg-neo-alt text-neo-ink-3 hover:text-neo-ink flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

