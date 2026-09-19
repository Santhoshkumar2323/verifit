"use client";

export type VerificationStatus =
  | "verified"
  | "reviewed"
  | "pending"
  | "unverified";

interface VerificationProps {
  status: VerificationStatus;
  label?: string;
  compact?: boolean;
  size?: string;
}

const statusConfig: Record<
  VerificationStatus,
  {
    label: string;
    icon: string;
    className: string;
  }
> = {
  verified: {
    label: "Verified",
    icon: "✓",
    className:
      "border-[var(--vf-gold)] bg-[var(--vf-gold-light)] text-[#795b12]",
  },

  reviewed: {
    label: "Reviewed",
    icon: "✓",
    className:
      "border-[var(--vf-primary)] bg-[var(--vf-primary-light)] text-[var(--vf-primary-dark)]",
  },

  pending: {
    label: "Pending review",
    icon: "•",
    className:
      "border-[var(--vf-border)] bg-[var(--vf-background)] text-[var(--vf-text-muted)]",
  },

  unverified: {
    label: "Not verified",
    icon: "–",
    className:
      "border-[var(--vf-border)] bg-[var(--vf-background)] text-[var(--vf-text-muted)]",
  },
};

export default function Verification({
  status,
  label,
  compact = false,
  size,
}: VerificationProps) {
  const config = statusConfig[status];

  const sizeClass =
    size === "sm"
      ? "px-2 py-1 text-xs"
      : size === "lg"
        ? "px-3 py-1.5 text-sm"
        : compact
          ? "px-2 py-1 text-xs"
          : "px-2.5 py-1.5 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${config.className} ${sizeClass}`}
    >
      <span
        aria-hidden="true"
        className={
          status === "verified"
            ? "font-bold text-[var(--vf-gold-dark)]"
            : ""
        }
      >
        {config.icon}
      </span>

      <span>{label ?? config.label}</span>
    </span>
  );
}