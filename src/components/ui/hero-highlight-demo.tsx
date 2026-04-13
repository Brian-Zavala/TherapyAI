"use client";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "./hero-highlight";

export default function HeroHighlightDemo() {
  return (
    <HeroHighlight containerClassName="h-auto min-h-[12rem] md:min-h-[16rem] py-6">
      <motion.h1
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: [20, -5, 0],
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-stone-50 max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto px-4"
      >
        Discover AI-powered therapy that helps you build{" "}
        <Highlight className="text-white">
          healthier, more fulfilling relationships
        </Highlight>{" "}
        with those who matter most.
      </motion.h1>
    </HeroHighlight>
  );
}
