"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const candidateFaqs = [
  {
    question:
      "À qui s’adresse TAP en tant que candidat : profils juniors, reconversion ou profils plus expérimentés ?",
    answer:
      "TAP s’adresse à tout candidat qui cherche un emploi au Maroc et veut être évalué de façon plus juste qu’avec un CV seul : jeunes diplômés, personnes en reconversion, profils en recherche d’un premier poste ou d’une nouvelle opportunité. L’objectif est de rendre visibles vos compétences réelles, vos forces et votre potentiel, même lorsque votre parcours est atypique ou encore peu connu des recruteurs. En centralisant analyse, score et parcours d’apprentissage, TAP vous aide à présenter un profil structuré et comparable, là où le papier ou le format classique du CV ne suffit pas.",
  },
  {
    question:
      "Concrètement, que fait l’intelligence artificielle avec mon CV une fois que je l’ai envoyé ?",
    answer:
      "L’IA analyse le contenu de votre CV (formations, expériences, compétences déclarées, mots-clés, cohérence du parcours) pour en extraire des signaux utiles : ce qui ressort vraiment de votre profil, ce qui mérite d’être creusé, et où se situent les écarts par rapport aux attentes du marché. Sur cette base, la plateforme calcule un score d’employabilité et des indicateurs par dimension (technique, transversal, adéquation aux métiers ciblés, etc.). Ensuite, TAP vous oriente vers des modules de micro-learning ciblés pour renforcer les points identifiés comme prioritaires, afin que votre profil gagne en clarté et en crédibilité aux yeux des recruteurs.",
  },
  {
    question:
      "L’utilisation de TAP est-elle payante pour les candidats, et quels services sont inclus sans frais ?",
    answer:
      "Pour les candidats, TAP est entièrement gratuit : aucun abonnement ni frais caché pour l’analyse de votre CV, l’accès à votre score d’employabilité et aux recommandations de formation associées. L’idée est de démocratiser l’accès à une évaluation structurée et à un accompagnement orienté emploi, sans barrière financière. Les fonctionnalités payantes éventuelles côté plateforme concernent plutôt les entreprises et les recruteurs qui utilisent TAP pour sourcer et comparer des talents.",
  },
  {
    question:
      "Comment suis-je mis en relation avec les entreprises, et à quel moment mon profil devient-il visible pour les recruteurs ?",
    answer:
      "Après analyse de votre CV et renforcement via le parcours de micro-learning proposé, votre profil peut être intégré à la base de talents validés par TAP, consultable par les recruteurs partenaires. Vous n’êtes pas « mis en relation » au hasard : les entreprises accèdent à des profils structurés, notés et comparables (Talents Cards), ce qui facilite le matching avec leurs besoins réels. Le moment exact où vous apparaissez dépend de la complétude de votre dossier et des critères de validation de la plateforme ; l’objectif est que les recruteurs voient un profil cohérent, à jour et aligné avec les attentes du marché.",
  },
];

const companyFaqs = [
  {
    question:
      "Quels types d’entreprises et de secteurs utilisent TAP pour recruter au Maroc ?",
    answer:
      "TAP s’adresse aux PME, aux grands groupes et à tout service de recrutement qui embauche au Maroc et souhaite gagner du temps sur le tri des CV tout en montant en qualité de présélection. Les secteurs peuvent varier (services, industrie, tech, retail, etc.) : ce qui compte, c’est le besoin de profils mieux qualifiés « sur le papier et en compétences », avec une vision standardisée du potentiel. TAP ne remplace pas votre marque employeur ni vos entretiens, mais aide à repérer plus vite les candidats dont le profil a été analysé et noté de manière homogène.",
  },
  {
    question:
      "Comment le scoring fonctionne-t-il côté entreprise, et à quoi servent les sous-scores pour décider ?",
    answer:
      "Chaque talent disposant d’une Talents Card se voit attribuer un score global, complété par des sous-scores selon des critères explicites : par exemple compétences techniques, soft skills, adéquation avec les métiers ou secteurs visés, et cohérence du parcours. Ces indicateurs permettent de comparer des profils entre eux sur une même échelle, plutôt que de se fier uniquement à des CV aux formats différents. Les équipes RH et les managers peuvent ainsi prioriser les candidats en fonction des priorités du poste (profondeur technique, adaptabilité, etc.) et documenter leurs choix à partir de données structurées, pas seulement d’une impression de lecture.",
  },
  {
    question:
      "Comment les recruteurs accèdent-ils aux Talents Cards, et en quoi diffèrent-elles d’un CV classique ?",
    answer:
      "Les recruteurs se connectent à l’espace entreprise de TAP et parcourent des Talents Cards : des fiches synthétiques où chaque candidat est noté sur une échelle commune (par exemple de 0 à 100), avec des critères décomposés et comparables d’un profil à l’autre. Contrairement à un CV PDF, la Talents Card met l’accent sur ce qui a été analysé et validé par le parcours TAP (parcours, score, axes de développement suivis), ce qui réduit le bruit et accélère la phase de présélection. L’objectif est d’offrir une base de talents « lisible » pour la décision, tout en laissant la suite du processus (entretiens, tests, offre) à votre organisation.",
  },
  {
    question:
      "TAP remplace-t-il notre processus RH et nos outils de recrutement existants ?",
    answer:
      "Non. TAP se positionne en amont : qualification des profils, réduction du volume à traiter manuellement et meilleure lisibilité des compétences grâce à la donnée et à l’IA. Vos processus internes (entretiens, panel, outil ATS, onboarding) restent les vôtres ; TAP apporte une couche d’évaluation homogène et des Talents Cards pour sécuriser les premières décisions et gagner du temps. En résumé, TAP complète votre dispositif en améliorant la qualité du funnel d’entrée, sans se substituer à la relation humaine ni à la gouvernance RH de votre entreprise.",
  },
];

const allFaqs = [...candidateFaqs, ...companyFaqs];

const INITIAL_VISIBLE = 5;

export default function FaqHome() {
  const containerRef = useScrollReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayedFaqs = showAll ? allFaqs : allFaqs.slice(0, INITIAL_VISIBLE);
  const hasMore = allFaqs.length > INITIAL_VISIBLE;

  return (
    <section ref={containerRef} className="relative py-10 sm:py-16 bg-black overflow-hidden">
      <div className="absolute top-[15%] right-[-120px] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
      <div className="absolute bottom-[-120px] left-[-150px] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />

      <div className="relative z-10 w-full">
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

        <div className="reveal-stagger w-full flex flex-col gap-3.5 sm:gap-4">
          {displayedFaqs.map((item, index) => {
            const isOpen = index === openIndex;
            return (
              <div
                key={item.question}
                className="reveal-item mx-1 sm:mx-2 flex overflow-hidden rounded-xl bg-[#0C0C0C] shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
              >
                <div className="w-1 shrink-0 bg-[#CA1B28]" aria-hidden />
                <div className="min-w-0 flex-1 flex flex-col">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className={[
                      "group w-full flex items-center justify-between gap-4 text-left py-4 pl-4 pr-4 sm:pl-5 sm:pr-5 transition-colors duration-300",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CA1B28]/50 focus-visible:ring-inset rounded-none",
                      "hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <p className="text-[13px] sm:text-[15px] font-medium leading-[1.55] text-white/85">
                      {item.question}
                    </p>
                    <span className="shrink-0 flex h-8 w-8 items-center justify-center text-[#CA1B28] transition-transform duration-300">
                      {isOpen ? (
                        <Minus size={20} strokeWidth={2} className="text-[#CA1B28]" aria-hidden />
                      ) : (
                        <Plus size={20} strokeWidth={2} className="text-[#CA1B28]" aria-hidden />
                      )}
                    </span>
                  </button>

                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                      isOpen ? "max-h-[min(52rem,85vh)] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="bg-[#0C0C0C] px-4 sm:px-5 py-4 sm:py-5">
                      <p className="text-[12px] sm:text-[13px] leading-[1.75] font-light text-white/60">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="reveal flex justify-center mt-8 sm:mt-10">
            <button
              type="button"
              onClick={() => {
                setShowAll((v) => !v);
                setOpenIndex(null);
              }}
              className="btn-primary btn-sm"
            >
              {showAll ? "Voir moins" : "Voir plus"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
