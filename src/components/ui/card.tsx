import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, actions, children, className = "" }: CardProps) {
  return (
    <section className={`surface p-5 ${className}`}>
      {title || actions ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="font-serif text-lg text-ms-navy">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-ms-ink/70">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
