"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/client";

interface Workspace {
  spreadsheetId: string;
  driveFolderId: string;
}

export default function SettingsPage() {
  const { data } = useSession();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setWs(await api.post<Workspace>("/api/setup", {}));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Connected Google Workspace storage."
      />
      <div className="card space-y-3">
        <Row label="Account" value={data?.user?.email ?? ""} />
        {loading ? (
          <p className="text-sm text-slate-500">Provisioning workspace…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : ws ? (
          <>
            <Row
              label="Google Sheet"
              value={ws.spreadsheetId}
              link={`https://docs.google.com/spreadsheets/d/${ws.spreadsheetId}`}
            />
            <Row
              label="Drive Folder"
              value={ws.driveFolderId || "—"}
              link={
                ws.driveFolderId
                  ? `https://drive.google.com/drive/folders/${ws.driveFolderId}`
                  : undefined
              }
            />
          </>
        ) : null}
      </div>
      <div className="card mt-4">
        <h3 className="mb-2 text-sm font-semibold">Where is my data?</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>
            Contacts, leads, campaigns, templates, and sent-email history are
            stored as tabs in <span className="font-mono">LeoCRM Workspace</span>{" "}
            on your Google Drive.
          </li>
          <li>
            Attachments and uploads land in the{" "}
            <span className="font-mono">LeoCRM</span> Drive folder.
          </li>
          <li>
            Outbound mail is sent through your Gmail using OAuth — no SMTP
            credentials required.
          </li>
          <li>
            AI generation runs server-side via Anthropic Claude using your
            configured API key.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800 sm:flex-row sm:items-center sm:gap-4">
      <div className="w-32 shrink-0 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="flex-1 break-all font-mono text-sm">
        {link ? (
          <a
            className="text-leo-600 hover:underline"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
