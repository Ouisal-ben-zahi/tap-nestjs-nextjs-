"use client";

import { useMemo } from "react";
import { useRecruiterCandidateTalentcardFiles } from "@/hooks/use-recruteur";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

function pdfEmbedPreviewSrc(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Reduce browser PDF viewer controls (download/print) where supported.
    // Note: exact behavior depends on the browser/viewer, but toolbar=0 typically hides actions.
    u.hash = "view=FitH&toolbar=0&navpanes=0&scrollbar=0";
    return u.toString();
  } catch {
    return url;
  }
}

function pickSingleTalentcardFile(
  files: { publicUrl: string; updatedAt: string | null }[],
) {
  if (!files.length) return null;
  const tapFiles = files.filter((f) => {
    const raw = String(f.publicUrl ?? "");
    const withoutQuery = raw.split("?")[0] ?? raw;
    const name = withoutQuery.split("/").pop() ?? "";
    return name.toLowerCase().endsWith("tap.pdf");
  });
  const source = tapFiles.length ? tapFiles : files;
  return [...source].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  })[0];
}

export default function RecruiterTalentCardSidebar() {
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);
  const zoom = 1;

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
    <div className="flex flex-col w-full h-auto shrink-0 gap-3">
      {talentCardQuery.isLoading ? (
        <div className="relative w-full max-w-[min(320px,92vw)] mx-auto aspect-[210/297] min-h-[280px] overflow-hidden rounded-2xl bg-white">
          <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
        </div>
      ) : talentCardQuery.isError ? (
        <div className="w-full max-w-[min(320px,92vw)] mx-auto min-h-[160px] flex items-center justify-center px-1">
          <ErrorState onRetry={() => talentCardQuery.refetch()} />
        </div>
      ) : !singleFile ? (
        <div className="w-full max-w-[min(320px,92vw)] mx-auto min-h-[120px] flex items-center justify-center text-center px-2">
          <p className="text-[12px] text-white/50">Aucune talent card pour ce profil.</p>
        </div>
      ) : (
        <>
          <figure className="m-0 w-full">
            {/* Carte sans bordure : taille normale (sans stretch) */}
            <div className="mx-auto w-full max-w-[min(320px,92vw)] overflow-auto max-h-[min(78vh,900px)] rounded-2xl bg-transparent">
              <div
                className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="relative aspect-[210/297] w-full min-h-[260px]">
                  <iframe
                    title="Talent card"
                    src={pdfEmbedPreviewSrc(singleFile.publicUrl)}
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              </div>
            </div>
          </figure>
        </>
      )}
    </div>
  );
}
