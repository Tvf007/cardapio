'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

let toastId = 0;
const listeners: Set<(toast: ToastMessage) => void> = new Set();

export function useToast() {
  const addToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 3000
  ) => {
    const id = `toast-${toastId++}`;
    const toast: ToastMessage = { id, message, type, duration };
    listeners.forEach(listener => listener(toast));
  }, []);

  return {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
  };
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const handleToast = (toast: ToastMessage) => {
      setToasts(prev => [...prev, toast]);

      if (toast.duration > 0) {
        const timeout = setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
          timersRef.current.delete(toast.id);
        }, toast.duration);

        timersRef.current.set(toast.id, timeout);
      }
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
      // Clean up all timers on unmount
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast ${toast.type}`}
          role="alert"
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Fechar notificacao"
            >
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
