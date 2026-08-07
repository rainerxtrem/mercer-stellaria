"use client";

import { SectionBlock } from "@/components/dashboard/section-block";

type InternalModulePlaceholderProps = {
  title: string;
  subtitle: string;
  note: string;
};

export function InternalModulePlaceholder({ title, subtitle, note }: InternalModulePlaceholderProps) {
  return (
    <main className="workspace-shell mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-8 lg:py-6">
      <SectionBlock title={title} subtitle={subtitle}>
        <p className="text-sm text-ms-ink/75">{note}</p>
      </SectionBlock>
    </main>
  );
}
