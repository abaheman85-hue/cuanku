import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Mascot } from '../components/Mascot';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type ToastTone = 'success' | 'error';
type ToastFn = (message: string, tone?: ToastTone) => void;

interface FeedbackValue {
  confirm: ConfirmFn;
  toast: ToastFn;
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

let toastCounter = 0;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setDialog((previous) => {
        previous?.resolve(false);
        return { ...options, resolve };
      });
    });
  }, []);

  const toast = useCallback<ToastFn>((message, tone = 'success') => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3600);
    timers.current.push(timer);
  }, []);

  const resolveDialog = useCallback(
    (value: boolean) => {
      setDialog((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [],
  );

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Modal
        open={dialog !== null}
        onClose={() => resolveDialog(false)}
        title={dialog?.title ?? 'Konfirmasi'}
        size="sm"
        footer={
          dialog ? (
            <>
              <Button onClick={() => resolveDialog(false)}>
                {dialog.cancelLabel ?? 'Batal'}
              </Button>
              <Button
                variant={dialog.danger ? 'danger' : 'primary'}
                onClick={() => resolveDialog(true)}
              >
                {dialog.confirmLabel ?? 'Lanjutkan'}
              </Button>
            </>
          ) : null
        }
      >
        <div className="confirm">
          <Mascot className="confirm__mascot" decorative />
          <p>{dialog?.message ?? 'Lanjutkan tindakan ini?'}</p>
        </div>
      </Modal>

      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast--${item.tone}`} role="status">
            {item.tone === 'success' ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <AlertTriangle aria-hidden="true" />
            )}
            {item.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback harus dipakai di dalam FeedbackProvider.');
  return value;
}
