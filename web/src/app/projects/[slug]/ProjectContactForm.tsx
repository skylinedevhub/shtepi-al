"use client";

import { useState } from "react";

interface ProjectContactFormProps {
  projectId: string;
  projectName: string;
}

export default function ProjectContactForm({
  projectId,
  projectName,
}: ProjectContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `Pershendetje, jam i interesuar per projektin "${projectName}". Deshiroj me shume informacion.`
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: projectId,
          sender_name: name,
          sender_email: email,
          sender_phone: phone || undefined,
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gabim ne dergimin e mesazhit");
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gabim ne dergimin e mesazhit"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <svg
          className="mx-auto size-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-3 font-medium text-green-800">
          Mesazhi u dergua me sukses!
        </p>
        <p className="mt-1 text-sm text-green-700">
          Zhvilluesi do t{"'"}ju kontaktoje se shpejti.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warm-gray-light/40 bg-white p-6 shadow-sm">
      <h3 className="font-display text-lg font-bold text-navy">
        Kerkoni informacion
      </h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="contact-name"
            className="block text-xs font-medium text-warm-gray"
          >
            Emri *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-gray-light/60 px-3 py-2 text-sm text-navy placeholder:text-warm-gray-light focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            placeholder="Emri juaj"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-xs font-medium text-warm-gray"
          >
            Email *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-gray-light/60 px-3 py-2 text-sm text-navy placeholder:text-warm-gray-light focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            placeholder="email@shembull.com"
          />
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            className="block text-xs font-medium text-warm-gray"
          >
            Telefoni
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-gray-light/60 px-3 py-2 text-sm text-navy placeholder:text-warm-gray-light focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
            placeholder="+355 6X XXX XXXX"
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="block text-xs font-medium text-warm-gray"
          >
            Mesazhi *
          </label>
          <textarea
            id="contact-message"
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-gray-light/60 px-3 py-2 text-sm text-navy placeholder:text-warm-gray-light focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-btn bg-terracotta px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-60"
        >
          {submitting ? "Po dergohet..." : "Dergo mesazhin"}
        </button>
      </form>
    </div>
  );
}
