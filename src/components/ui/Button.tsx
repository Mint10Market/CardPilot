import type { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--background)] hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--muted)] disabled:opacity-50",
  ghost:
    "bg-transparent text-[var(--foreground)] hover:bg-[var(--card)] disabled:opacity-50",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`min-h-[var(--touch-target-min)] inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-opacity transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const linkVariantClasses: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-[var(--background)] hover:opacity-90",
  secondary:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--muted)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--card)]",
};

export function LinkButton({
  variant = "secondary",
  href,
  children,
  className = "",
}: {
  variant?: Variant;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`min-h-[var(--touch-target-min)] inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-opacity transition-colors ${linkVariantClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
