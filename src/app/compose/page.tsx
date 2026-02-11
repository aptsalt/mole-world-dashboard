import { Settings } from "lucide-react";

export default function ComposePage() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="glass p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/10">
          <Settings size={32} className="text-cyan" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">Compose</h1>
        <p className="text-sm text-muted">Pipeline composer coming soon.</p>
      </div>
    </div>
  );
}
