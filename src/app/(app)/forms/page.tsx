import { PageHeader } from "@/components/PageHeader";

export default function FormsPage() {
  return (
    <div>
      <PageHeader
        title="Public forms"
        description="Public lead-capture pages. Builder coming next."
      />
      <div className="card text-sm text-slate-500">
        Public <span className="font-mono">/f/&lt;slug&gt;</span> pages that
        create a contact + lead and optionally enroll into a sequence ship
        next.
      </div>
    </div>
  );
}
