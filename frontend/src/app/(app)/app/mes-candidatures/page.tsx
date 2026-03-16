import Link from "next/link";

export default function MesCandidaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-bold text-white tracking-[-0.03em]">
          Mes candidatures
        </h1>
        <p className="text-white/50 text-[14px] mt-1">
          Retrouvez ici la liste des offres auxquelles vous avez postulé.
        </p>
      </div>

      <div className="border border-white/[0.06] rounded-2xl bg-white/[0.02] p-6 text-white/60 text-sm">
        <p>Aucune candidature pour le moment.</p>
        <p className="mt-2">
          Commencez par explorer les{" "}
          <Link href="/app/matching" className="text-tap-red hover:text-tap-red-hover transition-colors">
            offres qui vous correspondent
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

