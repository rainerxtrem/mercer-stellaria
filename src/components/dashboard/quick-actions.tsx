import Link from "next/link";

type QuickAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "secondary";
};

type QuickActionsProps = {
  actions: QuickAction[];
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const toneClass = action.tone === "secondary"
          ? "border border-[color:var(--app-border)] text-[color:var(--app-text)] bg-[color:var(--app-surface-elevated)]"
          : "bg-[color:var(--app-accent-strong)] text-[color:var(--app-surface)]";
        const className = `rounded-full px-4 py-2 text-xs font-semibold ${toneClass}`;

        if (action.href) {
          return (
            <Link key={action.label} href={action.href} className={className}>
              {action.label}
            </Link>
          );
        }

        return (
          <button key={action.label} type="button" className={className} onClick={action.onClick}>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
