"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type DropdownOption = { value: string; label: string };
type DropdownGroup = { label?: string; options: DropdownOption[] };

export default function DropdownSelect({
  value,
  onChange,
  placeholder,
  groups,
  disabled = false,
  isLight = false,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  groups: DropdownGroup[];
  disabled?: boolean;
  isLight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = (() => {
    for (const g of groups) {
      const found = g.options.find((o) => o.value === value);
      if (found) return found;
    }
    return null;
  })();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={[
          "input-premium w-full flex items-center justify-between cursor-pointer text-left",
          "bg-black/20 border border-white/[0.08] rounded-xl transition-colors",
          isLight
            ? "bg-white border-black/10 hover:bg-black/5"
            : "bg-black/20 border-white/[0.08] hover:bg-white/[0.06]",
          !disabled ? "" : "opacity-40 cursor-not-allowed hover:bg-transparent",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-[13px] truncate ${isLight ? "text-black/80" : "text-white/80"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""} ${isLight ? "text-black/45" : "text-white/45"}`}
        />
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 top-full mt-2 w-full rounded-2xl shadow-lg backdrop-blur-xl z-50 ${
            isLight
              ? "bg-white border border-black/10"
              : "bg-[#050505]/95 border border-white/[0.08]"
          }`}
        >
          <div className="max-h-[260px] sm:max-h-[330px] overflow-y-auto overflow-x-hidden">
            {groups.map((g, gi) => (
              <div key={`${g.label ?? "group"}-${gi}`}>
                {g.label && (
                  <div
                    className={`px-4 py-2 text-[11px] uppercase tracking-[2px] ${
                      isLight ? "text-black/30" : "text-white/30"
                    }`}
                  >
                    {g.label}
                  </div>
                )}
                {g.options.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={[
                        "w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors",
                        "focus:outline-none focus-visible:outline-none",
                        active
                          ? "text-white bg-red-500/15"
                          : isLight
                            ? "text-black/70 hover:text-black hover:bg-red-500/5"
                            : "text-white/80 hover:text-white hover:bg-red-500/8",
                      ].join(" ")}
                    >
                      <span className="flex-1 truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

