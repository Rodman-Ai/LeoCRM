"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";
import type { Contact } from "@/lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    tags: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setContacts(await api.get<Contact[]>("/api/contacts"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.company, c.role, c.tags]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, query]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Contact>("/api/contacts", form);
      // Auto-create a "new" lead for every contact so the pipeline stays in sync.
      await api.post("/api/leads", {
        contactId: created.id,
        source: "manual",
        stage: "new",
      });
      setShowAdd(false);
      setForm({
        name: "",
        email: "",
        company: "",
        role: "",
        tags: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Stored as rows in your LeoCRM Google Sheet."
        actions={
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            Add contact
          </button>
        }
      />
      <div className="mb-3">
        <input
          className="input"
          placeholder="Search by name, email, company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? (
        <div className="card mb-3 border-red-300 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="card divide-y divide-slate-200 p-0 dark:divide-slate-800">
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No contacts yet.
          </div>
        ) : (
          filtered.map((c) => (
            <Link
              key={c.id}
              href={`/contacts/${c.id}`}
              className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leo-100 text-xs font-semibold text-leo-700">
                {(c.name || c.email || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.name || c.email}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {[c.role, c.company].filter(Boolean).join(" · ") || c.email}
                </div>
              </div>
              {c.tags ? (
                <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {c.tags.split(",")[0]}
                </span>
              ) : null}
            </Link>
          ))
        )}
      </div>

      {showAdd ? (
        <Modal onClose={() => setShowAdd(false)} title="Add contact">
          <div className="space-y-3">
            <Field label="Name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email *">
              <input
                className="input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company">
                <input
                  className="input"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </Field>
              <Field label="Role">
                <input
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Tags (comma-separated)">
              <input
                className="input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                className="input min-h-[80px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn-secondary"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={busy || !form.email}
                onClick={submit}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl dark:bg-slate-900 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-slate-400">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
