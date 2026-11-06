"use client";

/* eslint-disable @next/next/no-img-element -- a preview of a file being chosen */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormAlert } from "@/components/form/field";
import PhotoCropper from "@/components/photos/photo-cropper";
import { requestPhotoUpload } from "@/lib/photos/actions";
import { exportBlur, exportPhoto, openPhoto } from "@/lib/photos/prepare";
import { PHOTO_KINDS, photoUrl } from "@/lib/photos/url";

// Sends the file straight to Cloudinary. XMLHttpRequest rather than fetch, because it
// reports progress on an upload and can be cancelled.
function upload({ url, fields }, file, onProgress, register) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    for (const [name, value] of Object.entries(fields)) body.append(name, value);
    body.append("file", file);

    const request = new XMLHttpRequest();
    register(request);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded * 100) / event.total));
    request.onload = () => (request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("photoFailed")));
    request.onerror = () => reject(new Error("photoFailed"));
    request.onabort = () => reject(new Error("cancelled"));
    request.open("POST", url);
    request.send(body);
  });
}

// Choose or drop a photo, crop it, watch it upload, then replace or remove it.
// initial: { id, blur } of the stored photo. fallback: an image to show when there's none.
// onChange gets { id, blur } or null once a photo is uploaded or removed.
// name: when set, the choice also goes along in a hidden field of the surrounding form.
export default function PhotoField({ slug, kind, label, hint, initial = null, fallback = null, name, onChange, onBusyChange }) {
  const t = useTranslations("Photos");
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const previewRef = useRef(null);

  const [photo, setPhoto] = useState(initial);
  const [preview, setPreview] = useState(null);
  const [cropping, setCropping] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const config = PHOTO_KINDS[kind];
  const uploading = progress !== null;

  useEffect(() => onBusyChange?.(uploading), [uploading, onBusyChange]);

  // Local previews and an upload in flight don't outlive the field
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      requestRef.current?.abort();
    },
    [],
  );

  const showPreview = (url) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  async function chooseFile(file) {
    if (!file) return;
    setError(null);
    setRetry(null);
    try {
      const bitmap = await openPhoto(file);
      setCropping({ bitmap, src: URL.createObjectURL(file) });
    } catch (reason) {
      setError(reason.message);
    }
  }

  const closeCropper = () => {
    if (cropping) {
      URL.revokeObjectURL(cropping.src);
      cropping.bitmap.close();
    }
    setCropping(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function send(file, blur) {
    setError(null);
    setRetry(null);
    setProgress(0);
    try {
      const permission = await requestPhotoUpload(slug);
      if (permission.error) throw new Error(permission.error);
      await upload(permission, file, setProgress, (request) => (requestRef.current = request));
      const next = { id: permission.fields.public_id, blur };
      setPhoto(next);
      await onChange?.(next);
    } catch (reason) {
      if (reason.message !== "cancelled") {
        setError(reason.message);
        setRetry(() => () => send(file, blur));
      }
    } finally {
      requestRef.current = null;
      setProgress(null);
    }
  }

  async function finishCrop(area) {
    const { bitmap } = cropping;
    try {
      const [file, blur] = [await exportPhoto(bitmap, area, config), exportBlur(bitmap, area, config)];
      closeCropper();
      showPreview(URL.createObjectURL(file));
      send(file, blur);
    } catch (reason) {
      closeCropper();
      setError(reason.message);
    }
  }

  async function remove() {
    setError(null);
    setRetry(null);
    setPhoto(null);
    showPreview(null);
    await onChange?.(null);
  }

  const shown = preview ?? (photo ? photoUrl(photo.id, config.widths[1] ?? config.widths[0]) : fallback);
  const canRemove = photo && !uploading;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {name && <input type="hidden" name={name} value={photo ? JSON.stringify(photo) : ""} />}
      <FormAlert error={error} />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!uploading) chooseFile(event.dataTransfer.files[0]);
        }}
        style={{ aspectRatio: `${config.ratio[0]} / ${config.ratio[1]}`, maxWidth: kind === "logo" ? "10rem" : "24rem" }}
        className={`relative w-full overflow-hidden rounded-md border-2 border-dashed bg-surface-muted ${dragOver ? "border-brand" : "border-border-strong"}`}
      >
        {shown ? (
          <img src={shown} alt="" className={`size-full object-cover ${uploading ? "opacity-60" : ""}`} />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm text-muted-foreground">{t("dropHere")}</p>
        )}
        {uploading && (
          <div className="absolute inset-x-0 bottom-0 bg-surface/90 p-2">
            <div role="progressbar" aria-label={t("uploading")} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-pill bg-surface-muted">
              <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {uploading ? (
          <button type="button" onClick={() => requestRef.current?.abort()} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
            {t("cancel")}
          </button>
        ) : (
          <label className="cursor-pointer rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold focus-within:outline-2 hover:bg-surface-muted">
            {t(shown ? "replace" : "choose")}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files[0])}
            />
          </label>
        )}
        {retry && !uploading && (
          <button type="button" onClick={retry} className="rounded-pill border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-muted">
            {t("retry")}
          </button>
        )}
        {canRemove && (
          <button type="button" onClick={remove} className="rounded-pill px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft">
            {t("remove")}
          </button>
        )}
      </div>

      {cropping && <PhotoCropper bitmap={cropping.bitmap} src={cropping.src} ratio={config.ratio} title={t("cropTitle")} onCancel={closeCropper} onDone={finishCrop} />}
    </div>
  );
}
