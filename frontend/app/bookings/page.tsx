"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import {
  getApiErrorMessage,
  getMyBookings,
  type ApiBooking,
  type BookingStatus,
} from "@/lib/api";

function getStatusClasses(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "border-[var(--primary)]/20 bg-[var(--primary-light)] text-[var(--primary-dark)]";

    case "CANCELLED":
      return "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]";

    case "COMPLETED":
      return "border-[var(--gold)]/30 bg-[var(--gold-light)] text-[#795b12]";

    case "PENDING":
    default:
      return "border-[var(--border)] bg-[var(--background)] text-[var(--text-muted)]";
  }
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";

    case "CANCELLED":
      return "Cancelled";

    case "COMPLETED":
      return "Completed";

    case "PENDING":
    default:
      return "Pending";
  }
}

function formatRequestedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BookingCard({
  booking,
}: {
  booking: ApiBooking;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />

            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
              Professional booking
            </p>
          </div>

          <h2 className="mt-2 text-lg font-black text-[var(--text)]">
            Consultation request
          </h2>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClasses(
            booking.status,
          )}`}
        >
          {getStatusLabel(booking.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--background)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Requested for
          </p>

          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            {formatRequestedAt(booking.requested_at)}
          </p>
        </div>

        <div className="rounded-xl bg-[var(--background)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Booking ID
          </p>

          <p className="mt-1 break-all text-xs font-medium text-[var(--text)]">
            {booking.id}
          </p>
        </div>
      </div>

      {booking.message && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Your message
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">
            {booking.message}
          </p>
        </div>
      )}
    </article>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getMyBookings();
      setBookings(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <main className="vf-container py-8 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <section className="mb-8">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />

              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                Your activity
              </p>
            </div>

            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">
                  My bookings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
                  View your consultation requests and track their current
                  status.
                </p>
              </div>

              <Link
                href="/professional"
                className="vf-button w-fit border border-[var(--border)] bg-white text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                Find a professional
              </Link>
            </div>
          </section>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
                >
                  <div className="animate-pulse">
                    <div className="h-3 w-36 rounded bg-[var(--border)]" />
                    <div className="mt-3 h-6 w-56 rounded bg-[var(--border)]" />

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="h-20 rounded-xl bg-[var(--background)]" />
                      <div className="h-20 rounded-xl bg-[var(--background)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <section className="rounded-2xl border border-[var(--danger)]/30 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[var(--text)]">
                Could not load your bookings
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadBookings()}
                className="vf-button mt-5 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
              >
                Try again
              </button>
            </section>
          )}

          {!loading && !error && bookings.length === 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-sm sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold-light)] text-xl font-black text-[var(--gold)]">
                +
              </div>

              <h2 className="mt-5 text-xl font-black text-[var(--text)]">
                No bookings yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                When you request a consultation with a professional, your
                booking will appear here.
              </p>

              <Link
                href="/professional"
                className="vf-button mt-6 inline-flex bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
              >
                Browse professionals
              </Link>
            </section>
          )}

          {!loading && !error && bookings.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-[var(--text)]">
                  Booking requests
                </h2>

                <span className="text-sm text-[var(--text-muted)]">
                  {bookings.length}{" "}
                  {bookings.length === 1 ? "booking" : "bookings"}
                </span>
              </div>

              <div className="space-y-4">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}