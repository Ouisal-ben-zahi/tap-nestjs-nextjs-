"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

export type CvPhotoPromptMode = "need_image" | "replace_optional";

type Props = {
  open: boolean;
  onClose: () => void;
  isLight: boolean;
  mode: CvPhotoPromptMode;
  choice: "keep_existing" | "upload_new";
  onChoiceChange: (c: "keep_existing" | "upload_new") => void;
  selectedImageFile: File | null;
  onSelectedImageChange: (file: File | null) => void;
  isUploading: boolean;
  onConfirmKeepExisting: () => void;
  onConfirmWithNewImage: () => void;
};

/**
 * Affiché quand le PDF CV ne contient pas de photo exploitable : importer une image ou garder l’existante.
 * Même flux que la page Analyse CV.
 */
export default function CvUploadPhotoPromptModal({
  open,
  onClose,
  isLight,
  mode,
  choice,
  onChoiceChange,
  selectedImageFile,
  onSelectedImageChange,
  isUploading,
  onConfirmKeepExisting,
  onConfirmWithNewImage,
}: Props) {
  const imgRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!isUploading) onClose();
        }}
        aria-hidden
      />
      <div
        className={`relative w-full max-w-[520px] rounded-2xl border p-6 shadow-2xl ${
          isLight ? "bg-white border-black/10" : "bg-zinc-950 border-white/10"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-photo-modal-title"
      >
        <h3
          id="cv-photo-modal-title"
          className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}
        >
          Photo du candidat
        </h3>
        <p className={`text-[13px] mt-1 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
          Nous n&apos;avons pas trouvé de photo exploitable dans ce CV.
        </p>

        {mode === "replace_optional" && (
          <div className="mt-4 space-y-2">
            <label className={`flex items-center gap-2 text-[13px] ${isLight ? "text-black/80" : "text-white/80"}`}>
              <input
                type="radio"
                name="cv-photo-choice"
                checked={choice === "keep_existing"}
                onChange={() => onChoiceChange("keep_existing")}
              />
              Utiliser mon image existante
            </label>
            <label className={`flex items-center gap-2 text-[13px] ${isLight ? "text-black/80" : "text-white/80"}`}>
              <input
                type="radio"
                name="cv-photo-choice"
                checked={choice === "upload_new"}
                onChange={() => onChoiceChange("upload_new")}
              />
              Importer une nouvelle image
            </label>
          </div>
        )}

        {(mode === "need_image" || choice === "upload_new") && (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              className="btn-secondary btn-sm w-full justify-center gap-2"
              onClick={() => imgRef.current?.click()}
            >
              <Upload size={14} />
              Choisir une image (PNG/JPG)
            </button>
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                onSelectedImageChange(f);
                e.target.value = "";
              }}
            />
            {selectedImageFile && (
              <div className={`text-[12px] ${isLight ? "text-black/60" : "text-white/45"}`}>
                Image sélectionnée:{" "}
                <span className={isLight ? "text-black" : "text-white"}>{selectedImageFile.name}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {mode === "replace_optional" && choice === "keep_existing" && (
            <button
              type="button"
              className="btn-primary btn-sm w-full justify-center"
              onClick={onConfirmKeepExisting}
              disabled={isUploading}
            >
              Suivant
            </button>
          )}

          {(mode === "need_image" || choice === "upload_new") && (
            <button
              type="button"
              className="btn-primary btn-sm w-full justify-center"
              onClick={onConfirmWithNewImage}
              disabled={!selectedImageFile || isUploading}
            >
              {mode === "replace_optional" ? "Remplacer avec cette image" : "Continuer avec cette image"}
            </button>
          )}

          <button
            type="button"
            className="btn-ghost btn-sm w-full justify-center"
            onClick={onClose}
            disabled={isUploading}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
