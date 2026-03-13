"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurJobs, useCreateJob } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Briefcase, Plus, X, Send, MapPin, Clock, DollarSign, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { JobPayload } from "@/types/recruteur";

const CATEGORIES = ["Développement", "Design", "Marketing", "Commercial", "Finance", "RH", "Ingénierie", "Autre"];
const NIVEAUX = ["Junior", "Intermédiaire", "Senior", "Lead", "Manager"];
const CONTRATS = ["CDI", "CDD", "Stage", "Freelance", "Alternance"];

const emptyForm: JobPayload = {
  titre: "",
  description: "",
  categorie: "Développement",
  niveau: "Junior",
  type_contrat: "CDI",
  localisation: "",
  urgent: false,
};

export default function OffresPage() {
  const { isRecruteur } = useAuth();
  const jobsQuery = useRecruteurJobs();
  const createJob = useCreateJob();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobPayload>(emptyForm);

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createJob.mutateAsync(form);
    setForm(emptyForm);
    setShowForm(false);
  };

  const update = (field: keyof JobPayload, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
              <Briefcase size={13} className="text-tap-red" />
              <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
                Mes offres
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
              Offres d&apos;emploi
            </h1>
            <p className="text-white/45 text-[14px] mt-2 font-light">
              Créez et gérez vos offres. Les candidats sont matchés par l&apos;IA.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary gap-2"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Fermer" : "Nouvelle offre"}
          </button>
        </div>
      </div>

      {/* Job Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Titre du poste</label>
              <input value={form.titre} onChange={(e) => update("titre", e.target.value)} className="input-premium" placeholder="ex: Développeur Full Stack" required />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Catégorie</label>
              <select value={form.categorie} onChange={(e) => update("categorie", e.target.value)} className="input-premium">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Niveau</label>
              <select value={form.niveau} onChange={(e) => update("niveau", e.target.value)} className="input-premium">
                {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Contrat</label>
              <select value={form.type_contrat} onChange={(e) => update("type_contrat", e.target.value)} className="input-premium">
                {CONTRATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Localisation</label>
              <input value={form.localisation} onChange={(e) => update("localisation", e.target.value)} className="input-premium" placeholder="ex: Casablanca" required />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Salaire min (MAD)</label>
              <input type="number" value={form.salaire_min || ""} onChange={(e) => update("salaire_min", Number(e.target.value) || undefined)} className="input-premium" placeholder="5000" />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Salaire max (MAD)</label>
              <input type="number" value={form.salaire_max || ""} onChange={(e) => update("salaire_max", Number(e.target.value) || undefined)} className="input-premium" placeholder="15000" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">Description</label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input-premium min-h-[120px] resize-y" placeholder="Décrivez le poste, les missions et les compétences requises..." required />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update("urgent", !form.urgent)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all ${
                  form.urgent
                    ? "bg-red-500/10 border-red-500/25 text-red-400"
                    : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/[0.12]"
                }`}
              >
                <Clock size={14} />
                Urgent
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={createJob.isPending}
              className="btn-primary gap-2 disabled:opacity-50"
            >
              {createJob.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </span>
              ) : (
                <>
                  <Send size={14} />
                  Publier l&apos;offre
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Jobs List */}
      {jobsQuery.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : jobsQuery.isError ? (
        <ErrorState onRetry={() => jobsQuery.refetch()} />
      ) : !jobsQuery.data?.jobs?.length ? (
        <EmptyState
          icon={<Briefcase className="w-12 h-12" />}
          title="Aucune offre"
          description="Créez votre première offre pour commencer à recevoir des candidatures."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2 mt-2">
              <Plus size={14} />
              Créer une offre
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobsQuery.data.jobs.map((job) => (
            <div key={job.id} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[15px] font-semibold text-white truncate">{job.titre}</h3>
                    {job.urgent && <StatusBadge status="urgent" label="Urgent" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/40">
                    <span className="flex items-center gap-1"><MapPin size={12} />{job.localisation}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />{job.type_contrat}</span>
                    <span className="flex items-center gap-1"><Users size={12} />{job.niveau}</span>
                    {(job.salaire_min || job.salaire_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        {job.salaire_min && job.salaire_max ? `${job.salaire_min}-${job.salaire_max} MAD` : job.salaire_min ? `À partir de ${job.salaire_min} MAD` : `Jusqu'à ${job.salaire_max} MAD`}
                      </span>
                    )}
                  </div>
                  <p className="text-white/30 text-[12px] mt-2 line-clamp-2">{job.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-white/30">{formatDate(job.created_at)}</div>
                  {job.applicationCount !== undefined && (
                    <div className="mt-1 text-[12px] text-tap-red/70 font-medium">
                      {job.applicationCount} candidature{job.applicationCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
