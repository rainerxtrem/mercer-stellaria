import { StatCard } from "@/components/dashboard/stat-card";

type MetricItem = {
  label: string;
  value: string;
  detail?: string;
};

type MetricsGridProps = {
  items: MetricItem[];
  className?: string;
};

export function MetricsGrid({ items, className }: MetricsGridProps) {
  return (
    <section className={className ?? "grid gap-4 md:grid-cols-2 xl:grid-cols-4"}>
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
      ))}
    </section>
  );
}
