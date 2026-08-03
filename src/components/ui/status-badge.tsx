import { StatusBadgeTone } from "@/lib/status-mapping";

type StatusBadgeProps = {
  label: string;
  tone: StatusBadgeTone;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  gold: "border-amber-300 bg-amber-50 text-amber-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>{label}</span>;
}
