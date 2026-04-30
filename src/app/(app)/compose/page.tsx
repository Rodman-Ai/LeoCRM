"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";
import type { Contact, Template } from "@/lib/types";

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <ComposeInner />
    </Suspense>
  );
}

function ComposeInner() {
  const search = useSearchParams();
  const router = useRouter();
  const initialId = search.get("contactId") ?? "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contactId, setContactId] = useState(initialId);
  const [goal, setGoal] = useState(
    "Book an intro call to demo our product to a relevant decision maker.",
  );
  const [tone, setTone] = useState("warm, direct, professional");
  const [context, setContext] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectB, setSubjectB] = useState("");
  const [chosenVariant, setChosenVariant] = useState<"A" | "B">("A");
  const [abTest, setAbTest] = useState(false);
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, t] = await Promise.all([
        api.get<Contact[]>("/api/contacts"),
        api.get<Template[]>("/api/templates"),
      ]);
      setContacts(c);
      setTemplates(t);
      if (!initialId && c.length > 0) setContactId(c[0].id);
    })();
  }, [initialId]);

  const contact = contacts.find((c) => c.id === contactId);

  async function generate() {
    if (!contact) {
      setError("Pick a contact first.");
      return;
    }
    setError(null);
    setInfo(null);
    setGenerating(true);
    try {
      const res = await api.post<{
        subject: string;
        body: string;
        subjectB?: string;
      }>("/api/ai/generate", {
        contact: {
          name: contact.name,
          email: contact.email,
          company: contact.company,
          role: contact.role,
          tags: contact.tags,
          notes: contact.notes,
        },
        goal,
        tone,
        context,
        abTest,
      });
      setSubject(res.subject);
      setSubjectB(res.subjectB ?? "");
      setBody(res.body);
      setChosenVariant("A");
      setAiUsed(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function applyTemplate(id: string) {
    const t = templates.find((tt) => tt.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    if (t.aiPrompt) setGoal(t.aiPrompt);
  }

  async function send() {
    if (!contact) return;
    setSending(true);
    setError(null);
    setInfo(null);
    const useB = abTest && subjectB && chosenVariant === "B";
    const finalSubject = useB ? subjectB : subject;
    try {
      await api.post("/api/email/send", {
        contactId: contact.id,
        to: contact.email,
        subject: finalSubject,
        body,
        aiGenerated: aiUsed,
        prompt: aiUsed ? `${goal} (tone: ${tone})` : "",
        variant: abTest ? chosenVariant : "",
      });
      setInfo(`Sent to ${contact.email}.`);
      setTimeout(() => router.push(`/contacts/${contact.id}`), 600);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Compose"
        description="Generate a personalized email, edit, then send via Gmail."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <label className="block">
            <span className="label">Contact</span>
            <select
              className="input"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">Select a contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name || c.email) +
                    (c.company ? ` — ${c.company}` : "")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Goal of the email</span>
            <textarea
              className="input min-h-[80px]"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Tone</span>
              <input
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Use template</span>
              <select
                className="input"
                onChange={(e) => applyTemplate(e.target.value)}
                defaultValue=""
              >
                <option value="">— None —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">Extra context (optional)</span>
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g. They downloaded our whitepaper last week"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={abTest}
              onChange={(e) => setAbTest(e.target.checked)}
            />
            A/B test subject lines (Claude returns two; pick before sending)
          </label>
          <button
            className="btn-primary w-full"
            onClick={generate}
            disabled={generating || !contact}
          >
            {generating ? "Generating…" : "Generate with AI"}
          </button>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : info ? (
            <p className="text-sm text-emerald-600">{info}</p>
          ) : null}
        </div>

        <div className="card space-y-3">
          <label className="block">
            <span className="label">
              Subject {abTest && subjectB ? "(variant A)" : ""}
            </span>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          {abTest && subjectB ? (
            <>
              <label className="block">
                <span className="label">Subject (variant B)</span>
                <input
                  className="input"
                  value={subjectB}
                  onChange={(e) => setSubjectB(e.target.value)}
                />
              </label>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setChosenVariant("A")}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    chosenVariant === "A"
                      ? "border-leo-500 bg-leo-50 text-leo-700"
                      : "border-slate-300"
                  }`}
                >
                  Send variant A
                </button>
                <button
                  type="button"
                  onClick={() => setChosenVariant("B")}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    chosenVariant === "B"
                      ? "border-leo-500 bg-leo-50 text-leo-700"
                      : "border-slate-300"
                  }`}
                >
                  Send variant B
                </button>
              </div>
            </>
          ) : null}
          <label className="block">
            <span className="label">Body</span>
            <textarea
              className="input min-h-[260px] font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button
            className="btn-primary w-full"
            disabled={sending || !contact || !subject || !body}
            onClick={send}
          >
            {sending
              ? "Sending…"
              : `Send to ${contact?.email ?? "contact"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
