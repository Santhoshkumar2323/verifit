"use client";

import { useState } from "react";

import type { ApiProfessional } from "@/lib/api";
import Verification from "./Verification";

interface ProfessionalCardProps {
  professional: ApiProfessional;
  onBook?: (professional: ApiProfessional) => void;
}

export default function ProfessionalCard({
  professional,
  onBook,
}: ProfessionalCardProps) {
  const [imageError, setImageError] = useState(false);

  const isVerified =
    professional.verification_status === "VERIFIED";

  const verifiedCredentials = professional.credentials
    .filter(
      (credential) => credential.status === "VERIFIED",
    )
    .slice(0, 3);

  const initials = professional.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleViewProfile() {
    window.location.href = `/professional?id=${encodeURIComponent(
      professional.id,
    )}`;
  }

  return (
    <article
      className={`vf-card overflow-hidden transition-all duration-200 ${
        isVerified
          ? "border-[var(--gold)]/40 shadow-[0_8px_30px_rgba(217,173,63,0.08)]"
          : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ${
            isVerified
              ? "bg-[var(--gold-light)] ring-2 ring-[var(--gold)]/20"
              : "bg-[var(--primary-light)]"
          }`}
        >
          {professional.avatar_url && !imageError ? (
            <img
              src={professional.avatar_url}
              alt={`${professional.name} profile`}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center text-sm font-bold ${
                isVerified
                  ? "text-[var(--gold)]"
                  : "text-[var(--primary)]"
              }`}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-[var(--text)]">
              {professional.name}
            </h3>

            {isVerified && (
              <Verification
                status="verified"
                size="sm"
              />
            )}
          </div>

          <p className="mt-1 text-sm font-medium text-[var(--primary)]">
            {professional.specialization}
          </p>
        </div>
      </div>

      {/* Bio */}
      {professional.bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-muted)]">
          {professional.bio}
        </p>
      )}

      {/* Experience */}
      <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text)]">
          {professional.experience_years}
        </span>

        <span>
          {professional.experience_years === 1
            ? "year"
            : "years"}{" "}
          experience
        </span>
      </div>

      {/* Verified Credentials */}
      {verifiedCredentials.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />

            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Verified credentials
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {verifiedCredentials.map((credential) => (
              <span
                key={credential.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/50 bg-[var(--gold-light)] px-3 py-1.5 text-xs font-semibold text-[#795b12]"
              >
                <span className="font-bold text-[var(--gold)]">
                  ✓
                </span>

                {credential.credential_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          className="vf-button flex-1 border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          onClick={handleViewProfile}
        >
          View profile
        </button>

        <button
          type="button"
          className="vf-button flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
          onClick={() => onBook?.(professional)}
        >
          Book
        </button>
      </div>
    </article>
  );
}