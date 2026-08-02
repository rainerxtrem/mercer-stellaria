type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="surface p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-ms-navy-soft">{label}</p>
      <p className="mt-3 font-display text-4xl text-ms-navy">{value}</p>
      {detail ? <p className="mt-1 text-sm text-ms-ink/70">{detail}</p> : null}
    </article>
  );
}
