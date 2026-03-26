"use client";

import { useEffect, useMemo, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRecruiterCandidateTalentcardFiles } from "@/hooks/use-recruteur";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

function pdfEmbedPreviewSrc(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.hash = "view=FitH";
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

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;

export default function RecruiterTalentCardSidebar() {
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);
  const [zoom, setZoom] = useState(1);

  const talentCardQuery = useRecruiterCandidateTalentcardFiles(
    talentPanel?.candidateId ?? null,
    Boolean(talentPanel),
  );

  const singleFile = useMemo(
    () => pickSingleTalentcardFile(talentCardQuery.data?.talentcardFiles ?? []),
    [talentCardQuery.data?.talentcardFiles],
  );

  useEffect(() => {
    setZoom(1);
  }, [talentPanel?.candidateId]);

  const zoomIn = () =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () =>
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const zoomReset = () => setZoom(1);

  if (!talentPanel) return null;

  return (
    <div className="flex flex-col w-full h-auto shrink-0 gap-3">
      {talentCardQuery.isLoading ? (
        <div className="relative w-full max-w-[min(280px,85vw)] mx-auto aspect-[210/297] min-h-[280px] overflow-hidden rounded-2xl bg-white">
          <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
        </div>
      ) : talentCardQuery.isError ? (
        <div className="w-full max-w-[280px] mx-auto min-h-[160px] flex items-center justify-center px-1">
          <ErrorState onRetry={() => talentCardQuery.refetch()} />
        </div>
      ) : !singleFile ? (
        <div className="w-full max-w-[280px] mx-auto min-h-[120px] flex items-center justify-center text-center px-2">
          <p className="text-[12px] text-white/50">Aucune talent card pour ce profil.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-zinc-900/90 text-white/90 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Zoom arrière"
            >
              <ZoomOut size={16} />
            </button>
            <span className="min-w-[3.25rem] text-center text-[12px] tabular-nums text-white/80">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-zinc-900/90 text-white/90 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Zoom avant"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={zoomReset}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-zinc-900/90 px-2.5 text-[11px] text-white/80 hover:bg-zinc-800"
              aria-label="Réinitialiser le zoom"
              title="100 %"
            >
              <RotateCcw size={14} />
              100%
            </button>
          </div>

          <figure className="m-0 w-full">
            {/* Carte sans bordure ; zoom via CSS zoom (Chrome/Edge/Safari récents) */}
            <div className="mx-auto w-full max-w-[min(320px,92vw)] overflow-auto max-h-[min(78vh,720px)] rounded-2xl bg-transparent">
              <div
                className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
                style={{ zoom }}
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
