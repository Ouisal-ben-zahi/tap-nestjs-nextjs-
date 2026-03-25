"use client";

import { useMemo } from "react";
import { useRecruiterCandidateTalentcardFiles } from "@/hooks/use-recruteur";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

/** Réduit la barre d’outils du lecteur PDF intégré quand l’URL le permet. */
function pdfEmbedPreviewSrc(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.hash = "toolbar=0&navpanes=0&scrollbar=0&view=FitH";
    return u.toString();
  } catch {
    return url;
  }
}

function pickSingleTalentcardFile(
  files: { publicUrl: string; updatedAt: string | null }[],
) {
  if (!files.length) return null;
  return [...files].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  })[0];
}

export default function RecruiterTalentCardSidebar() {
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);

  const talentCardQuery = useRecruiterCandidateTalentcardFiles(
    talentPanel?.candidateId ?? null,
    Boolean(talentPanel),
  );

  const singleFile = useMemo(
    () => pickSingleTalentcardFile(talentCardQuery.data?.talentcardFiles ?? []),
    [talentCardQuery.data?.talentcardFiles],
  );

  if (!talentPanel) return null;

  return (
    <div className="flex flex-col h-full min-h-0 p-0">
      {talentCardQuery.isLoading ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px]">
          <Skeleton className="h-full min-h-[260px] w-full rounded-2xl" />
        </div>
      ) : talentCardQuery.isError ? (
        <div className="flex-1 flex items-center justify-center px-1 min-h-[200px]">
          <ErrorState onRetry={() => talentCardQuery.refetch()} />
        </div>
      ) : !singleFile ? (
        <div className="flex-1 flex items-center justify-center text-center px-2 min-h-[200px]">
          <p className="text-[12px] text-white/50">Aucune talent card pour ce profil.</p>
        </div>
      ) : (
        <figure className="m-0 h-full min-h-0 flex flex-col flex-1">
          <div className="relative flex-1 min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.12] bg-white shadow-[0_12px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06]">
            {/* Rendu type « carte » / visuel image, sans en-tête texte */}
            <iframe
              title="Talent card"
              src={pdfEmbedPreviewSrc(singleFile.publicUrl)}
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </figure>
      )}
    </div>
  );
}
