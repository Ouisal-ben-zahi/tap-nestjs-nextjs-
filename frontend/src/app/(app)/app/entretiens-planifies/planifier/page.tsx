"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  User,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useMatchedCandidatesByOffer,
  useRecruiterCandidateBasicProfile,
  useRecruiterCompanyProfile,
  useRecruiterScheduledInterviewForApplication,
} from "@/hooks/use-recruteur";
import { useUiStore } from "@/stores/ui";
import EmptyState from "@/components/ui/EmptyState";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  recruteurService,
  type ScheduleRecruiterInterviewPayload,
} from "@/services/recruteur.service";
import { getApiErrorMessage } from "@/lib/api-error";

type InterviewTypeKey = "EN_LIGNE" | "PRESENTIEL" | "TELEPHONIQUE";

const INTERVIEW_TYPE_OPTIONS: { value: InterviewTypeKey; label: string }[] = [
  { value: "EN_LIGNE", label: "Visioconférence" },
  { value: "PRESENTIEL", label: "Présentiel" },
  { value: "TELEPHONIQUE", label: "Entretien téléphonique" },
];

function dbInterviewTypeToKey(db: string): InterviewTypeKey {
  const u = String(db).toUpperCase().replace(/\s/g, "_");
  if (u === "EN_LIGNE") return "EN_LIGNE";
  if (u === "PRESENTIEL") return "PRESENTIEL";
  return "TELEPHONIQUE";
}

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEKDAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

export default function PlanifierEntretienPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const addToast = useUiStore((s) => s.addToast);
  const isRecruteur = user?.role === "recruteur";
  const router = useRouter();
  const queryClient = useQueryClient();
  const schedulePrefilledRef = useRef(false);

  const jobId = Number(searchParams.get("jobId") ?? 0);
  const candidateId = Number(searchParams.get("candidateId") ?? 0);
  const candidateNameFromQuery = searchParams.get("candidateName") ?? "";
  const jobTitle = searchParams.get("jobTitle") ?? "Offre";

  const matchedQuery = useMatchedCandidatesByOffer(
    Number.isFinite(jobId) && jobId > 0 ? jobId : null,
    isRecruteur && Number.isFinite(jobId) && jobId > 0,
  );
  const basicProfileQuery = useRecruiterCandidateBasicProfile(
    Number.isFinite(candidateId) && candidateId > 0 ? candidateId : null,
    isRecruteur && Number.isFinite(candidateId) && candidateId > 0,
  );

  const scheduledInterviewQuery = useRecruiterScheduledInterviewForApplication(
    Number.isFinite(jobId) && jobId > 0 ? jobId : null,
    Number.isFinite(candidateId) && candidateId > 0 ? candidateId : null,
    isRecruteur,
  );
  const companyProfileQuery = useRecruiterCompanyProfile(isRecruteur);

  useEffect(() => {
    schedulePrefilledRef.current = false;
  }, [jobId, candidateId]);

  const isEditMode = Boolean(scheduledInterviewQuery.data?.interview?.id);

  const matchedCandidate = useMemo(() => {
    const list = matchedQuery.data?.candidates ?? [];
    return list.find((c) => Number(c.candidate_id ?? 0) === candidateId) ?? null;
  }, [matchedQuery.data?.candidates, candidateId]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewTypeKey>("EN_LIGNE");
  const [interviewAddress, setInterviewAddress] = useState("");
  const [interviewTypeOpen, setInterviewTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const calendarDays = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
    const cells: Array<{ day: number; dateIso: string } | null> = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateIso: iso });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarCursor]);

  const timeOptions = useMemo(() => {
    const result: string[] = [];
    for (let h = 8; h <= 20; h++) {
      result.push(`${String(h).padStart(2, "0")}:00`);
      if (h < 20) result.push(`${String(h).padStart(2, "0")}:30`);
    }
    return result;
  }, []);

  useEffect(() => {
    const fullName =
      [basicProfileQuery.data?.prenom, basicProfileQuery.data?.nom]
        .filter(Boolean)
        .join(" ")
        .trim() || candidateNameFromQuery;
    const parts = fullName.split(/\s+/).filter(Boolean);
    setFirstName(
      basicProfileQuery.data?.prenom ?? matchedCandidate?.candidate?.prenom ?? parts[0] ?? "",
    );
    setLastName(
      basicProfileQuery.data?.nom ??
        matchedCandidate?.candidate?.nom ??
        (parts.length > 1 ? parts.slice(1).join(" ") : ""),
    );
    setCountry(basicProfileQuery.data?.pays ?? matchedCandidate?.candidate?.pays ?? "");
    setCity(basicProfileQuery.data?.ville ?? matchedCandidate?.candidate?.ville ?? "");
  }, [basicProfileQuery.data, candidateNameFromQuery, matchedCandidate]);

  useEffect(() => {
    if (!scheduledInterviewQuery.isSuccess) return;
    if (schedulePrefilledRef.current) return;
    schedulePrefilledRef.current = true;
    const row = scheduledInterviewQuery.data?.interview;
    if (!row?.interview_date) return;
    setInterviewType(dbInterviewTypeToKey(row.interview_type));
    setInterviewAddress(
      typeof row.interview_address === "string" && row.interview_address.trim()
        ? row.interview_address.trim()
        : "",
    );
    setInterviewDate(row.interview_date);
    const tm = String(row.interview_time ?? "").trim();
    setInterviewTime(tm.length >= 5 ? tm.slice(0, 5) : tm);
    const d = new Date(`${row.interview_date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      setCalendarCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [scheduledInterviewQuery.isSuccess, scheduledInterviewQuery.data]);

  /** Préremplissage adresse présentiel depuis le profil entreprise (`recruteurs.adresse`). */
  useEffect(() => {
    if (interviewType !== "PRESENTIEL") return;
    const fromProfile = companyProfileQuery.data?.adresse?.trim();
    if (!fromProfile) return;
    setInterviewAddress((prev) => (prev.trim() ? prev : fromProfile));
  }, [interviewType, companyProfileQuery.data?.adresse]);

  const scheduleInterviewMutation = useMutation({
    mutationFn: (payload: ScheduleRecruiterInterviewPayload) =>
      recruteurService.scheduleRecruiterInterview(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["recruteur", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["recruteur", "planned-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["recruteur", "company-profile"] });
      queryClient.invalidateQueries({
        queryKey: ["recruteur", "scheduled-interview", jobId, candidateId],
      });
      const updated = Boolean(res.updated);
      if (updated) {
        addToast({
          message: res.mailSent
            ? "Planification mise à jour — e-mails envoyés au candidat et au recruteur."
            : `Planification mise à jour${res.mailError ? ` — e-mail : ${res.mailError}` : ""}.`,
          type: "success",
        });
      } else {
        addToast({
          message: res.mailSent
            ? "Entretien planifié — e-mails envoyés au candidat et au recruteur."
            : `Entretien planifié, mais envoi d'e-mail incomplet ou impossible : ${res.mailError ?? "inconnu"}`,
          type: "success",
        });
      }
      router.push("/app/entretiens-planifies");
    },
    onError: (error) => {
      addToast({
        message: getApiErrorMessage(error, "Impossible de planifier l'entretien."),
        type: "error",
      });
    },
  });

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<User className="w-10 h-10" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  return (
    <div className="max-w-[980px] mx-auto">
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <Link
            href="/app/entretiens-planifies"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white mb-3"
          >
            <ArrowLeft size={14} />
            Retour aux entretiens
          </Link>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            {isEditMode ? "Modifier l'entretien" : "Planifier un entretien"}
          </h1>
          <p className="text-[14px] mt-2 text-white/45 font-light">
            Candidats validés — <span className="text-tap-red font-semibold">{jobTitle}</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-5 sm:p-6 bg-zinc-900/50 border border-white/[0.06]">
        <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold mb-5">
          {isEditMode ? "Modifier les informations" : "Formulaire de planification"}
        </h2>

        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          onSubmit={(e) => {
            e.preventDefault();

            if (!jobId || !candidateId) {
              addToast({ message: "Données de planification invalides.", type: "error" });
              return;
            }
            if (!interviewDate || !interviewTime) {
              addToast({ message: "Choisissez une date et un horaire.", type: "error" });
              return;
            }
            if (interviewType === "PRESENTIEL" && !interviewAddress.trim()) {
              addToast({
                message: "Indiquez l'adresse du lieu pour un entretien en présentiel.",
                type: "error",
              });
              return;
            }

            scheduleInterviewMutation.mutate({
              job_id: jobId,
              candidate_id: candidateId,
              interview_type: interviewType,
              interview_date: interviewDate,
              interview_time: interviewTime,
              interview_address:
                interviewType === "PRESENTIEL" ? interviewAddress.trim() : undefined,
            });
          }}
        >
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Nom</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Nom"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Prénom</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Prénom"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Pays</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              disabled
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Pays"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/45 mb-1.5">Ville</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder="Ville"
            />
          </div>

          {interviewType === "PRESENTIEL" ? (
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div className="relative min-w-0">
                <label className="block text-[11px] text-white/45 mb-1.5">
                  Type d&apos;entretien
                </label>
                <button
                  type="button"
                  onClick={() => setInterviewTypeOpen((v) => !v)}
                  className="input-premium h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] inline-flex items-center justify-between"
                >
                  <span className="truncate text-left">
                    {INTERVIEW_TYPE_OPTIONS.find((o) => o.value === interviewType)?.label ??
                      interviewType}
                  </span>
                  <ChevronDown size={14} className="text-white/45 shrink-0" />
                </button>
                {interviewTypeOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full min-w-[min(100%,280px)] bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                    {INTERVIEW_TYPE_OPTIONS.map((opt) => {
                      const active = interviewType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setInterviewType(opt.value);
                            setInterviewTypeOpen(false);
                            if (opt.value === "PRESENTIEL") {
                              const fromProfile = companyProfileQuery.data?.adresse?.trim();
                              setInterviewAddress((prev) =>
                                prev.trim() ? prev : fromProfile ?? "",
                              );
                            }
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <label className="block text-[11px] text-white/45 mb-1.5">
                  Adresse du lieu d&apos;entretien
                </label>
                <textarea
                  value={interviewAddress}
                  onChange={(e) => setInterviewAddress(e.target.value)}
                  rows={3}
                  placeholder="Prérempli depuis votre profil entreprise — modifiable"
                  className="w-full flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/85 outline-none focus:border-white/[0.18] placeholder:text-white/35 resize-y min-h-[5rem]"
                />
                <p className="mt-1.5 text-[11px] text-white/35">
                  Enregistrée sur l&apos;entretien et sur votre profil entreprise si modifiée.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative sm:col-span-2 min-w-0">
              <label className="block text-[11px] text-white/45 mb-1.5">Type d&apos;entretien</label>
              <button
                type="button"
                onClick={() => setInterviewTypeOpen((v) => !v)}
                className="input-premium h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] inline-flex items-center justify-between"
              >
                <span>
                  {INTERVIEW_TYPE_OPTIONS.find((o) => o.value === interviewType)?.label ??
                    interviewType}
                </span>
                <ChevronDown size={14} className="text-white/45" />
              </button>
              {interviewTypeOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  {INTERVIEW_TYPE_OPTIONS.map((opt) => {
                    const active = interviewType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setInterviewType(opt.value);
                          setInterviewTypeOpen(false);
                          if (opt.value === "PRESENTIEL") {
                            const fromProfile = companyProfileQuery.data?.adresse?.trim();
                            setInterviewAddress((prev) =>
                              prev.trim() ? prev : fromProfile ?? "",
                            );
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                          active
                            ? "text-white bg-red-500/15"
                            : "text-white/80 hover:text-white hover:bg-red-500/8"
                        }`}
                      >
                        <span className="flex-1 truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-[11px] text-white/45 mb-1.5">Date</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDateOpen((v) => !v)}
                  className="relative input-premium h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] inline-flex items-center"
                >
                  <span className="text-left truncate">{interviewDate || "Choisir une date"}</span>
                  <ChevronDown size={14} className="ml-auto text-white/45 shrink-0" />
                </button>
                {dateOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full min-w-[280px] bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarCursor(
                            (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                          )
                        }
                        className="p-1.5 rounded-full border border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                        aria-label="Mois précédent"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <p className="text-[12px] font-semibold text-white/85">
                        {MONTHS_FR[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarCursor(
                            (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                          )
                        }
                        className="p-1.5 rounded-full border border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                        aria-label="Mois suivant"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {WEEKDAYS_FR.map((w) => (
                        <div key={w} className="text-center text-[10px] text-white/45 py-1">
                          {w}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((cell, idx) =>
                        cell ? (
                          <button
                            key={cell.dateIso}
                            type="button"
                            onClick={() => {
                              setInterviewDate(cell.dateIso);
                              setDateOpen(false);
                            }}
                            className={`h-8 rounded-lg text-[12px] transition ${
                              interviewDate === cell.dateIso
                                ? "bg-red-500/20 text-red-300 border border-red-500/35"
                                : "text-white/80 hover:bg-white/[0.06] border border-transparent"
                            }`}
                          >
                            {cell.day}
                          </button>
                        ) : (
                          <div key={`empty-${idx}`} className="h-8" />
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-[11px] text-white/45 mb-1.5">Horaire</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTimeOpen((v) => !v)}
                  className="input-premium h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3 text-[13px] text-white/85 outline-none focus:border-white/[0.18] inline-flex items-center"
                >
                  <span className="text-left truncate">{interviewTime || "Choisir un horaire"}</span>
                  <ChevronDown size={14} className="ml-auto text-white/45 shrink-0" />
                </button>
                {timeOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full bg-zinc-900/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50 p-2">
                    <div className="max-h-56 overflow-y-auto pr-1">
                      {timeOptions.map((slot) => {
                        const active = interviewTime === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setInterviewTime(slot);
                              setTimeOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition ${
                              active
                                ? "text-white bg-red-500/15"
                                : "text-white/80 hover:text-white hover:bg-red-500/8"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              aria-busy={scheduleInterviewMutation.isPending}
              className="btn-primary min-w-[220px] inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-80 disabled:cursor-not-allowed transition-opacity"
              disabled={
                scheduleInterviewMutation.isPending || scheduledInterviewQuery.isLoading
              }
            >
              {scheduleInterviewMutation.isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>
                    {isEditMode
                      ? "Enregistrement en cours…"
                      : "Planification en cours…"}
                  </span>
                </>
              ) : isEditMode ? (
                "Enregistrer les modifications"
              ) : (
                "Confirmer l'entretien"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
