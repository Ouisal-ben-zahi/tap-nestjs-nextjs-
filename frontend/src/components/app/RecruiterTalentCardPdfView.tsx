"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

const PDFJS_VERSION = "4.10.38";
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

function pdfIframeFallbackSrc(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.hash = "page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0";
    return u.toString();
  } catch {
    const base = url.split("#")[0] ?? url;
    return `${base}#page=1&view=Fit&toolbar=0&navpanes=0&scrollbar=0`;
  }
}

type Props = { url: string; title: string };

export default function RecruiterTalentCardPdfView({ url, title }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const rafRef = useRef(0);
  const [iframeFallback, setIframeFallback] = useState(false);

  useEffect(() => {
    if (iframeFallback) return;

    let cancelled = false;

    const cancelRender = () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };

    const teardownDoc = async () => {
      cancelRender();
      if (docRef.current) {
        try {
          await docRef.current.destroy();
        } catch {
          /* ignore */
        }
        docRef.current = null;
      }
    };

    const paint = async () => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas || cancelled) return;

      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (cw < 2 || ch < 2) return;

      cancelRender();

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        if (!docRef.current) {
          const loadingTask = pdfjs.getDocument({ url, withCredentials: false });
          const pdf = await loadingTask.promise;
          if (cancelled) {
            await pdf.destroy().catch(() => {});
            return;
          }
          docRef.current = pdf;
        }

        const pdf = docRef.current!;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        const cssScale = Math.min(cw / base.width, ch / base.height);
        const scale = cssScale * dpr;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const task = page.render({
          canvasContext: ctx,
          viewport,
          background: "rgb(0,0,0)",
        });
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch {
        if (!cancelled) setIframeFallback(true);
      }
    };

    const schedulePaint = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        void paint();
      });
    };

    void (async () => {
      await teardownDoc();
      if (cancelled) return;
      await paint();
    })();

    const wrap = wrapRef.current;
    if (!wrap) return () => {};

    const ro = new ResizeObserver(schedulePaint);
    ro.observe(wrap);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      void teardownDoc();
    };
  }, [url, iframeFallback]);

  if (iframeFallback) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black">
        <iframe
          title={title}
          src={pdfIframeFallbackSrc(url)}
          className="h-full w-full min-h-0 flex-1 border-0 bg-black"
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-black"
      aria-label={title}
    >
      <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" role="img" />
    </div>
  );
}
