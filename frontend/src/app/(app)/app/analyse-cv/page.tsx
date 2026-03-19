"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatCvFiles, useCandidatTalentcardFiles, useCandidatPortfolioPdfs, useUploadCv, useDeleteCvFile } from "@/hooks/use-candidat";
import FileCard from "@/components/ui/FileCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileText, Upload, Award, Briefcase, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function AnalyseCvAppPage() {
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const cvQuery = useCandidatCvFiles();
  const [polling, setPolling] = useState(false);
  const talentcardQuery = useCandidatTalentcardFiles(polling ? 10000 : false);
  const portfolioQuery = useCandidatPortfolioPdfs();
  const uploadCv = useUploadCv();
  const deleteCv = useDeleteCvFile();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      uploadCv.mutate(file);
    }
  }, [uploadCv]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCv.mutate(file);
    e.target.value = "";
  }, [uploadCv]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<FileText className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  const hasCvs = (cvQuery.data?.cvFiles?.length ?? 0) > 0;
  const hasTalentCards = (talentcardQuery.data?.talentcardFiles?.length ?? 0) > 0;
  const isAnalyzing = hasCvs && !hasTalentCards && !talentcardQuery.isLoading;

  // Auto-poll talent cards every 10s while AI analysis is in progress
  useEffect(() => {
    setPolling(isAnalyzing);
  }, [isAnalyzing]);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <FileText size={13} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              Analyse CV
            </span>
          </div>
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Analyse de votre CV
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Uploadez votre CV et laissez notre IA extraire compétences, expériences et potentiel.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 mb-8 ${
          dragOver
            ? "border-tap-red/60 bg-tap-red/10"
            : isLight
              ? "border-tap-red/40 hover:border-tap-red/70 bg-white"
              : "border-white/[0.08] hover:border-white/[0.15] bg-zinc-900/30"
        }`}
      >
        {uploadCv.isPending ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-tap-red border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm ${isLight ? "text-black/70" : "text-white/60"}`}>Upload et analyse en cours...</span>
          </div>
        ) : (
          <>
            <Upload className={`w-8 h-8 mx-auto mb-3 ${isLight ? "text-tap-red" : "text-white/20"}`} />
            <p className={`text-sm mb-1 ${isLight ? "text-black/70" : "text-white/50"}`}>Glissez votre CV ici ou</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-tap-red/10 hover:bg-tap-red/20 text-tap-red rounded-lg text-sm cursor-pointer transition"
            >
              <Upload size={14} />
              Choisir un fichier
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <p className={`text-xs mt-2 ${isLight ? "text-black/50" : "text-white/25"}`}>PDF uniquement</p>
          </>
        )}
      </div>

      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="bg-yellow-500/[0.06] border border-yellow-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Loader2 size={18} className="text-yellow-500 animate-spin" />
          </div>
          <div>
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Analyse en cours...</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Notre IA analyse votre CV. Vos Talent Cards seront disponibles sous peu. Vous pouvez revenir plus tard.
            </p>
          </div>
        </div>
      )}

      {/* Mes CV */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-tap-red" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>Mes CV</h2>
        </div>

        {cvQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : cvQuery.isError ? (
          <ErrorState onRetry={() => cvQuery.refetch()} />
        ) : !cvQuery.data?.cvFiles?.length ? (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="Aucun CV"
            description="Uploadez votre premier CV ci-dessus pour lancer l'analyse IA."
          />
        ) : (
          <div className="grid gap-3">
            {cvQuery.data.cvFiles.map((file, i) => (
              <FileCard key={i} {...file} onDelete={(p) => deleteCv.mutate(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Talent Cards */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-blue-500" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/50"}`}>
            <Award size={13} className="text-blue-500" /> Talent Cards
          </h2>
        </div>

        {talentcardQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : talentcardQuery.isError ? (
          <ErrorState onRetry={() => talentcardQuery.refetch()} />
        ) : !talentcardQuery.data?.talentcardFiles?.length ? (
          <EmptyState
            icon={<Award className="w-10 h-10" />}
            title={hasCvs ? "En attente de l'analyse" : "Aucune Talent Card"}
            description={hasCvs
              ? "Vos Talent Cards seront générées automatiquement après l'analyse de votre CV."
              : "Uploadez d'abord un CV pour que l'IA génère vos Talent Cards."
            }
            action={!hasCvs ? (
              <button onClick={() => fileRef.current?.click()} className="btn-primary gap-2 mt-2">
                <Upload size={14} /> Uploader un CV
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {talentcardQuery.data.talentcardFiles.map((file, i) => (
              <FileCard key={i} {...file} />
            ))}
          </div>
        )}
      </div>

      {/* Portfolio */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-green-500" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/50"}`}>
            <Briefcase size={13} className="text-green-500" /> Portfolio
          </h2>
        </div>

        {portfolioQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : portfolioQuery.isError ? (
          <ErrorState onRetry={() => portfolioQuery.refetch()} />
        ) : !portfolioQuery.data?.portfolioPdfFiles?.length ? (
          <EmptyState
            icon={<Briefcase className="w-10 h-10" />}
            title={hasCvs ? "En attente de l'analyse" : "Aucun portfolio"}
            description={hasCvs
              ? "Vos portfolios seront générés automatiquement après l'analyse."
              : "Uploadez d'abord un CV pour que l'IA génère vos portfolios."
            }
          />
        ) : (
          <div className="grid gap-3">
            {portfolioQuery.data.portfolioPdfFiles.map((file, i) => (
              <FileCard key={i} {...file} />
            ))}
          </div>
        )}
      </div>

      {/* Link to scoring */}
      {hasTalentCards && (
        <div className={`mt-8 pt-6 ${isLight ? "border-t border-black/10" : "border-t border-white/[0.04]"}`}>
          <Link href="/app/scoring" className="inline-flex items-center gap-2 text-tap-red hover:text-tap-red-hover text-[13px] font-medium transition-colors group">
            Voir votre score d&apos;employabilité
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}
