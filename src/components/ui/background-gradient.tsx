import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true,
  colorScheme = "default",
  borderWidth = 4,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
  colorScheme?: "default" | "ai" | "traditional";
  borderWidth?: number;
}) => {
  const variants = {
    initial: {
      backgroundPosition: "0 50%",
    },
    animate: {
      backgroundPosition: ["0, 50%", "100% 50%", "0 50%"],
    },
  };

  // Color scheme gradients
  const getGradientClass = () => {
    switch (colorScheme) {
      case "ai":
        // Bright, positive colors for AI-powered therapy
        return "bg-[linear-gradient(90deg,#00ccb1,#7b61ff,#ffc414,#1ca0fb,#00ccb1)]";
      case "traditional":
        // Dark, gloomy colors for traditional therapy
        return "bg-[linear-gradient(90deg,#ff5252,#ad1457,#6a1b9a,#4527a0,#ff5252)]";
      default:
        // Original gradient
        return "bg-[linear-gradient(90deg,#00ccb1,#7b61ff,#ffc414,#1ca0fb,#00ccb1)]";
    }
  };

  return (
    <div className={cn("relative group", containerClassName)}>
      {/* Glow effect - positioned behind the border */}
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "200% 200%" : undefined,
          padding: borderWidth * 2.5, // Larger padding for glow effect
        }}
        className={cn(
          "absolute -inset-0.5 rounded-2xl z-0 opacity-50 group-hover:opacity-75 blur-xl transition duration-500 will-change-transform",
          getGradientClass()
        )}
      />
      
      {/* Animated gradient border */}
      <motion.div
        variants={animate ? variants : undefined}
        initial={animate ? "initial" : undefined}
        animate={animate ? "animate" : undefined}
        transition={
          animate
            ? {
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
              }
            : undefined
        }
        style={{
          backgroundSize: animate ? "200% 200%" : undefined,
          padding: borderWidth, // Border thickness
        }}
        className={cn(
          "absolute inset-0 rounded-2xl z-[1] will-change-transform",
          getGradientClass()
        )}
      >
        {/* Inner container for content with solid background */}
        <div className="absolute inset-0 rounded-xl bg-white dark:bg-gray-900" />
      </motion.div>

      {/* Content container */}
      <div className={cn(`relative z-10 rounded-xl`, className)}>
        {children}
      </div>
    </div>
  );
};