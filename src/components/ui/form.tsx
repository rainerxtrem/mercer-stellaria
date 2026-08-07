import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlClasses =
  "w-full rounded-xl border border-ms-ink/15 bg-white/80 px-3 py-2 text-sm text-ms-ink outline-none transition focus:border-ms-navy-soft focus:ring-2 focus:ring-ms-navy-soft/25 disabled:cursor-not-allowed disabled:opacity-60";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ms-ink/60">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-ms-ink/55">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${controlClasses} ${className}`} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${controlClasses} min-h-[96px] resize-y ${className}`} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${controlClasses} ${className}`}>
      {children}
    </select>
  );
}
