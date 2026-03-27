"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Video, MapPin, Phone } from "lucide-react";
import { formatInterviewType } from "@/lib/format-interview-type";

const PAGE_SIZE = 5;

export type PlannedInterviewItem = {
  id: number;
  jobTitle: string | null;
  interviewType: string;
  interviewDate: string | null;
  interviewTime: string | null;
};

const MODE_META: Record<
  string,
  { dot: string; label: string; legendClass: string; Icon: typeof Video }
> = {
  EN_LIGNE: {
    dot: "bg-blue-500",
    label: "En ligne",
    legendClass: "text-blue-400",
    Icon: Video,
  },
  PRESENTIEL: {
    dot: "bg-emerald-500",
    label: "Présentiel",
    legendClass: "text-emerald-400",
    Icon: MapPin,
  },
  TELEPHONIQUE: {
    dot: "bg-violet-500",
    label: "Téléphonique",
    legendClass: "text-violet-400",
    Icon: Phone,
  },
};

function getModeMeta(type: string | null | undefined) {
  const k = String(type ?? "").toUpperCase();
  return (
    MODE_META[k] ?? {
      dot: "bg-zinc-400",
      label: formatInterviewType(type),
      legendClass: "text-zinc-400",
      Icon: Calendar,
    }
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCalendarCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, monthIndex, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });
  while (cells.length < 42) cells.push({ date: null });
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface PlannedInterviewsAgendaSectionProps {
  items: PlannedInterviewItem[];
  isLight: boolean;
}

export default function PlannedInterviewsAgendaSection({ items, isLight }: PlannedInterviewsAgendaSectionProps) {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [agendaMonth, setAgendaMonth] = useState(() => new Date());

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const da = a.interviewDate ? new Date(a.interviewDate).getTime() : 0;
      const db = b.interviewDate ? new Date(b.interviewDate).getTime() : 0;
      if (db !== da) return db - da;
      return String(b.interviewTime ?? "").localeCompare(String(a.interviewTime ?? ""));
    });
    return copy;
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleList = showAll ? sorted : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const interviewsByDay = useMemo(() => {
    const m = new Map<string, PlannedInterviewItem[]>();
    for (const it of items) {
      if (!it.interviewDate) continue;
      const d = new Date(it.interviewDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = dateKey(d);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(it);
    }
    return m;
  }, [items]);

  const y = agendaMonth.getFullYear();
  const m = agendaMonth.getMonth();
  const cells = useMemo(() => getCalendarCells(y, m), [y, m]);
  const monthLabel = agendaMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const listRowClass = `group relative card-animated-border rounded-2xl overflow-hidden border p-4 cursor-default w-full ${
    isLight
      ? "bg-[#020001] border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
      : "bg-[#020001] border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
  }`;

  return (
    <div id="entretiens-planifies" className="mb-10">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="w-1 h-5 rounded-full shrink-0 bg-tap-red" />
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
          Entretiens déjà planifiés
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">
        {/* Gauche : liste */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-w-0">
          <div className={showAll ? "max-h-[min(520px,70vh)] overflow-y-auto pr-1 space-y-3" : "space-y-3"}>
            {visibleList.map((item) => {
              const meta = getModeMeta(item.interviewType);
              const Icon = meta.Icon;
              return (
                <div key={item.id} className={listRowClass}>
                  {!isLight && (
                    <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                      <div className="absolute -top-12 -right-6 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                      <div className="absolute -bottom-10 -left-6 w-48 h-48 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>
                  )}
                  <div className="relative grid grid-cols-1 min-[520px]:grid-cols-[1fr_minmax(0,11rem)_auto] gap-3 min-[520px]:gap-4 min-[520px]:items-center">
                    {/* Col. 1 : titre puis date / heure */}
                    <div className="min-w-0 flex flex-col gap-1.5">
                      <p className={`text-[14px] sm:text-[15px] font-semibold leading-snug ${isLight ? "text-black" : "text-white"}`}>
                        {item.jobTitle ?? "Offre sans titre"}
                      </p>
                      <p className={`text-[12px] tabular-nums ${isLight ? "text-black/70" : "text-white/55"}`}>
                        {item.interviewDate
                          ? new Date(item.interviewDate).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "Date non définie"}{" "}
                        <span className={isLight ? "text-black/40" : "text-white/35"}>·</span>{" "}
                        {item.interviewTime ? item.interviewTime.slice(0, 5) : "—"}
                      </p>
                    </div>

                    {/* Col. 2 : type d&apos;entretien */}
                    <div className="min-w-0 flex flex-col gap-1 min-[520px]:items-end min-[520px]:justify-center min-[520px]:text-right">
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] font-semibold ${isLight ? "text-black/45" : "text-white/40"}`}
                      >
                        Type d&apos;entretien
                      </span>
                      <span
                        className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          isLight ? "border-white/10 bg-white/5 text-black/85" : "border-white/[0.08] bg-white/[0.04] text-white/90"
                        }`}
                      >
                        <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                        <span className="truncate">{meta.label}</span>
                      </span>
                    </div>

                    {/* Col. 3 : icône (style dashboard) */}
                    <div className="flex justify-start min-[520px]:justify-end">
                      <div className="w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center bg-tap-red/[0.08] border-tap-red/20">
                        <Icon size={18} className="text-tap-red" strokeWidth={1.75} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 pt-1">
            {sorted.length > PAGE_SIZE ? (
              <button
                type="button"
                onClick={() => {
                  setShowAll((v) => !v);
                  if (showAll) setPage(1);
                }}
                className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-[12px] font-medium transition ${
                  isLight
                    ? "border-black/15 hover:bg-black/5 text-black/80"
                    : "border-white/[0.12] hover:bg-white/[0.06] text-white/85"
                }`}
              >
                {showAll ? "Réduire la liste" : `Liste des entretiens (${sorted.length})`}
              </button>
            ) : null}

            {!showAll && sorted.length > PAGE_SIZE ? (
              <div
                className={`flex items-center justify-center gap-2 sm:ml-auto ${
                  isLight ? "border-t border-black/10 sm:border-0 pt-3 sm:pt-0" : "border-t border-white/[0.08] sm:border-0 pt-3 sm:pt-0"
                }`}
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition disabled:opacity-35 disabled:cursor-not-allowed ${
                    isLight
                      ? "border-black/15 hover:bg-black/5 text-black/70"
                      : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                  }`}
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className={`text-[12px] tabular-nums min-w-[7rem] text-center ${isLight ? "text-black/70" : "text-white/70"}`}>
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition disabled:opacity-35 disabled:cursor-not-allowed ${
                    isLight
                      ? "border-black/15 hover:bg-black/5 text-black/70"
                      : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                  }`}
                  aria-label="Page suivante"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Droite : agenda */}
        <div
          className={`lg:col-span-5 rounded-2xl p-5 sm:p-6 ${
            isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.08]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar size={18} className="text-tap-red shrink-0" />
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold truncate capitalize ${isLight ? "text-black" : "text-white/70"}`}>
                {monthLabel}
              </h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setAgendaMonth(new Date(y, m - 1, 1))}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition ${
                  isLight
                    ? "border-black/12 hover:bg-black/5 text-black/70"
                    : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                }`}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setAgendaMonth(new Date(y, m + 1, 1))}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition ${
                  isLight
                    ? "border-black/12 hover:bg-black/5 text-black/70"
                    : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                }`}
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide mb-2 opacity-70">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <span key={d} className={isLight ? "text-black/50" : "text-white/40"}>
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`empty-${idx}`} className="aspect-square min-h-[2.25rem]" />;
              }
              const key = dateKey(cell.date);
              const dayItems = interviewsByDay.get(key) ?? [];
              const today = new Date();
              const isToday = isSameDay(cell.date, today);

              return (
                <div
                  key={key}
                  className={`aspect-square min-h-[2.25rem] rounded-lg flex flex-col items-center justify-start pt-1 px-0.5 pb-1 border ${
                    isToday
                      ? isLight
                        ? "border-tap-red/50 bg-tap-red/5"
                        : "border-tap-red/40 bg-tap-red/10"
                      : isLight
                        ? "border-black/[0.06] bg-black/[0.02]"
                        : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <span className={`text-[11px] font-medium leading-none ${isLight ? "text-black/80" : "text-white/80"}`}>
                    {cell.date.getDate()}
                  </span>
                  {dayItems.length > 0 ? (
                    <div className="mt-auto flex flex-wrap justify-center gap-0.5 w-full pb-0.5">
                      {dayItems.map((it) => {
                        const dot = getModeMeta(it.interviewType).dot;
                        return <span key={it.id} className={`size-1.5 rounded-full shrink-0 ${dot}`} title={it.jobTitle ?? ""} />;
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className={`text-[10px] mt-3 mb-3 leading-snug ${isLight ? "text-black/45" : "text-white/35"}`}>
            Chaque couleur correspond au type de modalité d&apos;entretien (en ligne, présentiel ou téléphonique).
          </p>

          <div className={`flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t ${isLight ? "border-black/10" : "border-white/[0.08]"}`}>
            {Object.entries(MODE_META).map(([k, v]) => {
              const LegIcon = v.Icon;
              return (
                <span key={k} className={`inline-flex items-center gap-1.5 text-[11px] ${isLight ? "text-black/70" : "text-white/60"}`}>
                  <span className={`size-2 rounded-full shrink-0 ${v.dot}`} />
                  <LegIcon size={12} className={v.legendClass} strokeWidth={2} />
                  {v.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
