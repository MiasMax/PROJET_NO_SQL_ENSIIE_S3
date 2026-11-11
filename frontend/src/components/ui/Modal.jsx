import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

const MAX_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
};

const ModalContext = React.createContext({ titleId: undefined, onClose: undefined });

export default function Modal({
  isOpen,
  onClose,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
  children,
}) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = MAX_WIDTHS[size] || MAX_WIDTHS.md;

  return (
    <div
      className="fixed inset-0 z-[180] bg-[#111827]/55 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${widthClass} bg-neo-surface text-neo-ink border-[1.5px] border-neo-ink rounded-[8px] shadow-tactile-modal max-h-[92vh] flex flex-col overflow-hidden animate-modal-pop ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalContext.Provider value={{ titleId, onClose }}>
          {children}
        </ModalContext.Provider>
      </div>
    </div>
  );
}

Modal.Header = function ModalHeader({ title, subtitle, icon = null, rightSlot = null, hideClose = false }) {
  const { titleId, onClose } = React.useContext(ModalContext);

  return (
    <div className="px-5 py-4 border-b-[1.5px] border-neo-border bg-neo-surface flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-9 h-9 rounded-[6px] bg-neo-muted border-[1.5px] border-neo-border flex items-center justify-center shrink-0 text-neo-ink">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 id={titleId} className="text-base sm:text-lg font-bold text-neo-ink leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-neo-ink-3 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {!hideClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="w-9 h-9 rounded-[6px] border-[1.5px] border-transparent hover:border-neo-border hover:bg-neo-muted text-neo-ink-3 hover:text-neo-ink flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

Modal.Body = function ModalBody({ className = '', children }) {
  return (
    <div className={`p-5 overflow-y-auto flex-1 ${className}`}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ className = '', children }) {
  return (
    <div className={`px-5 py-3.5 border-t-[1.5px] border-neo-border bg-neo-muted flex items-center justify-end gap-2.5 flex-wrap shrink-0 ${className}`}>
      {children}
    </div>
  );
};

