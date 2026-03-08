"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FeedbackType = "success" | "error" | "info";

type Toast = { message: string; type: FeedbackType } | null;

type ContextValue = {
  toast: Toast;
  showToast: (message: string, type?: FeedbackType) => void;
};

const FeedbackContext = createContext<ContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: FeedbackType = "info") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, AUTO_DISMISS_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[min(90vw,24rem)] rounded-[var(--radius)] border px-4 py-3 text-sm font-medium shadow-lg"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--foreground)",
            borderColor:
              toast.type === "success"
                ? "var(--success)"
                : toast.type === "error"
                  ? "var(--error)"
                  : "var(--info)",
          }}
        >
          {toast.message}
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) return { toast: null, showToast: () => {} };
  return ctx;
}
