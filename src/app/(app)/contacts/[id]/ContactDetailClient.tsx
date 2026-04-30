"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";
import type { Activity, Contact, EmailRecord, Lead, Task } from "@/lib/types";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";

export default function ContactDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTask, setShowTask] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", dueAt: "" });

  async function load() {
    try {
      const [c, leads, allEmails, acts, allTasks] = await Promise.all([
        api.get<Contact>(`/api/contacts/${id}`),
        api.get<Lead[]>("/api/leads"),
        api.get<EmailRecord[]>("/api/emails"),
        api.get<Activity[]>(`/api/activity?contactId=${id}`),
        api.get<Task[]>("/api/tasks"),
      ]);
      setContact(c);
      setLead(leads.find((l) => l.contactId === id) ?? null);
      setEmails(allEmails.filter((e) => e.contactId === id));
      setActivity(acts);
      setTasks(allTasks.filter((t) => t.contactId === id));
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
      await api.post("/api/activity/log", {
        contactId: contact?.id,
        type: "stage_change",
        summary: `Stage: ${lead.stage} → ${stage}`,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function score() {
    if (!contact) return;
    setScoring(true);
    try {
      await api.post("/api/ai/score", { contactId: contact.id });
      await load();
    } finally {
      setScoring(false);
    }
  }

  async function addTask() {
    if (!contact || !taskForm.title.trim()) return;
    await api.post("/api/tasks", {
      contactId: contact.id,
      title: taskForm.title,
      dueAt: taskForm.dueAt,
    });
    setTaskForm({ title: "", dueAt: "" });
    setShowTask(false);
    await load();
  }

  async function toggleTask(t: Task) {
    await api.patch(`/api/tasks/${t.id}`, {
      status: t.status === "open" ? "done" : "open",
    });
    await load();
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
            <button
              onClick={score}
              disabled={scoring}
              className="btn-secondary"
            >
              {scoring ? "Scoring…" : "AI score"}
            </button>
            <button onClick={() => setShowTask(true)} className="btn-secondary">
              + Task
            </button>
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
                <Row k="Why" v={lead.scoreReason} />
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Tasks</h3>
          <div className="card divide-y divide-slate-200 p-0 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No tasks for this contact.
              </div>
            ) : (
              tasks
                .slice()
                .sort((a, b) => {
                  if (a.status !== b.status)
                    return a.status === "open" ? -1 : 1;
                  return (a.dueAt || "9999").localeCompare(b.dueAt || "9999");
                })
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={t.status === "done"}
                      onChange={() => toggleTask(t)}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          t.status === "done"
                            ? "text-slate-400 line-through"
                            : "font-medium"
                        }`}
                      >
                        {t.title}
                      </p>
                      {t.notes ? (
                        <p className="text-xs text-slate-500">{t.notes}</p>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.dueAt
                        ? new Date(t.dueAt).toLocaleDateString()
                        : ""}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Activity</h3>
          <div className="card p-0">
            {activity.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No activity yet.
              </div>
            ) : (
              <ol className="relative space-y-3 p-4">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-leo-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.summary}</p>
                      <p className="text-xs text-slate-400">
                        {fmtDate(a.createdAt)}
                        {a.actor ? ` · ${a.actor}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {showTask ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 dark:bg-slate-900 md:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New task for {contact.name || contact.email}</h2>
              <button
                onClick={() => setShowTask(false)}
                className="text-sm text-slate-400"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="label">Title</span>
                <input
                  className="input"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="label">Due</span>
                <input
                  type="date"
                  className="input"
                  value={taskForm.dueAt}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueAt: e.target.value })
                  }
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowTask(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={addTask} className="btn-primary">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
