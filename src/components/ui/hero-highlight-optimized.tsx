"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";

export const HeroHighlight = ({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <div
      className={cn(
        "group relative flex w-full items-center justify-center bg-transparent",
        containerClassName
      )}
    >
      <div className={cn("relative z-20", className)}>{children}</div>
    </div>
  );
};

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const [isReady, setIsReady] = useState(false);

  // Preload animation styles
  useEffect(() => {
    let warmupElement: HTMLDivElement | null = null;
    
    try {
      // Warm up CSS animations
      warmupElement = document.createElement('div');
      warmupElement.style.cssText = `
        position: absolute;
        left: -9999px;
        background: linear-gradient(to right, #3b82f6, #ec4899);
        background-size: 0% 100%;
        transition: background-size 0.1s linear;
      `;
      document.body.appendChild(warmupElement);
      
      // Force reflow and trigger animation
      void warmupElement.offsetHeight;
      warmupElement.style.backgroundSize = '100% 100%';
      
      // Remove after warmup
      const timer = setTimeout(() => {
        if (warmupElement && warmupElement.parentNode === document.body) {
          document.body.removeChild(warmupElement);
        }
        setIsReady(true);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (warmupElement && warmupElement.parentNode === document.body) {
          document.body.removeChild(warmupElement);
        }
      };
    } catch (error) {
      console.warn('CSS warmup failed:', error);
      setIsReady(true);
    }
  }, []);

  return (
    <motion.span
      initial={{
        backgroundSize: "0% 100%",
        opacity: isReady ? 1 : 0,
      }}
      animate={{
        backgroundSize: "100% 100%",
        opacity: 1,
      }}
      transition={{
        backgroundSize: {
          duration: 2,
          ease: "linear",
          delay: 0.5,
        },
        opacity: {
          duration: 0.3,
          delay: 0,
        }
      }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
        willChange: "background-size",
      }}
      className={cn(
        `relative inline-block rounded-lg bg-gradient-to-r from-blue-500 to-pink-300 px-1 pb-1 dark:blue-500 dark:via-blue-500/85 dark:to-blue-600/75`,
        className
      )}
    >
      {children}
    </motion.span>
  );
};