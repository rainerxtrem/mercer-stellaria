"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./button";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({ isOpen, onClose, title, description, footer, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <button type="button" aria-label="Fermer" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="surface relative z-10 max-h-full w-full max-w-2xl overflow-y-auto p-6">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl text-ms-navy">{title}</h2>
            {description ? <p className="mt-1 text-sm text-ms-ink/70">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer la fenêtre">
            ✕
          </Button>
        </header>
        {children}
        {footer ? <footer className="mt-5 flex flex-wrap justify-end gap-2">{footer}</footer> : null}
      </div>
    </div>
  );
}
