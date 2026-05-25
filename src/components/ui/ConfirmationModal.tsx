
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'var(--accent)',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" style={{ zIndex: 20000 }}>
      <div className="modal" style={{ width: 'auto', minWidth: '280px', maxWidth: '90vw' }}>
        <h3 className="modal-title" style={{ marginBottom: '24px' }}>{title}</h3>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button 
            type="button" 
            className="btn-cancel" 
            style={{ flex: 'none', padding: '8px 16px', background: 'none', border: 'none' }}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            className="btn-save" 
            style={{ flex: 'none', padding: '8px 16px', background: confirmColor, color: '#fff' }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
