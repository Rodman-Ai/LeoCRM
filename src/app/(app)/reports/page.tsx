import { PageHeader } from "@/components/PageHeader";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Funnel + AI vs non-AI reply rates. Coming in the next push."
      />
      <div className="card text-sm text-slate-500">
        Stage→stage conversion, send/reply ratios, and day-of-week heatmap
        ship next.
      </div>
    </div>
  );
}
