"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type Card = {
  id: number;
  content: React.ReactElement | React.ReactNode | string;
  className: string;
  thumbnail: string;
  videoSrc?: string;
  size?: "small" | "medium" | "large";
  title?: string;
};

export const LayoutGrid = ({ cards }: { cards: Card[] }) => {
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Start buffering all card videos when the grid section scrolls into view
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRefs.current.forEach((video) => {
            if (video.preload !== "auto") {
              video.preload = "auto";
              video.load();
            }
          });
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  // Play/pause video when card is flipped
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === flippedId) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [flippedId]);

  const handleFlip = (cardId: number) => {
    setFlippedId(flippedId === cardId ? null : cardId);
  };

  const getSizeClasses = (card: Card, index: number) => {
    const size =
      card.size ||
      (index % 3 === 0 ? "large" : index % 3 === 1 ? "medium" : "small");

    switch (size) {
      case "small":
        return "col-span-1 row-span-1 h-40 sm:h-48 md:h-56 lg:h-64";
      case "medium":
        return "col-span-1 row-span-1 h-44 sm:h-52 md:h-60 lg:h-72";
      case "large":
        return "col-span-1 row-span-1 h-48 sm:h-64 md:h-72 lg:h-80";
      default:
        return "col-span-1 row-span-1 h-40 sm:h-48 md:h-64";
    }
  };

  return (
    <div
      ref={gridRef}
      className="w-full h-full px-2 sm:px-4 md:px-6 py-2 sm:py-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 max-w-7xl mx-auto gap-3 sm:gap-4 md:gap-5 lg:gap-6 relative"
    >
      {cards.map((card, i) => {
        const sizeClasses = getSizeClasses(card, i);
        const isFlipped = flippedId === card.id;

        return (
          <div
            key={i}
            className={cn(
              sizeClasses,
              "transform transition-all duration-300",
              card.id === 4 ? "self-start" : "",
              card.id === 2 ? "self-end" : ""
            )}
          >
            {/* overflow-hidden + rounded clip applies to the video underneath both faces */}
            <div className="relative w-full h-full rounded-xl overflow-hidden">
              {/* Video always in DOM — buffers while front face is visible */}
              {card.videoSrc && (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(card.id, el);
                    else videoRefs.current.delete(card.id);
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={card.videoSrc}
                  preload="none"
                  loop
                  muted
                  playsInline
                />
              )}

              <AnimatePresence initial={false}>
                {/* Front face — covers the video */}
                {!isFlipped && (
                  <motion.div
                    key={`front-${card.id}`}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 180, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => handleFlip(card.id)}
                    onHoverStart={() => setHoveredId(card.id)}
                    onHoverEnd={() => setHoveredId(null)}
                    whileHover={{
                      scale: 1.03,
                      boxShadow:
                        "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                    }}
                    className="absolute inset-0 w-full h-full bg-white rounded-xl overflow-hidden cursor-pointer"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <img
                      src={card.thumbnail}
                      alt={card.title || "Card image"}
                      className={`object-cover absolute inset-0 h-full w-full ${
                        card.id === 1
                          ? "object-top"
                          : card.id === 4
                            ? "object-bottom"
                            : "object-center"
                      }`}
                    />

                    {card.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <h3 className="text-white font-semibold text-lg">
                          {card.title}
                        </h3>
                      </div>
                    )}

                    <div className="absolute top-0 right-0 mr-2 mt-2 sm:mr-3 sm:mt-3 z-10">
                      <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/40">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          Tap to view
                        </span>
                      </div>
                    </div>

                    {(hoveredId === card.id || isMobile) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/20"
                      />
                    )}
                  </motion.div>
                )}

                {/* Back face — transparent so the video underneath shows through */}
                {isFlipped && (
                  <motion.div
                    key={`back-${card.id}`}
                    initial={{ rotateY: -180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -180, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => handleFlip(card.id)}
                    className="absolute inset-0 w-full h-full rounded-xl overflow-hidden cursor-pointer shadow-xl"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {/* Dark overlay for text readability over the video */}
                    <div className="absolute inset-0 bg-black/50 z-[1]" />

                    <div className="absolute top-0 right-0 mr-2 mt-2 sm:mr-3 sm:mt-3 z-[3]">
                      <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/40 inline-block">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          Tap to flip
                        </span>
                      </div>
                    </div>

                    <div className="relative z-[2] text-white h-full">
                      {card.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};
