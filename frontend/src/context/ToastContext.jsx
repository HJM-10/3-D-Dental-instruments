import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null); // { title, message, variant, onConfirm, onCancel }

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, title, message, duration, exiting: false }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = {
    success: (title, message, duration) => addToast('success', title, message, duration),
    error:   (title, message, duration) => addToast('error',   title, message, duration),
    warning: (title, message, duration) => addToast('warning', title, message, duration),
    info:    (title, message, duration) => addToast('info',    title, message, duration),
    confirm: (title, message, variant = 'danger') =>
      new Promise((resolve) => {
        setConfirm({
          title,
          message,
          variant,
          onConfirm: () => { setConfirm(null); resolve(true); },
          onCancel:  () => { setConfirm(null); resolve(false); },
        });
      }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastRenderer toasts={toasts} dismiss={dismiss} />
      {confirm && <ConfirmDialog {...confirm} />}
    </ToastContext.Provider>
  );
};

/* ── Toast Renderer ────────────────────────────────────────── */
const TOAST_CONFIG = {
  success: { Icon: CheckCircle,    label: 'Success' },
  error:   { Icon: XCircle,        label: 'Error' },
  warning: { Icon: AlertTriangle,  label: 'Warning' },
  info:    { Icon: Info,           label: 'Info' },
};

const ToastRenderer = ({ toasts, dismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => {
        const { Icon } = TOAST_CONFIG[t.type] || TOAST_CONFIG.info;
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type} ${t.exiting ? 'exiting' : ''}`}
            role="alert"
          >
            <div className="toast-icon">
              <Icon size={20} strokeWidth={2.5} />
            </div>
            <div className="toast-body">
              {t.title  && <p className="toast-title">{t.title}</p>}
              {t.message && <p className="toast-msg">{t.message}</p>}
            </div>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
            {t.duration > 0 && (
              <ToastProgress duration={t.duration} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const ToastProgress = ({ duration }) => {
  const [width, setWidth] = React.useState(100);
  React.useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setWidth(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div
      className="toast-progress"
      style={{ width: `${width}%`, transition: 'width 50ms linear' }}
    />
  );
};

/* ── Confirm Dialog ────────────────────────────────────────── */
const CONFIRM_CONFIG = {
  danger:  { Icon: AlertCircle,   confirmClass: 'btn-danger',   confirmLabel: 'Delete' },
  warning: { Icon: AlertTriangle, confirmClass: 'btn-danger',   confirmLabel: 'Proceed' },
  info:    { Icon: Info,          confirmClass: 'btn-primary',  confirmLabel: 'Confirm' },
};

const ConfirmDialog = ({ title, message, variant = 'danger', onConfirm, onCancel }) => {
  const { Icon, confirmClass, confirmLabel } = CONFIRM_CONFIG[variant] || CONFIRM_CONFIG.info;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-panel card" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
          <div className={`confirm-icon-wrap ${variant}`}>
            <Icon size={28} strokeWidth={2} />
          </div>
          <h3 id="confirm-title" style={{ marginBottom: '0.6rem' }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${confirmClass}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastProvider;
