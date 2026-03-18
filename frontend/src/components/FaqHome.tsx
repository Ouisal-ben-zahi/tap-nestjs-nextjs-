"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ChevronDown, Users, Building2, Sparkles } from "lucide-react";
import { useState } from "react";

const candidateFaqs = [
  {
    question: "TAP, c'est pour quels candidats ?",
    answer:
      "Jeunes diplômés, profils en reconversion ou en recherche d'un premier poste au Maroc, qui veulent prouver leurs compétences au-delà du CV.",
  },
  {
    question: "Que fait l’IA avec mon CV ?",
    answer:
      "L’IA lit votre CV, identifie vos compétences, vos expériences et vos forces, puis calcule un score d’employabilité et vous propose un parcours de micro-learning.",
  },
  {
    question: "Est-ce que TAP est payant pour moi ?",
    answer:
      "Non. Pour les candidats, TAP est 100 % gratuit : analyse du CV, score d’employabilité et recommandations de formation.",
  },
  {
    question: "Comment je suis mis en relation avec les entreprises ?",
    answer:
      "Une fois votre profil analysé et renforcé par la formation, vous apparaissez dans la base de talents validés, accessible aux recruteurs.",
  },
];

const companyFaqs = [
  {
    question: "Quel type d’entreprises utilise TAP ?",
    answer:
      "PME, grands groupes et recruteurs qui recrutent au Maroc et veulent des profils mieux évalués, plus opérationnels dès le jour 1.",
  },
  {
    question: "Comment fonctionne le scoring pour les entreprises ?",
    answer:
      "Chaque talent dispose d’un score global et de sous-scores par critère (technique, soft skills, adéquation marché…) pour aider à la décision.",
  },
  {
    question: "Comment accède-t-on aux Talents Cards ?",
    answer:
      "Les recruteurs se connectent à la plateforme TAP et explorent des Talents Cards notées de 0 à 100, comparables entre elles.",
  },
  {
    question: "Est-ce que TAP remplace mon processus RH ?",
    answer:
      "Non, TAP vient en amont pour qualifier les profils, réduire le temps de tri et sécuriser vos décisions à l’aide de la donnée et de l’IA.",
  },
];

export default function FaqHome() {
  const containerRef = useScrollReveal();
  const [activeTab, setActiveTab] = useState<"all" | "candidates" | "companies">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const displayedFaqs = (() => {
    if (activeTab === "candidates") {
      return candidateFaqs.slice(0, 5);
    }
    if (activeTab === "companies") {
      return companyFaqs.slice(0, 5);
    }
    // Mélange simple : alternance candidats / entreprises, limité à 5
    const mixed: { question: string; answer: string }[] = [];
    const max = 5;
    let i = 0;
    while (mixed.length < max && (i < candidateFaqs.length || i < companyFaqs.length)) {
      if (i < candidateFaqs.length) mixed.push(candidateFaqs[i]);
      if (mixed.length >= max) break;
      if (i < companyFaqs.length) mixed.push(companyFaqs[i]);
      i += 1;
    }
    return mixed.slice(0, max);
  })();

  return (
    <section ref={containerRef} className="relative py-10 sm:py-16 bg-transparent overflow-hidden">
      <div className="absolute top-[15%] right-[-120px] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[-120px] left-[-150px] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />

      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-right" />
            Questions fréquentes
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-left" />
          </span>
          <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08] mb-3">
            Tout comprendre sur <span className="font-bold">TAP</span>
          </h2>
          <p className="text-[14px] sm:text-[15px] text-white/40 max-w-[480px] mx-auto leading-[1.7] font-light">
            Voici les réponses aux questions que se posent le plus souvent les talents et les entreprises.
          </p>
        </div>

        {/* Filtres Candidats / Entreprises */}
        <div className="reveal flex justify-center mb-7 sm:mb-9">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#050505]/90 backdrop-blur-xl border border-white/[0.08] px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setOpenIndex(0);
              }}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-[1.2px] uppercase transition-all duration-200 ${
                activeTab === "all"
                  ? "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <Sparkles size={13} className={activeTab === "all" ? "text-[#D61D27]" : "text-white/50"} />
              Candidats & entreprises
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("candidates");
                setOpenIndex(0);
              }}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-[1.2px] uppercase transition-all duration-200 ${
                activeTab === "candidates"
                  ? "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <Users size={13} className={activeTab === "candidates" ? "text-[#D61D27]" : "text-white/50"} />
              Candidats
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("companies");
                setOpenIndex(0);
              }}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-[1.2px] uppercase transition-all duration-200 ${
                activeTab === "companies"
                  ? "bg-white text-black shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <Building2 size={13} className={activeTab === "companies" ? "text-[#D61D27]" : "text-white/50"} />
              Entreprises
            </button>
          </div>
        </div>

        {/* Liste des questions */}
        <div className="reveal-stagger max-w-[1200px] w-[90%] mx-auto flex flex-col gap-3.5">
          {displayedFaqs.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <button
                key={`${activeTab}-${item.question}`}
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="reveal-item text-left group relative rounded-2xl border border-white/[0.05] bg-[#050505]/95 transition-all duration-300 px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-tap-red/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:border-[#D61D27] hover:shadow-[0_10px_30px_rgba(214,29,39,0.15)]"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 relative z-[1]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white leading-[1.5]">
                        {item.question}
                      </p>
                      <span className="shrink-0 w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-tap-red/40 group-hover:bg-tap-red/10 transition-all duration-300">
                        <ChevronDown
                          size={14}
                          className={`text-white/60 transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
                        />
                      </span>
                    </div>
                    <div
                      className={`overflow-hidden transition-[max-height,opacity,margin-top] duration-300 ease-out ${
                        isOpen ? "max-h-40 opacity-100 mt-2.5" : "max-h-0 opacity-0 mt-0"
                      }`}
                    >
                      <p className="text-[12px] sm:text-[13px] text-white/45 leading-[1.7] font-light">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

