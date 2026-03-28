"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreVertical, Loader2 } from "lucide-react";
import { recruteurService } from "@/services/recruteur.service";
import { useUiStore } from "@/stores/ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { downloadRemoteFile } from "@/lib/download-remote-file";
import {
  pickCvFileForDownload,
  pickPortfolioFileForDownload,
  pickTalentCardFileForDownload,
  sanitizeDownloadFilename,
} from "@/lib/recruiter-candidate-downloads";

type DownloadKind = "cv" | "talentcard" | "portfolio";

type Props = {
  candidateId: number;
  enabled?: boolean;
  isLight?: boolean;
  /** Classe z-index du panneau (ex. z-[110] sur carte avec menu statut). */
  menuZIndexClass?: string;
};

export function RecruiterCandidateDownloadsMenu({
  candidateId,
  enabled = true,
  isLight = false,
  menuZIndexClass = "z-[70]",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<DownloadKind | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const runDownload = useCallback(
    async (kind: DownloadKind) => {
      if (!enabled || !Number.isFinite(candidateId) || candidateId <= 0) {
        addToast({ message: "Candidat invalide.", type: "error" });
        return;
      }
      setLoading(kind);
      try {
        if (kind === "cv") {
          const { cvFiles } = await recruteurService.getCandidateCvFiles(candidateId);
          const file = pickCvFileForDownload(cvFiles);
          if (!file?.publicUrl) {
            addToast({ message: "Aucun CV PDF disponible pour ce candidat.", type: "error" });
            return;
          }
          const name = sanitizeDownloadFilename(file.name, "cv.pdf");
          await downloadRemoteFile(file.publicUrl, name);
          addToast({ message: "Téléchargement du CV lancé.", type: "success" });
          return;
        }
        if (kind === "talentcard") {
          const { talentcardFiles } = await recruteurService.getCandidateTalentcardFiles(candidateId);
          const file = pickTalentCardFileForDownload(talentcardFiles);
          if (!file?.publicUrl) {
            addToast({ message: "Aucune Talent Card disponible pour ce candidat.", type: "error" });
            return;
          }
          const name = sanitizeDownloadFilename(file.name, "talent-card");
          await downloadRemoteFile(file.publicUrl, name);
          addToast({ message: "Téléchargement de la Talent Card lancé.", type: "success" });
          return;
        }
        const { portfolioPdfFiles } = await recruteurService.getCandidatePortfolioPdfFiles(candidateId);
        const file = pickPortfolioFileForDownload(portfolioPdfFiles);
        if (!file?.publicUrl) {
          addToast({ message: "Aucun portfolio PDF disponible pour ce candidat.", type: "error" });
          return;
        }
        const name = sanitizeDownloadFilename(file.name, "portfolio.pdf");
        await downloadRemoteFile(file.publicUrl, name);
        addToast({ message: "Téléchargement du portfolio lancé.", type: "success" });
      } catch (e) {
        addToast({
          message: getApiErrorMessage(e, "Impossible de télécharger le document."),
          type: "error",
        });
      } finally {
        setLoading(null);
        setOpen(false);
      }
    },
    [addToast, candidateId, enabled],
  );

  const busy = loading !== null;
  const baseBtn = isLight
    ? "border-black/12 bg-black/[0.03] text-black/70 hover:bg-black/[0.08]"
    : "border-white/[0.14] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]";

  return (
    <div ref={rootRef} className="relative shrink-0 self-start">
      <button
        type="button"
        disabled={!enabled || busy}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex size-9 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-45 ${baseBtn}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Téléchargements : CV, Talent Card, portfolio"
        title="Télécharger des documents"
      >
        {busy ? (
          <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <MoreVertical size={16} strokeWidth={1.75} />
        )}
      </button>
      {open && !busy ? (
        <div
          role="menu"
          className={`absolute right-0 top-full mt-1.5 min-w-[220px] max-w-[min(92vw,280px)] rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden ${
            isLight
              ? "border border-black/10 bg-white/95 text-black shadow-black/10"
              : "border border-white/[0.08] bg-[#050505]/95 shadow-black/40"
          } ${menuZIndexClass}`}
        >
          <button
            type="button"
            role="menuitem"
            className={`w-full px-4 py-3 text-left text-[13px] transition-colors focus:outline-none ${
              isLight
                ? "text-black/85 hover:bg-black/[0.05] focus-visible:bg-black/[0.06]"
                : "text-white/90 hover:bg-white/[0.06] focus-visible:bg-white/[0.08]"
            }`}
            onClick={() => void runDownload("cv")}
          >
            Télécharger le CV
          </button>
          <button
            type="button"
            role="menuitem"
            className={`w-full px-4 py-3 text-left text-[13px] transition-colors border-t focus:outline-none ${
              isLight
                ? "text-black/85 hover:bg-black/[0.05] focus-visible:bg-black/[0.06] border-black/8"
                : "text-white/90 hover:bg-white/[0.06] focus-visible:bg-white/[0.08] border-white/[0.06]"
            }`}
            onClick={() => void runDownload("talentcard")}
          >
            Télécharger la Talent Card
          </button>
          <button
            type="button"
            role="menuitem"
            className={`w-full px-4 py-3 text-left text-[13px] transition-colors border-t focus:outline-none ${
              isLight
                ? "text-black/85 hover:bg-black/[0.05] focus-visible:bg-black/[0.06] border-black/8"
                : "text-white/90 hover:bg-white/[0.06] focus-visible:bg-white/[0.08] border-white/[0.06]"
            }`}
            onClick={() => void runDownload("portfolio")}
          >
            Télécharger le portfolio
          </button>
        </div>
      ) : null}
    </div>
  );
}
