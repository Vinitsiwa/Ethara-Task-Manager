import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import { useBodyScrollLock, useKey } from "./hooks";

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useBodyScrollLock(open);
  useKey("Escape", () => { if (open) onClose(); });

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal aria-labelledby="modal-title" role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={clsx(
          "relative z-10 w-full animate-fade-in rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl",
          widths[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="modal-title" className="text-base font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-800 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
