"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useRef } from "react";

type TypewriterTextProps = {
  text: string;
  isInView: boolean;
  className?: string;
};

export default function TypewriterText({
  text,
  isInView,
  className = "",
}: TypewriterTextProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayText, setDisplayText] = useState("");
  const hasAnimated = useRef(false);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationControls = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      setDisplayText(text.slice(0, latest));
    });

    return () => unsubscribe();
  }, [rounded, text]);

  const typeOutText = () => {
    // Type out the text
    count.set(0);
    const controls = animate(count, text.length, {
      type: "tween",
      duration: 1.5,
      ease: "easeInOut",
      delay: 0.3,
      onComplete: () => {
        // After typing out, pause for 2 seconds before erasing
        if (animationTimeout.current) {
          clearTimeout(animationTimeout.current);
        }

        animationTimeout.current = setTimeout(() => {
          eraseText();
        }, 2000);
      },
    });

    animationControls.current = controls;
    return controls;
  };

  const eraseText = () => {
    // Start from full text and erase it
    count.set(text.length);
    const controls = animate(count, 0, {
      type: "tween",
      duration: 1,
      ease: "easeIn",
      onComplete: () => {
        // After erasing, wait a moment before typing again
        if (animationTimeout.current) {
          clearTimeout(animationTimeout.current);
        }

        animationTimeout.current = setTimeout(() => {
          typeOutText();
        }, 500);
      },
    });

    animationControls.current = controls;
    return controls;
  };

  useEffect(() => {
    if (isInView) {
      // Start animation when in view
      typeOutText();
      hasAnimated.current = true;
    } else if (hasAnimated.current) {
      // Reset when leaving view
      if (animationControls.current) {
        animationControls.current.stop();
      }
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
      count.set(0);
    }

    return () => {
      if (animationControls.current) {
        animationControls.current.stop();
      }
      if (animationTimeout.current) {
        clearTimeout(animationTimeout.current);
      }
    };
  }, [isInView, text]);

  return (
    <span className={className}>
      {/* Text first, then cursor */}
      <span style={{ color: "inherit", opacity: 1 }}>{displayText}</span>
      {/* Cursor after text */}
      <motion.span
        className="inline-block h-[1.2em] w-[3px] bg-green-500 ml-[3px] align-middle"
        animate={{
          opacity: [0, 0, 1, 1],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatDelay: 0,
          ease: "linear",
          times: [0, 0.5, 0.5, 1],
        }}
      />
    </span>
  );
}
