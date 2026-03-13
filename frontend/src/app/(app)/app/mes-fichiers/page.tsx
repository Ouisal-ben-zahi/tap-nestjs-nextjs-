"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatCvFiles, useCandidatTalentcardFiles, useCandidatPortfolioPdfs, useUploadCv } from "@/hooks/use-candidat";
import FileCard from "@/components/ui/FileCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FolderOpen, FileText, Award, Briefcase, Upload, X } from "lucide-react";

type Tab = "cv" | "talentcard" | "portfolio";

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: "cv", label: "CV", icon: FileText },
  { key: "talentcard", label: "Talent Cards", icon: Award },
  { key: "portfolio", label: "Portfolio", icon: Briefcase },
];

export default function MesFichiersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("cv");
  const { isCandidat } = useAuth();

  const cvQuery = useCandidatCvFiles();
  const talentcardQuery = useCandidatTalentcardFiles();
  const portfolioQuery = useCandidatPortfolioPdfs();
  const uploadCv = useUploadCv();

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

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <FolderOpen size={13} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              Mes fichiers
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Documents & fichiers
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Retrouvez vos CV, talent cards et portfolios générés par l&apos;IA.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-zinc-900/50 rounded-xl border border-white/[0.06] w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-300 ${
                activeTab === tab.key
                  ? "bg-tap-red/10 text-tap-red font-medium"
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
                ? "border-tap-red/50 bg-tap-red/5"
                : "border-white/[0.08] hover:border-white/[0.15] bg-zinc-900/30"
            }`}
          >
            {uploadCv.isPending ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-tap-red border-t-transparent rounded-full animate-spin" />
                <span className="text-white/60 text-sm">Upload en cours...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm mb-1">Glissez votre CV ici ou</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-tap-red/10 hover:bg-tap-red/20 text-tap-red rounded-lg text-sm cursor-pointer transition">
                  <Upload size={14} />
                  Choisir un fichier
                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </label>
                <p className="text-white/25 text-xs mt-2">PDF uniquement</p>
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
                <FileCard key={i} {...file} />
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
                <FileCard key={i} {...file} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === "portfolio" && (
        <div>
          {portfolioQuery.isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : portfolioQuery.isError ? (
            <ErrorState onRetry={() => portfolioQuery.refetch()} />
          ) : !portfolioQuery.data?.portfolioPdfFiles?.length ? (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Aucun portfolio"
              description="Vos portfolios (court et long) seront générés automatiquement."
            />
          ) : (
            <div className="grid gap-3">
              {portfolioQuery.data.portfolioPdfFiles.map((file, i) => (
                <FileCard key={i} {...file} type={file.type} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
