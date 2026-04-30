import { PageHeader } from "@/components/PageHeader";

export default function SequencesPage() {
  return (
    <div>
      <PageHeader
        title="Sequences"
        description="Multi-step AI cadences. Coming in the next push."
      />
      <div className="card text-sm text-slate-500">
        Build a sequence of AI-personalized emails that auto-send over N days
        and stop on reply. Builder UI ships next.
      </div>
    </div>
  );
}
