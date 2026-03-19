"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useApplyToJob,
  useCandidatCvFiles,
  useCandidatPortfolioPdfs,
  useCandidatTalentcardFiles,
} from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { ArrowLeft, Award, Briefcase, FileText, Link as LinkIcon } from "lucide-react";
import DropdownSelect from "@/components/app/DropdownSelect";

export default function PostulerPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = Number(params?.jobId);
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const cvQuery = useCandidatCvFiles();
  const talentCardQuery = useCandidatTalentcardFiles();
  const portfolioQuery = useCandidatPortfolioPdfs();
  const applyToJob = useApplyToJob();

  const [cvPath, setCvPath] = useState<string | null>(null);
  const [portfolioPath, setPortfolioPath] = useState<string | null>(null);
  const [talentCardPath, setTalentCardPath] = useState<string | null>(null);
  const [lien, setLien] = useState<string>("");

  const portfolioFiles = portfolioQuery.data?.portfolioPdfFiles ?? [];
  const shortPortfolioFiles = useMemo(
    () => portfolioFiles.filter((f: any) => f.type !== "long"),
    [portfolioFiles],
  );

  useEffect(() => {
    if (cvPath === null && cvQuery.data?.cvFiles?.length) {
      setCvPath(cvQuery.data.cvFiles[0].path);
    }
    if (portfolioPath === null && shortPortfolioFiles.length) {
      setPortfolioPath(shortPortfolioFiles[0].path);
    }
    if (talentCardPath === null && talentCardQuery.data?.talentcardFiles?.length) {
      setTalentCardPath(talentCardQuery.data.talentcardFiles[0].path);
    }
  }, [
    cvPath,
    portfolioPath,
    talentCardPath,
    cvQuery.data,
    shortPortfolioFiles,
    talentCardQuery.data,
  ]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  if (!Number.isFinite(jobId)) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Offre introuvable"
        description="Identifiant d'offre invalide."
      />
    );
  }

  const cvFiles = cvQuery.data?.cvFiles ?? [];
  const talentCardFiles = talentCardQuery.data?.talentcardFiles ?? [];

  const anyLoading = cvQuery.isLoading || talentCardQuery.isLoading || portfolioQuery.isLoading;
  if (anyLoading) {
    return (
      <div className="max-w-[900px] mx-auto py-6">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (cvQuery.isError) return <ErrorState onRetry={() => cvQuery.refetch()} />;
  if (talentCardQuery.isError) return <ErrorState onRetry={() => talentCardQuery.refetch()} />;
  if (portfolioQuery.isError) return <ErrorState onRetry={() => portfolioQuery.refetch()} />;

  const canSubmit = Boolean(cvPath && portfolioPath && talentCardPath);

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-5">
        <Link
          href={`/app/matching/offres/${jobId}`}
          className={`inline-flex items-center gap-2 text-[13px] ${
            isLight ? "text-black/70 hover:text-black" : "text-white/60 hover:text-white"
          }`}
        >
          <ArrowLeft size={14} />
          Retour à l'offre
        </Link>
      </div>

      <div
        className={`rounded-2xl border p-6 sm:p-7 ${
          isLight
            ? "bg-[#faf7f7] border-[#f1d5d7] shadow-[0_18px_40px_rgba(0,0,0,0.06)]"
            : "bg-zinc-900/50 border-white/[0.08]"
        }`}
      >
        <h1 className={`text-[22px] font-bold mb-1 ${isLight ? "text-tap-red" : "text-white"}`}>
          Formulaire de candidature
        </h1>
        <p className={`text-[13px] mb-6 ${isLight ? "text-black/60" : "text-white/45"}`}>
          Sélectionnez vos documents et ajoutez un lien si vous en avez.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;

            applyToJob.mutate(
              {
                jobId,
                cvPath,
                portfolioPath,
                talentCardPath,
                lien: lien.trim() || null,
              },
              {
                onSuccess: () => {
                  router.push("/app/matching");
                },
              },
            );
          }}
        >
          <div className="space-y-1">
            <label className={`text-[12px] font-semibold flex items-center gap-2 ${isLight ? "text-black/70" : "text-white/60"}`}>
              <FileText size={14} />
              CV (obligatoire)
            </label>
            <DropdownSelect
              isLight={isLight}
              value={cvPath ?? ""}
              onChange={(next) => setCvPath(next || null)}
              placeholder="Choisir votre CV"
              disabled={cvFiles.length === 0}
              groups={[
                {
                  options: cvFiles.map((f) => ({ value: f.path, label: f.name })),
                },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[12px] font-semibold flex items-center gap-2 ${isLight ? "text-black/70" : "text-white/60"}`}>
              <Briefcase size={14} />
              Portfolio (court) (obligatoire)
            </label>
            <DropdownSelect
              isLight={isLight}
              value={portfolioPath ?? ""}
              onChange={(next) => setPortfolioPath(next || null)}
              placeholder="Choisir votre portfolio"
              disabled={shortPortfolioFiles.length === 0}
              groups={[
                {
                  options: shortPortfolioFiles.map((f: any) => ({
                    value: f.path,
                    label: f.name,
                  })),
                },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[12px] font-semibold flex items-center gap-2 ${isLight ? "text-black/70" : "text-white/60"}`}>
              <Award size={14} />
              Talent Card (obligatoire)
            </label>
            <DropdownSelect
              isLight={isLight}
              value={talentCardPath ?? ""}
              onChange={(next) => setTalentCardPath(next || null)}
              placeholder="Choisir votre Talent Card"
              disabled={talentCardFiles.length === 0}
              groups={[
                {
                  options: talentCardFiles.map((f) => ({ value: f.path, label: f.name })),
                },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[12px] font-semibold flex items-center gap-2 ${isLight ? "text-black/70" : "text-white/60"}`}>
              <LinkIcon size={14} />
              Lien (optionnel)
            </label>
            <input
              type="url"
              className="input-premium w-full"
              placeholder="https://..."
              value={lien}
              onChange={(e) => setLien(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-tap-red text-white text-[13px] font-semibold hover:bg-tap-red-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={applyToJob.isPending || !canSubmit}
          >
            {applyToJob.isPending ? "Envoi..." : "Envoyer la candidature"}
          </button>
        </form>
      </div>
    </div>
  );
}

