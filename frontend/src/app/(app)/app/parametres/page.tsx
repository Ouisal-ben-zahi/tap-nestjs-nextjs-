"use client";

import { useState } from "react";
import { LogOut, Lock, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ParametresPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSaving(true);
    try {
      const { default: api } = await import("@/lib/api");
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSuccess("Mot de passe mis à jour avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message) ? err.response.data.message[0] : null) ||
        "Impossible de mettre à jour le mot de passe.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-8">
      {/* Header */}
      <div className="relative mb-2 pb-6 border-b border-white/[0.04]">
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
          <Settings size={13} className="text-tap-red" />
          <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
            Paramètres du compte
          </span>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-bold text-white tracking-[-0.04em] font-heading">
          Mon compte
        </h1>
        <p className="text-white/45 text-[14px] mt-2 font-light max-w-xl">
          Gérez la sécurité de votre compte TAP et votre mot de passe.
        </p>
      </div>

      {/* Infos utilisateur */}
      <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] text-white/40 mb-1">Connecté en tant que</p>
          <p className="text-[14px] text-white font-medium truncate max-w-xs">
            {user?.email}
          </p>
          <p className="text-[12px] text-white/35 mt-1 capitalize">
            Rôle : {user?.role === "recruteur" ? "Recruteur" : "Candidat"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-red-200 hover:bg-red-500/10 border border-white/[0.06] transition-colors"
        >
          <LogOut size={14} />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* Bloc changement de mot de passe */}
      <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-tap-red/10 flex items-center justify-center border border-tap-red/30">
            <Lock size={16} className="text-tap-red" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Changer mon mot de passe</h2>
            <p className="text-[12px] text-white/40">
              Utilisez un mot de passe unique, avec au moins 8 caractères.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3 mt-3">
          <div>
            <label className="block text-[11px] text-white/50 mb-1.5" htmlFor="currentPassword">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              className="w-full rounded-lg bg-black/40 border border-white/[0.12] px-3 py-2 text-[13px] text-white outline-none focus:border-tap-red transition-colors"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/50 mb-1.5" htmlFor="newPassword">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full rounded-lg bg-black/40 border border-white/[0.12] px-3 py-2 text-[13px] text-white outline-none focus:border-tap-red transition-colors"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/50 mb-1.5" htmlFor="confirmPassword">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full rounded-lg bg-black/40 border border-white/[0.12] px-3 py-2 text-[13px] text-white outline-none focus:border-tap-red transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-tap-red text-white hover:bg-tap-red-hover disabled:opacity-60 transition-colors"
            >
              {saving ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

