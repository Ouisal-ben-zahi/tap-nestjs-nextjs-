"use client";

import { useMemo } from "react";
import { useRecruiterCandidateTalentcardFiles } from "@/hooks/use-recruteur";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import type { RecruiterTalentcardFile } from "@/services/recruteur.service";
import ErrorState from "@/components/ui/ErrorState";

/** Export image Talent Card FR (bucket TAP). */
const TALENTCARD_HTML_PNG_FR = "talentcard_html_tap.png";

function normName(name: string): string {
  return name.trim().toLowerCase();
}

function pickLatest(files: RecruiterTalentcardFile[]): RecruiterTalentcardFile | null {
  if (!files.length) return null;
  return [...files].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  })[0];
}

/** PNG Talent Card « HTML » TAP — version française uniquement. */
function pickTalentcardHtmlTapPngFr(
  files: RecruiterTalentcardFile[],
): RecruiterTalentcardFile | null {
  const pngs = files.filter((f) => {
    const n = normName(f.name);
    return n.endsWith(".png") && n.includes("talentcard");
  });
  const exact = pngs.filter((f) => normName(f.name) === TALENTCARD_HTML_PNG_FR);
  if (exact.length) return pickLatest(exact);

  const loose = pngs.filter((f) => {
    const n = normName(f.name);
    return (
      n.includes("html") &&
      n.includes("tap") &&
      !n.endsWith("_en.png") &&
      !n.includes("tap_en")
    );
  });
  if (loose.length) return pickLatest(loose);

  return null;
}

export default function RecruiterTalentCardSidebar() {
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);

  const talentcardQuery = useRecruiterCandidateTalentcardFiles(
    talentPanel?.candidateId ?? null,
    Boolean(talentPanel),
  );

  const files = talentcardQuery.data?.talentcardFiles ?? [];
  const frFile = useMemo(() => pickTalentcardHtmlTapPngFr(files), [files]);
  const publicUrl = frFile?.publicUrl?.trim() ?? "";

  if (!talentPanel) return null;

  const title = talentPanel.candidateName
    ? `Talent Card — ${talentPanel.candidateName}`
    : "Talent Card";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-transparent pointer-events-none">
      {talentcardQuery.isLoading ? (
        <div
          className="min-h-0 flex-1 w-full bg-transparent"
          aria-busy
          aria-label="Chargement de la Talent Card"
        />
      ) : talentcardQuery.isError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 bg-transparent pointer-events-auto">
          <ErrorState onRetry={() => talentcardQuery.refetch()} />
        </div>
      ) : !frFile || !publicUrl ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center px-4 gap-2 bg-transparent pointer-events-none">
          <p className="text-[12px] text-white/50">
            Aucune Talent Card image (FR) pour ce profil.
          </p>
          <p className="text-[11px] text-white/35">
            Fichier attendu : {TALENTCARD_HTML_PNG_FR}
          </p>
        </div>
      ) : (
        <div
          className="min-h-0 flex-1 w-full overflow-hidden flex items-center justify-center bg-transparent pointer-events-none"
          aria-label={title}
        >
          <img
            key={publicUrl}
            src={publicUrl}
            alt={title}
            className="max-h-full max-w-full w-auto h-auto object-contain object-center select-none pointer-events-auto"
          />
        </div>
      )}
    </div>
  );
}
