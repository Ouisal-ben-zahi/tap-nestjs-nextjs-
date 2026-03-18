import Hero from "@/components/Hero";
import StatsProbleme from "@/components/StatsProbleme";
import PresentationTap from "@/components/PresentationTap";
import PourQuiRecruteursTalents from "@/components/PourQuiRecruteursTalents";
import CommentCaMarche from "@/components/CommentCaMarche";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[url('/images/bgaccueil.webp')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      <div className="relative z-10">
        <Hero />
        <StatsProbleme />
        <PresentationTap />
        <PourQuiRecruteursTalents />
        <CommentCaMarche />
      </div>
    </div>
  );
}
