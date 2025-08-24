"use client";

import Image from "next/image";
import { useState } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  quality?: number;
  sizes?: string;
  fetchPriority?: "high" | "low" | "auto";
}

export default function OptimizedImage({
  src,
  alt,
  width = 1200, // Default width if not specified
  height = 800, // Default height if not specified
  className = "",
  priority = false,
  objectFit = "cover",
  quality = 75,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  fetchPriority = "auto",
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        fetchPriority={fetchPriority}
        sizes={sizes}
        className={`transition-opacity duration-500 ${
          isLoading ? "opacity-0" : "opacity-100"
        } object-${objectFit}`}
        onLoad={() => setIsLoading(false)}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjAyMDIwIi8+PC9zdmc+"
      />
    </div>
  );
}