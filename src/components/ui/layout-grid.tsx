"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
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
  const [selected, setSelected] = useState<Card | null>(null);
  const [lastSelected, setLastSelected] = useState<Card | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const handleClick = (card: Card) => {
    setLastSelected(selected);
    setSelected(card);
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  // Function to determine size classes based on card size
  const getSizeClasses = (card: Card, index: number) => {
    // Default to medium if not specified, or use staggered sizes based on index
    const size = card.size || (index % 3 === 0 ? "large" : index % 3 === 1 ? "medium" : "small");
    
    switch (size) {
      case "small":
        return "col-span-1 row-span-1 h-48 md:h-64";
      case "medium":
        return "col-span-1 md:col-span-2 row-span-1 h-52 md:h-80";
      case "large":
        return "col-span-1 md:col-span-2 row-span-2 h-64 md:h-96";
      default:
        return "col-span-1 row-span-1 h-48 md:h-64";
    }
  };

  return (
    <div className="w-full h-full px-4 py-8 md:p-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 max-w-7xl mx-auto gap-4 relative">
      {cards.map((card, i) => {
        const sizeClasses = getSizeClasses(card, i);
        return (
          <div key={i} className={cn(sizeClasses, "transform transition-all duration-300 hover:translate-y-[-5px]")}>
            <motion.div
              onClick={() => handleClick(card)}
              onHoverStart={() => setHoveredId(card.id)}
              onHoverEnd={() => setHoveredId(null)}
              whileHover={{ 
                scale: 1.03, 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)" 
              }}
              className={cn(
                "relative overflow-hidden cursor-pointer h-full",
                selected?.id === card.id
                  ? "rounded-lg absolute inset-0 h-3/4 w-full md:w-3/4 m-auto z-50 flex justify-center items-center flex-wrap flex-col"
                  : lastSelected?.id === card.id
                  ? "z-40 bg-white rounded-xl h-full w-full"
                  : "bg-white rounded-xl h-full w-full"
              )}
              layoutId={`card-${card.id}`}
            >
              {selected?.id === card.id && <SelectedCard selected={selected} />}
              <ImageComponent card={card} />
              
              {/* Title for the card */}
              {card.title && !selected && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h3 className="text-white font-semibold text-lg">{card.title}</h3>
                </div>
              )}
              
              {/* Click indicator overlay */}
              {hoveredId === card.id && !selected && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/30 flex items-center justify-center"
                >
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40">
                    <span className="text-white font-medium">Click to expand</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        );
      })}
      <motion.div
        onClick={handleOutsideClick}
        className={cn(
          "absolute h-full w-full left-0 top-0 bg-black opacity-0 z-10",
          selected?.id ? "pointer-events-auto" : "pointer-events-none"
        )}
        animate={{ opacity: selected?.id ? 0.3 : 0 }}
      />
    </div>
  );
};
 
const ImageComponent = ({ card }: { card: Card }) => {
  return (
    <motion.img
      layoutId={`image-${card.id}-image`}
      src={card.thumbnail}
      height="500"
      width="500"
      className={cn(
        "object-cover object-center absolute inset-0 h-full w-full transition duration-200"
      )}
      alt="thumbnail"
    />
  );
};
 
const SelectedCard = ({ selected }: { selected: Card | null }) => {
  return (
    <div className="bg-transparent h-full w-full flex flex-col justify-end rounded-lg shadow-2xl relative z-[60]">
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 0.6,
        }}
        className="absolute inset-0 h-full w-full bg-black opacity-60 z-10"
      />
      <motion.div
        layoutId={`content-${selected?.id}`}
        initial={{
          opacity: 0,
          y: 100,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: 100,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="relative px-8 pb-4 z-[70]"
      >
        {selected?.content}
      </motion.div>
    </div>
  );
};