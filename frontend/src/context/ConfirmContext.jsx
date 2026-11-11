import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        title: options?.title || 'Confirmer l’action',
        description: options?.description || '',
        details: options?.details || null,
        confirmLabel: options?.confirmLabel || 'Confirmer',
        cancelLabel: options?.cancelLabel || 'Annuler',
        tone: options?.tone || 'danger',
      });
    });
  }, []);

  const handleClose = useCallback((accepted) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialogState(null);
    if (resolve) resolve(accepted);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(dialogState)}
        title={dialogState?.title}
        description={dialogState?.description}
        details={dialogState?.details}
        confirmLabel={dialogState?.confirmLabel}
        cancelLabel={dialogState?.cancelLabel}
        tone={dialogState?.tone}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx.confirm;
}

