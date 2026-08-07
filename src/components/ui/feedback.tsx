import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ms-ink/20 px-5 py-10 text-center">
      <p className="font-serif text-base text-ms-navy">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-ms-ink/65">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Chargement en cours…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-2xl border border-ms-ink/10 px-5 py-4">
      <span className="ds-spinner" aria-hidden="true" />
      <span className="text-sm text-ms-ink/70">{label}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ds-skeleton rounded-xl ${className}`} />;
}
