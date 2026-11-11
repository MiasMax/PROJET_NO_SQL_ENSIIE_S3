import React, { useEffect } from 'react';

export default function Drawer({
  isOpen,
  onClose,
  ariaLabel = 'Panneau latéral',
  widthClass = 'max-w-lg',
  zIndexClass = 'z-[160]',
  children,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex justify-end`}>
      <div
        className="fixed inset-0 bg-[#111827]/45 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative w-full ${widthClass} bg-neo-surface text-neo-ink border-l-[1.5px] border-neo-ink shadow-[-8px_0_30px_rgba(17,24,39,0.18)] flex flex-col h-full z-10 animate-drawer-in overflow-hidden`}
      >
        {children}
      </aside>
    </div>
  );
}

