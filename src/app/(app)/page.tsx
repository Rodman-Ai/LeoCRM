"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageHeader } from "@/components/PageHeader";
import type { Contact, EmailRecord, Lead } from "@/lib/types";
import { LEAD_STAGES } from "@/lib/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, l, e] = await Promise.all([
          api.get<Contact[]>("/api/contacts"),
          api.get<Lead[]>("/api/leads"),
          api.get<EmailRecord[]>("/api/emails"),
        ]);
        setContacts(c);
        setLeads(l);
        setEmails(e);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stageCounts = LEAD_STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));

  const sent = emails.filter((e) => e.status === "sent");
  const aiSent = sent.filter((e) => e.aiGenerated === "yes").length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your pipeline and AI activity."
        actions={
          <Link href="/compose" className="btn-primary">
            New AI email
          </Link>
        }
      />
      {error ? (
        <div className="card mb-4 border-red-300 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Contacts" value={contacts.length} loading={loading} />
        <Stat label="Active leads" value={leads.length} loading={loading} />
        <Stat label="Emails sent" value={sent.length} loading={loading} />
        <Stat label="AI-generated" value={aiSent} loading={loading} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-500">
        Pipeline
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stageCounts.map(({ stage, count }) => (
          <div key={stage} className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {stage}
            </div>
            <div className="mt-2 text-2xl font-semibold">{count}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-500">
        Recent emails
      </h2>
      <div className="card divide-y divide-slate-200 p-0 dark:divide-slate-800">
        {sent
          .slice()
          .sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))
          .slice(0, 8)
          .map((e) => {
            const c = contacts.find((c) => c.id === e.contactId);
            return (
              <div key={e.id} className="flex items-start gap-3 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leo-100 text-xs font-semibold text-leo-700">
                  {(c?.name || c?.email || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {c?.name || c?.email || "Unknown"}
                    </p>
                    {e.aiGenerated === "yes" ? (
                      <span className="badge bg-leo-100 text-leo-700">AI</span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                    {e.subject}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {e.sentAt ? new Date(e.sentAt).toLocaleDateString() : ""}
                </div>
              </div>
            );
          })}
        {sent.length === 0 && !loading ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No emails yet. Try{" "}
            <Link href="/compose" className="text-leo-600">
              composing one with AI
            </Link>
            .
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">
        {loading ? "—" : value}
      </div>
    </div>
  );
}
