"use client";

import { useEffect, useState, useCallback } from "react";
import type { PlanFeatures } from "@/lib/db/schema";

interface Plan {
  id: string;
  name: string;
  slug: string;
  type: "agency" | "buyer" | "data";
  priceEur: number;
  billingInterval: "monthly" | "yearly";
  features: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
  subscriberCount: number;
  createdAt: string | null;
}

const EMPTY_FEATURES: PlanFeatures = {
  listing_limit: null,
  lead_limit_monthly: null,
  featured_cities: null,
  has_crm_export: false,
  has_whatsapp_routing: false,
  has_api_access: false,
  has_analytics_advanced: false,
  team_seats: 1,
  ranking_boost: 0,
};

const PLAN_TYPES: { value: Plan["type"]; label: string }[] = [
  { value: "agency", label: "Agjenci" },
  { value: "buyer", label: "Bleres" },
  { value: "data", label: "Te dhena" },
];

const FEATURE_LABELS: { key: keyof PlanFeatures; label: string; type: "boolean" | "number" }[] = [
  { key: "listing_limit", label: "Limit njoftimesh", type: "number" },
  { key: "lead_limit_monthly", label: "Limit lead-esh/muaj", type: "number" },
  { key: "featured_cities", label: "Qytete te vecanta", type: "number" },
  { key: "has_crm_export", label: "Eksport CRM", type: "boolean" },
  { key: "has_whatsapp_routing", label: "WhatsApp routing", type: "boolean" },
  { key: "has_api_access", label: "Akses API", type: "boolean" },
  { key: "has_analytics_advanced", label: "Analitike te avancuara", type: "boolean" },
  { key: "team_seats", label: "Vende ekipi", type: "number" },
  { key: "ranking_boost", label: "Rritje renditjeje (0-3)", type: "number" },
];

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formType, setFormType] = useState<Plan["type"]>("agency");
  const [formPrice, setFormPrice] = useState("");
  const [formInterval, setFormInterval] = useState<"monthly" | "yearly">("monthly");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formFeatures, setFormFeatures] = useState<PlanFeatures>(EMPTY_FEATURES);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  function openCreateModal() {
    setEditingPlan(null);
    setFormName("");
    setFormSlug("");
    setFormType("agency");
    setFormPrice("");
    setFormInterval("monthly");
    setFormSortOrder("0");
    setFormFeatures({ ...EMPTY_FEATURES });
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormType(plan.type);
    setFormPrice(String(plan.priceEur / 100));
    setFormInterval(plan.billingInterval);
    setFormSortOrder(String(plan.sortOrder));
    setFormFeatures({ ...plan.features });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const priceEur = Math.round(parseFloat(formPrice) * 100);
    if (isNaN(priceEur) || priceEur < 0) {
      setError("Cmimi duhet te jete nje numer valid");
      setSaving(false);
      return;
    }

    const payload = {
      name: formName,
      slug: formSlug,
      type: formType,
      priceEur,
      billingInterval: formInterval,
      sortOrder: parseInt(formSortOrder, 10) || 0,
      features: formFeatures,
    };

    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan ? {
          name: payload.name,
          priceEur: payload.priceEur,
          billingInterval: payload.billingInterval,
          sortOrder: payload.sortOrder,
          features: payload.features,
        } : payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Ka ndodhur nje gabim");
        setSaving(false);
        return;
      }

      setModalOpen(false);
      await loadPlans();
    } catch {
      setError("Ka ndodhur nje gabim rrjeti");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    setTogglingId(plan.id);
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Ka ndodhur nje gabim");
        return;
      }

      await loadPlans();
    } finally {
      setTogglingId(null);
    }
  }

  function updateFeature(key: keyof PlanFeatures, value: boolean | number | null) {
    setFormFeatures((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return null;

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-card border border-red-200 bg-red-50 p-12 text-center">
          <h1 className="font-display text-2xl font-bold text-red-700">
            Akses i refuzuar
          </h1>
          <p className="mt-2 text-sm text-red-600">
            Nuk keni leje per te aksesuar kete faqe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-navy">
          Menaxhimi i planeve
        </h1>
        <button
          onClick={openCreateModal}
          className="btn-press rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark"
        >
          + Krijo plan
        </button>
      </div>

      {/* Plans table */}
      <div className="overflow-hidden rounded-card border border-warm-gray-light bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-warm-gray-light bg-cream-dark/50">
                <th className="px-5 py-3 font-medium text-navy">Emri</th>
                <th className="px-5 py-3 font-medium text-navy">Lloji</th>
                <th className="px-5 py-3 font-medium text-navy">Cmimi</th>
                <th className="px-5 py-3 font-medium text-navy">Intervali</th>
                <th className="px-5 py-3 font-medium text-navy">Abonente</th>
                <th className="px-5 py-3 font-medium text-navy">Statusi</th>
                <th className="px-5 py-3 font-medium text-navy">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray-light">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-warm-gray">
                    Nuk ka plane te krijuara akoma.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-cream-dark/30 transition">
                    <td className="px-5 py-3">
                      <div>
                        <span className="font-medium text-navy">{plan.name}</span>
                        <span className="ml-2 text-xs text-warm-gray">({plan.slug})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 capitalize text-warm-gray">
                      {PLAN_TYPES.find((t) => t.value === plan.type)?.label ?? plan.type}
                    </td>
                    <td className="px-5 py-3 tabular-nums font-medium text-terracotta">
                      &euro;{formatPrice(plan.priceEur)}
                    </td>
                    <td className="px-5 py-3 text-warm-gray">
                      {plan.billingInterval === "monthly" ? "Mujor" : "Vjetor"}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-navy">
                      {plan.subscriberCount}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          plan.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-warm-gray/10 text-warm-gray"
                        }`}
                      >
                        {plan.isActive ? "Aktiv" : "Joaktiv"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(plan)}
                          className="rounded-btn border border-warm-gray-light px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-cream-dark"
                        >
                          Ndrysho
                        </button>
                        <button
                          onClick={() => handleToggleActive(plan)}
                          disabled={togglingId === plan.id}
                          className={`rounded-btn px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            plan.isActive
                              ? "border border-red-200 text-red-600 hover:bg-red-50"
                              : "border border-green-200 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {togglingId === plan.id
                            ? "..."
                            : plan.isActive
                              ? "C'aktivizo"
                              : "Aktivizo"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-6 font-display text-xl font-bold text-navy">
              {editingPlan ? "Ndrysho planin" : "Krijo plan te ri"}
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-navy">
                  Emri i planit
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                  placeholder="p.sh. Profesional"
                />
              </div>

              {/* Slug (only on create) */}
              {!editingPlan && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    required
                    className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                    placeholder="p.sh. profesional"
                  />
                </div>
              )}

              {/* Type (only on create) */}
              {!editingPlan && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy">
                    Lloji
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as Plan["type"])}
                    className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                  >
                    {PLAN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price + Interval */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy">
                    Cmimi (EUR)
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                    placeholder="49.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy">
                    Intervali
                  </label>
                  <select
                    value={formInterval}
                    onChange={(e) => setFormInterval(e.target.value as "monthly" | "yearly")}
                    className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                  >
                    <option value="monthly">Mujor</option>
                    <option value="yearly">Vjetor</option>
                  </select>
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="mb-1 block text-sm font-medium text-navy">
                  Rend renditjeje
                </label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  className="w-full rounded-input border border-warm-gray-light px-4 py-2.5 text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                />
              </div>

              {/* Features */}
              <div>
                <label className="mb-2 block text-sm font-medium text-navy">
                  Vecorite
                </label>
                <div className="space-y-3 rounded-lg border border-warm-gray-light bg-cream-dark/30 p-4">
                  {FEATURE_LABELS.map(({ key, label, type }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-navy">{label}</span>
                      {type === "boolean" ? (
                        <button
                          type="button"
                          onClick={() => updateFeature(key, !formFeatures[key])}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            formFeatures[key] ? "bg-terracotta" : "bg-warm-gray/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              formFeatures[key] ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type="number"
                          value={formFeatures[key] === null ? "" : String(formFeatures[key])}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateFeature(key, val === "" ? null : parseInt(val, 10));
                          }}
                          placeholder="Pa limit"
                          className="w-24 rounded-input border border-warm-gray-light px-2 py-1 text-right text-sm text-navy transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-press flex-1 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-50"
                >
                  {saving ? "Po ruhet..." : editingPlan ? "Ruaj ndryshimet" : "Krijo planin"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-btn border border-warm-gray-light px-5 py-2.5 text-sm font-medium text-navy transition hover:bg-cream-dark"
                >
                  Anulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
