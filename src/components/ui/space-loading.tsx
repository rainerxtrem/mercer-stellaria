import { Skeleton } from "@/components/ui";

export function SpaceLoading({ label }: { label: string }) {
  return (
    <main className="workspace-shell mx-auto w-full max-w-[1400px] px-4 py-6">
      <div className="workspace-grid gap-4">
        <header className="workspace-hero">
          <p className="workspace-kicker">{label}</p>
          <Skeleton className="mt-3 h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-64" />
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        Chargement de l&apos;espace {label}
      </span>
    </main>
  );
}
