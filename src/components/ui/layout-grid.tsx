"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type Card = {
  id: number;
  content: JSX.Element | React.ReactNode | string;
  className: string;
  thumbnail: string;
  size?: "small" | "medium" | "large";
  title?: string;
};

export const LayoutGrid = ({ cards }: { cards: Card[] }) => {
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile when the component mounts
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleFlip = (cardId: number) => {
    setFlippedId(flippedId === cardId ? null : cardId);
  };

  // Function to determine size classes based on card size
  const getSizeClasses = (card: Card, index: number) => {
    // Default to medium if not specified, or use staggered sizes based on index
    const size =
      card.size ||
      (index % 3 === 0 ? "large" : index % 3 === 1 ? "medium" : "small");

    switch (size) {
      case "small":
        return "col-span-1 row-span-1 h-40 sm:h-48 md:h-64";
      case "medium":
        return "col-span-1 row-span-1 h-44 sm:h-52 md:h-72";
      case "large":
        return "col-span-1 row-span-1 h-48 sm:h-64 md:h-80";
      default:
        return "col-span-1 row-span-1 h-40 sm:h-48 md:h-64";
    }
  };

  return (
    <div className="w-full h-full px-2 sm:px-4 py-2 sm:py-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 max-w-7xl mx-auto gap-3 sm:gap-4 md:gap-6 relative">
      {cards.map((card, i) => {
        const sizeClasses = getSizeClasses(card, i);
        const isFlipped = flippedId === card.id;

        return (
          <div
            key={i}
            className={cn(
              sizeClasses,
              "transform transition-all duration-300",
              card.id === 4 ? "self-start" : ""
            )}
          >
            <div className="relative w-full h-full preserve-3d perspective-1000">
              <AnimatePresence initial={false}>
                {/* Front of card */}
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
                      className="object-cover object-center absolute inset-0 h-full w-full"
                    />

                    {/* Title for the card */}
                    {card.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <h3 className="text-white font-semibold text-lg">
                          {card.title}
                        </h3>
                      </div>
                    )}

                    {/* Hover/Touch indicator overlay - visible on mobile without hover */}
                    {(hoveredId === card.id || isMobile) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/20 flex items-start justify-end"
                      >
                        <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/40 m-2 sm:m-3">
                          <span className="text-white text-xs sm:text-sm font-medium">
                            Tap to view
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Back of card */}
                {isFlipped && (
                  <motion.div
                    key={`back-${card.id}`}
                    initial={{ rotateY: -180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -180, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    onClick={() => handleFlip(card.id)}
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl overflow-hidden cursor-pointer shadow-xl"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {/* "Tap to flip" positioned consistently at the top right */}
                    <div className="absolute top-0 right-0 mr-2 mt-2 sm:mr-3 sm:mt-3 z-10">
                      <div className="bg-white/20 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-white/40 inline-block">
                        <span className="text-white text-xs sm:text-sm font-medium">
                          Tap to flip
                        </span>
                      </div>
                    </div>

                    <div className="text-white h-full text-center">
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
