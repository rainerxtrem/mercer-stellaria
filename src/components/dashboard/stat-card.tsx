type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="surface stat-card reveal-up flex min-h-[10.25rem] flex-col justify-between p-4 sm:p-5 lg:p-6">
      <p className="text-[0.68rem] uppercase leading-snug tracking-[0.16em] text-ms-navy-soft sm:text-xs sm:tracking-[0.2em]">{label}</p>
      <p className="mt-2 break-words font-display text-[clamp(1.9rem,5vw,2.9rem)] leading-[1.04] text-ms-navy">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-snug text-ms-ink/75 sm:text-sm">{detail}</p> : null}
    </article>
  );
}
