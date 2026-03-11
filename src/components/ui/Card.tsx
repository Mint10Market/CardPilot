import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] transition-[box-shadow] hover:shadow-[var(--shadow-md)] ${className}`}
    >
      {children}
    </section>
  );
}
