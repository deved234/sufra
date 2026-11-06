"use client";

/* eslint-disable @next/next/no-img-element -- a local file being cropped, not a page image */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/dashboard/menu/menu-dialogs";
import { clampPan, coverScale, visibleArea } from "@/lib/photos/prepare";

const MAX_ZOOM = 3;
const KEY_STEP = 12;

// Drag the photo inside a fixed frame and zoom it, with mouse, touch or keyboard.
// Reports the part of the original that was showing.
export default function PhotoCropper({ bitmap, src, ratio, title, onCancel, onDone }) {
  const t = useTranslations("Photos");
  const frameRef = useRef(null);
  const drag = useRef(null);
  const [frame, setFrame] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const natural = { width: bitmap.width, height: bitmap.height };

  useEffect(() => {
    const element = frameRef.current;
    const measure = () => setFrame({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = frame ? coverScale(natural, frame) * zoom : 1;
  // Clamped on the way out, so a resize or zooming out can't leave a gap showing
  const shown = frame ? clampPan(pan, scale, natural, frame) : pan;

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, ...shown };
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    setPan({ x: drag.current.x + event.clientX - drag.current.pointerX, y: drag.current.y + event.clientY - drag.current.pointerY });
  };
  const endDrag = () => {
    drag.current = null;
    setPan(shown);
  };

  const onKeyDown = (event) => {
    const moves = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] };
    if (moves[event.key]) {
      event.preventDefault();
      setPan({ x: shown.x + moves[event.key][0], y: shown.y + moves[event.key][1] });
    } else if (event.key === "+" || event.key === "=") {
      setZoom((value) => Math.min(MAX_ZOOM, value + 0.1));
    } else if (event.key === "-") {
      setZoom((value) => Math.max(1, value - 0.1));
    }
  };

  return (
    <Modal title={title} onClose={onCancel}>
      {/* The arithmetic is in screen directions, whatever the page's language */}
      <div className="flex flex-col gap-4">
        <div
          ref={frameRef}
          dir="ltr"
          tabIndex={0}
          role="application"
          aria-label={t("cropHelp")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ aspectRatio: `${ratio[0]} / ${ratio[1]}` }}
          className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-md bg-surface-muted active:cursor-grabbing"
        >
          {frame && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: natural.width * scale,
                height: natural.height * scale,
                transform: `translate(calc(-50% + ${shown.x}px), calc(-50% + ${shown.y}px))`,
              }}
            />
          )}
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          {t("zoom")}
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            // The cropper can sit inside the dish form, and Enter here must not submit it
            onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
            className="flex-1 accent-brand"
          />
        </label>
        <p className="text-sm text-muted-foreground">{t("cropHelp")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!frame}
            onClick={() => onDone(visibleArea(shown, scale, natural, frame))}
            className="rounded-pill bg-cta px-6 py-2.5 font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-hover disabled:opacity-70"
          >
            {t("usePhoto")}
          </button>
          <button type="button" onClick={onCancel} className="rounded-pill border border-border-strong px-6 py-2.5 font-semibold hover:bg-surface-muted">
            {t("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
