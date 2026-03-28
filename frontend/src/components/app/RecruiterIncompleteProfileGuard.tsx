"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecruiterCompanyProfile } from "@/hooks/use-recruteur";
import { isRecruiterCompanyProfileComplete } from "@/lib/recruiter-profile";

/** Routes accessibles sans ligne dans `recruteurs` (même logique que la sidebar : seul Paramètres + formulaire). */
const ALLOWED_PREFIXES = ["/app/parametres", "/app/onboarding-recruteur"] as const;

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Recruteur sans fiche entreprise : redirection vers l’onboarding si l’URL n’est pas Paramètres
 * (évite d’accéder à /app/offres etc. par lien direct).
 */
export default function RecruiterIncompleteProfileGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const profileQuery = useRecruiterCompanyProfile(isRecruteur);

  useEffect(() => {
    if (!isRecruteur || !isHydrated) return;
    if (profileQuery.isLoading || profileQuery.isFetching) return;
    if (
      profileQuery.isSuccess &&
      isRecruiterCompanyProfileComplete(profileQuery.data)
    ) {
      return;
    }
    if (isAllowedPath(pathname)) return;
    router.replace("/app/onboarding-recruteur");
  }, [
    isRecruteur,
    isHydrated,
    profileQuery.isLoading,
    profileQuery.isFetching,
    profileQuery.isSuccess,
    profileQuery.data,
    pathname,
    router,
  ]);

  return null;
}
