"use client";

import { useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { placeholderImage } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

/**
 * Camera or gallery capture. In this phase nothing is uploaded: each chosen
 * photo is recorded as a small generated placeholder labelled with its file
 * name, so the UI behaves like the real thing without storing image data.
 */
export function PhotoPicker({
  photos,
  onChange,
  max = 4,
  label = "photo",
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  label?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const full = photos.length >= max;

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map((file) => placeholderImage(file.name || `New ${label}`));
    onChange([...photos, ...added]);
  }

  return (
    <div className="space-y-2.5">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {photos.length ? <PhotoGrid photos={photos} onRemove={(i) => onChange(photos.filter((_, n) => n !== i))} /> : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={full}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera /> Camera
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={full}
          onClick={() => galleryRef.current?.click()}
        >
          <ImagePlus /> Gallery
        </Button>
        <span className="ml-auto self-center text-xs text-muted">
          {photos.length}/{max}
        </span>
      </div>
    </div>
  );
}

/** Thumbnails; pass `onRemove` to make them removable. */
export function PhotoGrid({
  photos,
  onRemove,
  className,
}: {
  photos: string[];
  onRemove?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {photos.map((src, index) => (
        <div
          key={`${index}-${src.length}`}
          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-canvas"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URIs, nothing to optimise */}
          <img src={src} alt={`Photo ${index + 1}`} className="size-full object-cover" />
          {onRemove ? (
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => onRemove(index)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
