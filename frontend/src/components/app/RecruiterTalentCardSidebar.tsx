"use client";

import { useMemo } from "react";
import { useRecruiterCandidateTalentcardFiles } from "@/hooks/use-recruteur";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import type { RecruiterTalentcardFile } from "@/services/recruteur.service";
import ErrorState from "@/components/ui/ErrorState";
import RecruiterTalentCardPdfView from "@/components/app/RecruiterTalentCardPdfView";

function pickLatestTalentcardFile(files: RecruiterTalentcardFile[]) {
  if (!files.length) return null;
  return [...files].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  })[0];
}

function isPdfPublicUrl(url: string): boolean {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".pdf");
}

export default function RecruiterTalentCardSidebar() {
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);

  const talentcardQuery = useRecruiterCandidateTalentcardFiles(
    talentPanel?.candidateId ?? null,
    Boolean(talentPanel),
  );

  const singleFile = useMemo(
    () => pickLatestTalentcardFile(talentcardQuery.data?.talentcardFiles ?? []),
    [talentcardQuery.data?.talentcardFiles],
  );

  const publicUrl = singleFile?.publicUrl ?? "";
  const isPdf = Boolean(publicUrl && isPdfPublicUrl(publicUrl));

  if (!talentPanel) return null;

  const title = talentPanel.candidateName
    ? `Talent Card — ${talentPanel.candidateName}`
    : "Talent Card";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-black">
      {talentcardQuery.isLoading ? (
        <div
          className="min-h-0 flex-1 w-full bg-black"
          aria-busy
          aria-label="Chargement de la Talent Card"
        />
      ) : talentcardQuery.isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <ErrorState onRetry={() => talentcardQuery.refetch()} />
        </div>
      ) : !singleFile || !publicUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-center px-4">
          <p className="text-[12px] text-white/50">Aucune Talent Card pour ce profil.</p>
        </div>
      ) : !isPdf ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-[12px] text-white/50">
            Format non PDF : ouvrez le fichier dans un nouvel onglet pour le consulter.
          </p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium text-tap-red hover:text-red-400 underline underline-offset-2"
          >
            Ouvrir le fichier
          </a>
        </div>
      ) : (
        <RecruiterTalentCardPdfView key={publicUrl} url={publicUrl} title={title} />
      )}
    </div>
  );
}
