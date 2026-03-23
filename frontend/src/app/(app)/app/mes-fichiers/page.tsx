"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatCvFiles, useCandidatTalentcardFiles, useCandidatPortfolioPdfs, useUploadCv, useDeleteCvFile, useDeleteTalentcardFile, useDeletePortfolioPdfFile } from "@/hooks/use-candidat";
import FileCard from "@/components/ui/FileCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FolderOpen, FileText, Award, Briefcase, Upload } from "lucide-react";
import PortfolioLongChatModal from "@/components/app/portfolio/PortfolioLongChatModal";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

type Tab = "cv" | "talentcard" | "portfolio" | "portfolio-long";

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: "cv", label: "CV", icon: FileText },
  { key: "talentcard", label: "Talent Cards", icon: Award },
  { key: "portfolio", label: "Portfolio", icon: Briefcase },
  { key: "portfolio-long", label: "Portfolio long", icon: Briefcase },
];

export default function MesFichiersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("cv");
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const cvQuery = useCandidatCvFiles();
  const talentcardQuery = useCandidatTalentcardFiles();
  const portfolioQuery = useCandidatPortfolioPdfs();
  const uploadCv = useUploadCv();
  const deleteCv = useDeleteCvFile();
  const deleteTalentcard = useDeleteTalentcardFile();
  const deletePortfolioPdf = useDeletePortfolioPdfFile();
  const [portfolioLongModalOpen, setPortfolioLongModalOpen] = useState(false);

  const [dragOver, setDragOver] = useState(false);

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
        icon={<FolderOpen className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  const portfolioFiles = portfolioQuery.data?.portfolioPdfFiles ?? [];
  const shortPortfolioFiles = portfolioFiles.filter((file) => file.type !== "long");
  const longPortfolioFiles = portfolioFiles.filter((file) => file.type === "long");

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <FolderOpen size={13} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              Mes fichiers
            </span>
          </div>
          <h1
            className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${
              isLight ? "text-black" : "text-white"
            }`}
          >
            Documents & fichiers
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Retrouvez vos CV, talent cards et portfolios générés par l&apos;IA.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`flex gap-1 mb-8 p-1 rounded-xl border w-fit ${
          isLight ? "bg-white border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-300 ${
                activeTab === tab.key
                  ? isLight
                    ? "bg-tap-red text-white font-medium"
                    : "bg-tap-red/10 text-tap-red font-medium"
                  : isLight
                    ? "text-black/70 hover:bg-black/5"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CV Tab */}
      {activeTab === "cv" && (
        <div className="space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragOver
                ? "border-tap-red/60 bg-tap-red/10"
                : isLight
                  ? "border-tap-red/40 bg-white hover:border-tap-red/70"
                  : "border-white/[0.08] hover:border-white/[0.15] bg-zinc-900/30"
            }`}
          >
            {uploadCv.isPending ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-tap-red border-t-transparent rounded-full animate-spin" />
                <span className={`${isLight ? "text-black/70" : "text-white/60"} text-sm`}>Upload en cours...</span>
              </div>
            ) : (
              <>
                <Upload
                  className={`w-8 h-8 mx-auto mb-3 ${
                    isLight ? "text-tap-red" : "text-white/20"
                  }`}
                />
                <p className={`text-sm mb-1 ${isLight ? "text-black/70" : "text-white/50"}`}>
                  Glissez votre CV ici ou
                </p>
                <label
                  className="inline-flex items-center gap-2 px-4 py-2 bg-tap-red text-white rounded-lg text-sm cursor-pointer transition hover:bg-tap-red-hover"
                >
                  <Upload size={14} />
                  Choisir un fichier
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </label>
                <p className={`text-xs mt-2 ${isLight ? "text-black/50" : "text-white/25"}`}>PDF uniquement</p>
              </>
            )}
          </div>

          {/* Files list */}
          {cvQuery.isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : cvQuery.isError ? (
            <ErrorState onRetry={() => cvQuery.refetch()} />
          ) : !cvQuery.data?.cvFiles?.length ? (
            <EmptyState title="Aucun CV" description="Uploadez votre premier CV pour commencer l'analyse IA." />
          ) : (
            <div className="grid gap-3">
              {cvQuery.data.cvFiles.map((file, i) => (
                <FileCard key={i} {...file} onDelete={(path) => deleteCv.mutate(path)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Talent Cards Tab */}
      {activeTab === "talentcard" && (
        <div>
          {talentcardQuery.isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : talentcardQuery.isError ? (
            <ErrorState onRetry={() => talentcardQuery.refetch()} />
          ) : !talentcardQuery.data?.talentcardFiles?.length ? (
            <EmptyState
              icon={<Award className="w-12 h-12" />}
              title="Aucune Talent Card"
              description="Vos Talent Cards seront générées automatiquement après l'analyse de votre CV."
            />
          ) : (
            <div className="grid gap-3">
              {talentcardQuery.data.talentcardFiles.map((file, i) => (
                <FileCard key={i} {...file} onDelete={(path) => deleteTalentcard.mutate(path)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio (court) Tab */}
      {activeTab === "portfolio" && (
        <div>
          {portfolioQuery.isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : portfolioQuery.isError ? (
            <ErrorState onRetry={() => portfolioQuery.refetch()} />
          ) : !shortPortfolioFiles.length ? (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Aucun portfolio"
              description="Votre portfolio court apparaîtra ici."
            />
          ) : (
            <div className="grid gap-3">
              {shortPortfolioFiles.map((file, i) => (
                <FileCard key={i} {...file} type={file.type} onDelete={(path) => deletePortfolioPdf.mutate(path)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio long Tab */}
      {activeTab === "portfolio-long" && (
        <div>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className={`text-[13px] ${isLight ? "text-black/70" : "text-white/40"}`}>
              Générez votre portfolio long si vous souhaitez une version détaillée.
            </div>
            <button
              onClick={() => setPortfolioLongModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] transition bg-tap-red text-white hover:bg-tap-red-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Briefcase size={14} />
              Générer le portfolio long
            </button>
          </div>

          {portfolioQuery.isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : portfolioQuery.isError ? (
            <ErrorState onRetry={() => portfolioQuery.refetch()} />
          ) : !longPortfolioFiles.length ? (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Aucun portfolio long"
              description="Générez un portfolio long pour l'afficher ici."
            />
          ) : (
            <div className="grid gap-3">
              {longPortfolioFiles.map((file, i) => (
                <FileCard key={i} {...file} type={file.type} onDelete={(path) => deletePortfolioPdf.mutate(path)} />
              ))}
            </div>
          )}
        </div>
      )}

      <PortfolioLongChatModal
        open={portfolioLongModalOpen}
        onClose={() => setPortfolioLongModalOpen(false)}
      />
    </div>
  );
}
