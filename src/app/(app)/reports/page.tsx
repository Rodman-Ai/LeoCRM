"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";
import type { Campaign, EmailRecord, Lead } from "@/lib/types";
import { LEAD_STAGES } from "@/lib/types";

export default function ReportsPage() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    (async () => {
      const [e, l, c] = await Promise.all([
        api.get<EmailRecord[]>("/api/emails"),
        api.get<Lead[]>("/api/leads"),
        api.get<Campaign[]>("/api/campaigns"),
      ]);
      setEmails(e);
      setLeads(l);
      setCampaigns(c);
    })();
  }, []);

  const sent = useMemo(
    () => emails.filter((e) => e.status === "sent"),
    [emails],
  );
  const replied = useMemo(
    () => sent.filter((e) => e.repliedAt),
    [sent],
  );
  const ai = sent.filter((e) => e.aiGenerated === "yes");
  const aiReplied = ai.filter((e) => e.repliedAt);
  const nonAi = sent.filter((e) => e.aiGenerated !== "yes");
  const nonAiReplied = nonAi.filter((e) => e.repliedAt);

  // Funnel: count leads in each stage
  const funnel = LEAD_STAGES.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));
  const funnelMax = Math.max(...funnel.map((f) => f.count), 1);

  // Day-of-week heatmap of sends
  const dow = [0, 0, 0, 0, 0, 0, 0];
  const dowReplies = [0, 0, 0, 0, 0, 0, 0];
  for (const e of sent) {
    if (!e.sentAt) continue;
    const d = new Date(e.sentAt).getDay();
    dow[d]++;
    if (e.repliedAt) dowReplies[d]++;
  }
  const dowMax = Math.max(...dow, 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // A/B subject win rate
  const variantA = sent.filter((e) => e.variant === "A");
  const variantB = sent.filter((e) => e.variant === "B");
  const aRate = rate(variantA.length, variantA.filter((e) => e.repliedAt).length);
  const bRate = rate(variantB.length, variantB.filter((e) => e.repliedAt).length);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Conversion funnel, AI vs non-AI reply rates, and send timing."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Sent" value={sent.length} />
        <Stat label="Replies" value={replied.length} />
        <Stat
          label="Reply rate"
          value={`${rate(sent.length, replied.length)}%`}
        />
        <Stat
          label="Avg time-to-reply"
          value={(() => {
            const diffs = replied
              .map((e) => {
                if (!e.sentAt || !e.repliedAt) return null;
                return (
                  new Date(e.repliedAt).getTime() -
                  new Date(e.sentAt).getTime()
                );
              })
              .filter((n): n is number => typeof n === "number" && n > 0);
            if (diffs.length === 0) return "—";
            const avg = diffs.reduce((s, n) => s + n, 0) / diffs.length;
            const hours = avg / 3600000;
            return hours < 24
              ? `${hours.toFixed(1)}h`
              : `${(hours / 24).toFixed(1)}d`;
          })()}
        />
        <Stat
          label="AI-generated"
          value={`${ai.length} (${
            ai.length ? Math.round((ai.length / sent.length) * 100) : 0
          }%)`}
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">
        Pipeline funnel
      </h2>
      <div className="card space-y-2">
        {funnel.map((f) => (
          <div key={f.stage} className="flex items-center gap-3">
            <div className="w-20 text-xs uppercase tracking-wide text-slate-500">
              {f.stage}
            </div>
            <div className="h-6 flex-1 rounded bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded bg-leo-500"
                style={{ width: `${(f.count / funnelMax) * 100}%` }}
              />
            </div>
            <div className="w-10 text-right text-sm font-medium">
              {f.count}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">
        AI vs non-AI reply rate
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            AI-generated
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {rate(ai.length, aiReplied.length)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {aiReplied.length} replies / {ai.length} sent
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Non-AI
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {rate(nonAi.length, nonAiReplied.length)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {nonAiReplied.length} replies / {nonAi.length} sent
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">
        A/B subject test
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Variant A
          </div>
          <div className="mt-1 text-3xl font-semibold">{aRate}%</div>
          <div className="text-xs text-slate-400">
            {variantA.length} sent
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Variant B
          </div>
          <div className="mt-1 text-3xl font-semibold">{bRate}%</div>
          <div className="text-xs text-slate-400">
            {variantB.length} sent
          </div>
        </div>
      </div>
      {variantA.length === 0 && variantB.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          No A/B tests yet — toggle &quot;A/B test subject lines&quot; in
          Compose.
        </p>
      ) : null}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">
        Sends by day of week
      </h2>
      <div className="card">
        <div className="grid grid-cols-7 gap-2">
          {days.map((label, i) => (
            <div key={label} className="text-center">
              <div className="text-xs text-slate-500">{label}</div>
              <div
                className="mx-auto mt-2 rounded bg-leo-500"
                style={{
                  height: `${Math.max(8, (dow[i] / dowMax) * 80)}px`,
                  width: "100%",
                  opacity: dow[i] === 0 ? 0.15 : 0.4 + (dow[i] / dowMax) * 0.6,
                }}
                title={`${dow[i]} sends, ${dowReplies[i]} replies`}
              />
              <div className="mt-1 text-xs">{dow[i]}</div>
              <div className="text-[10px] text-slate-400">
                ↩ {dowReplies[i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {campaigns.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-500">
            By campaign
          </h2>
          <div className="card divide-y divide-slate-200 p-0 dark:divide-slate-800">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-4 items-center gap-2 p-3 text-sm"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-slate-500">Sent: {c.sentCount}</div>
                <div className="text-slate-500">Replied: {c.repliedCount}</div>
                <div className="text-slate-500">
                  {rate(Number(c.sentCount), Number(c.repliedCount))}%
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function rate(total: number, hits: number) {
  if (!total) return 0;
  return Math.round((hits / total) * 100);
}
