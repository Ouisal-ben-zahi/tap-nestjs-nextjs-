import { Loader2 } from "lucide-react";

export default function PlanifierEntretienLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
      <Loader2
        className="h-10 w-10 animate-spin text-tap-red motion-reduce:animate-none"
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="text-[14px] text-white/55">Chargement du formulaire…</p>
    </div>
  );
}
