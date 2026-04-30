"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";
import type { Contact, EmailRecord, Lead } from "@/lib/types";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";

export default function ContactDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [c, leads, allEmails] = await Promise.all([
        api.get<Contact>(`/api/contacts/${id}`),
        api.get<Lead[]>("/api/leads"),
        api.get<EmailRecord[]>("/api/emails"),
      ]);
      setContact(c);
      setLead(leads.find((l) => l.contactId === id) ?? null);
      setEmails(allEmails.filter((e) => e.contactId === id));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function changeStage(stage: LeadStage) {
    if (!lead) return;
    setBusy(true);
    try {
      await api.patch(`/api/leads/${lead.id}`, { stage });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this contact and its lead?")) return;
    if (lead) await api.del(`/api/leads/${lead.id}`);
    await api.del(`/api/contacts/${id}`);
    router.push("/contacts");
  }

  if (!contact) {
    return (
      <div className="text-sm text-slate-500">{error ?? "Loading…"}</div>
    );
  }

  return (
    <div>
      <PageHeader
        title={contact.name || contact.email}
        description={[contact.role, contact.company].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link
              href={`/compose?contactId=${contact.id}`}
              className="btn-primary"
            >
              AI compose
            </Link>
            <button onClick={remove} className="btn-secondary">
              Delete
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-1">
          <h3 className="mb-3 text-sm font-semibold">Details</h3>
          <dl className="space-y-2 text-sm">
            <Row k="Email" v={contact.email} />
            <Row k="Phone" v={contact.phone} />
            <Row k="LinkedIn" v={contact.linkedin} />
            <Row k="Tags" v={contact.tags} />
            <Row k="Notes" v={contact.notes} pre />
          </dl>
        </div>
        <div className="card md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Pipeline</h3>
          {lead ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {LEAD_STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStage(s)}
                    disabled={busy}
                    className={`badge cursor-pointer ${
                      lead.stage === s
                        ? "bg-leo-600 text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Row k="Source" v={lead.source} />
                <Row k="Score" v={String(lead.score)} />
                <Row k="Value" v={String(lead.value)} />
                <Row k="Last contacted" v={fmtDate(lead.lastContactedAt)} />
                <Row k="Next action" v={lead.nextAction} />
                <Row k="Owner" v={lead.owner} />
              </dl>
            </>
          ) : (
            <p className="text-sm text-slate-500">No lead record.</p>
          )}
        </div>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold">Email history</h3>
      <div className="card divide-y divide-slate-200 p-0 dark:divide-slate-800">
        {emails.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No emails yet.
          </div>
        ) : (
          emails
            .slice()
            .sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))
            .map((e) => (
              <div key={e.id} className="p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{e.subject}</p>
                  {e.aiGenerated === "yes" ? (
                    <span className="badge bg-leo-100 text-leo-700">AI</span>
                  ) : null}
                  <span className="ml-auto text-xs text-slate-400">
                    {fmtDate(e.sentAt)}
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {e.body}
                </pre>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function Row({ k, v, pre }: { k: string; v: string; pre?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{k}</dt>
      {pre ? (
        <dd className="whitespace-pre-wrap text-sm">{v || "—"}</dd>
      ) : (
        <dd className="text-sm">{v || "—"}</dd>
      )}
    </div>
  );
}

function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}
