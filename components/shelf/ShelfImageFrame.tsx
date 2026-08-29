
"use client";

import Image from "next/image";
import { useState } from "react";

type ImageOrientation = "portrait" | "landscape" | "square";

export default function ShelfImageFrame({
  src,
  code,
  priority = false,
}: {
  src: string | null;
  code: string;
  priority?: boolean;
}) {
  const [orientation, setOrientation] =
    useState<ImageOrientation>("square");

  if (!src) {
    return (
      <div
        className="
          flex
          h-[420px]
          w-full
          items-center
          justify-center
          bg-white/20
        "
      >
        <div className="text-center">
          <div
            className="
              text-4xl
              font-black
              tracking-tight
              text-slate-300
            "
          >
            {code}
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-400">
            Belum ada foto rak
          </p>
        </div>
      </div>
    );
  }

  const imageWidth =
    orientation === "landscape"
      ? 600
      : orientation === "portrait"
        ? 300
        : 400;

  return (
    <div className="flex w-full items-center justify-center overflow-hidden bg-white/20">
      <Image
        src={src}
        alt={`Foto rak ${code}`}
        width={imageWidth}
        height={600}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 600px"
        className="
          h-auto
          w-auto
          max-w-full
          object-contain
          transition-transform
          duration-500
          ease-out
          group-hover:scale-[1.015]
        "
        onLoad={(e) => {
          const img = e.currentTarget;

          if (img.naturalWidth > img.naturalHeight) {
            setOrientation("landscape");
          } else if (
            img.naturalHeight > img.naturalWidth
          ) {
            setOrientation("portrait");
          } else {
            setOrientation("square");
          }
        }}
      />
    </div>
  );
}