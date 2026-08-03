type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="surface stat-card reveal-up p-5 lg:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">{label}</p>
      <p className="mt-3 font-display text-4xl leading-none text-ms-navy md:text-[2.8rem]">{value}</p>
      {detail ? <p className="mt-2 text-sm text-ms-ink/70">{detail}</p> : null}
    </article>
  );
}
