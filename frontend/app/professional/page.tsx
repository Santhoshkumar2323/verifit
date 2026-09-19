"use client";

import { useEffect, useRef, useState } from "react";

import Navbar from "@/components/Navbar";
import ProfessionalCard from "@/components/ProfessionalCard";
import type {
  ApiProfessional,
  CreateBookingPayload,
} from "@/lib/api";
import {
  createBooking,
  getApiErrorMessage,
  getProfessionals,
} from "@/lib/api";

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<
    ApiProfessional[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] =
    useState("");

  const [selectedProfessional, setSelectedProfessional] =
    useState<ApiProfessional | null>(null);

  const [message, setMessage] = useState("");
  const [requestedAt, setRequestedAt] = useState("");

  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [bookingMessage, setBookingMessage] =
    useState<string | null>(null);

  const bookingLock = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfessionals() {
      setLoading(true);
      setError(null);

      try {
        const response = await getProfessionals({
          search: search.trim() || undefined,
          specialization:
            specialization || undefined,
        });

        if (!cancelled) {
          setProfessionals(response.professionals);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfessionals();

    return () => {
      cancelled = true;
    };
  }, [search, specialization]);

  function openBooking(
    professional: ApiProfessional,
  ) {
    setSelectedProfessional(professional);
    setMessage("");
    setRequestedAt("");
    setBookingMessage(null);
    bookingLock.current = false;
  }

  function closeBooking() {
    if (bookingLoading) {
      return;
    }

    setSelectedProfessional(null);
    setMessage("");
    setRequestedAt("");
    setBookingMessage(null);
    bookingLock.current = false;
  }

  async function submitBooking() {
    if (!selectedProfessional) {
      return;
    }

    if (bookingLock.current) {
      return;
    }

    if (!requestedAt) {
      setBookingMessage(
        "Please select a date and time.",
      );
      return;
    }

    const requestedDate = new Date(requestedAt);

    if (Number.isNaN(requestedDate.getTime())) {
      setBookingMessage(
        "Please select a valid date and time.",
      );
      return;
    }

    if (requestedDate.getTime() <= Date.now()) {
      setBookingMessage(
        "Please select a future date and time.",
      );
      return;
    }

    bookingLock.current = true;
    setBookingLoading(true);
    setBookingMessage(null);

    const payload: CreateBookingPayload = {
      professional_id:
        selectedProfessional.id,
      requested_at:
        requestedDate.toISOString(),
      message:
        message.trim() || undefined,
    };

    try {
      await createBooking(payload);

      setBookingMessage(
        "Booking request submitted successfully.",
      );

      setMessage("");
      setRequestedAt("");
    } catch (err) {
      setBookingMessage(
        getApiErrorMessage(err),
      );
    } finally {
      setBookingLoading(false);
      bookingLock.current = false;
    }
  }

  const specializations = Array.from(
    new Set(
      professionals
        .map(
          (professional) =>
            professional.specialization,
        )
        .filter(Boolean),
    ),
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <section className="vf-container py-10 sm:py-14">
        {/* Header */}
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
            Verified professionals
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">
            Get guidance from qualified professionals
          </h1>

          <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">
            Discover professionals with verified
            credentials and request a consultation
            directly through VeriFit.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-8 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="sr-only">
              Search professionals
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search professionals..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            />
          </label>

          <label className="block">
            <span className="sr-only">
              Filter by specialization
            </span>

            <select
              value={specialization}
              onChange={(event) =>
                setSpecialization(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
            >
              <option value="">
                All specializations
              </option>

              {specializations.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-[var(--danger)]/30 bg-white p-5 text-sm text-[var(--danger)]">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => {
                setSearch((current) => current);
              }}
              className="mt-3 font-semibold underline"
            >
              Check your connection and try again.
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl border border-[var(--border)] bg-white"
                />
              ),
            )}
          </div>
        )}

        {/* Professionals */}
        {!loading && !error && (
          <>
            {professionals.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
                <h2 className="text-lg font-bold text-[var(--text)]">
                  No professionals found
                </h2>

                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Try changing your search or
                  specialization filter.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {professionals.map(
                  (professional) => (
                    <ProfessionalCard
                      key={professional.id}
                      professional={professional}
                      onBook={openBooking}
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Booking modal */}
      {selectedProfessional && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeBooking();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                  Consultation request
                </p>

                <h2 className="mt-2 text-2xl font-black text-[var(--text)]">
                  Book with{" "}
                  {selectedProfessional.name}
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {
                    selectedProfessional.specialization
                  }
                </p>

                {selectedProfessional.verified && (
                  <p className="mt-2 text-xs font-semibold text-[var(--primary)]">
                    ✓ Verified professional
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeBooking}
                disabled={bookingLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--text-muted)] transition hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close booking dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Requested date and time
                </span>

                <input
                  type="datetime-local"
                  value={requestedAt}
                  min={new Date(
                    Date.now() -
                      new Date().getTimezoneOffset() *
                        60000,
                  )
                    .toISOString()
                    .slice(0, 16)}
                  onChange={(event) =>
                    setRequestedAt(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[var(--text)]">
                  Message
                </span>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  rows={5}
                  maxLength={2000}
                  placeholder="Tell the professional what you would like help with..."
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />

                <p className="mt-1 text-right text-xs text-[var(--text-muted)]">
                  {message.length}/2000
                </p>
              </label>
            </div>

            {bookingMessage && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  bookingMessage.includes(
                    "successfully",
                  )
                    ? "border-[var(--primary)]/30 bg-[var(--primary-light)] text-[var(--primary-dark)]"
                    : "border-[var(--danger)]/30 bg-white text-[var(--danger)]"
                }`}
              >
                {bookingMessage}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeBooking}
                disabled={bookingLoading}
                className="vf-button flex-1 border border-[var(--border)] bg-white text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void submitBooking()}
                disabled={bookingLoading}
                className="vf-button flex-1 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bookingLoading
                  ? "Submitting..."
                  : "Request booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}