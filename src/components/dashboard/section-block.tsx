import { ReactNode } from "react";

type SectionBlockProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SectionBlock({ title, subtitle, actions, children }: SectionBlockProps) {
  return (
    <section className="surface section-block reveal-up p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl text-ms-navy md:text-[2.05rem]">{title}</h2>
          <p className="mt-1 text-sm text-ms-ink/70">{subtitle}</p>
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div className="gold-divider my-5" />
      {children}
    </section>
  );
}
