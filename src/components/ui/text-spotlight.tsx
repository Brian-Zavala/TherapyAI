"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TextSpotlightProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  size?: number;
  strength?: number;
}

export const TextSpotlight = ({
  children,
  className,
  spotlightColor = "rgba(120, 119, 198, 0.1)",
  size = 400,
  strength = 0.6,
}: TextSpotlightProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const containerSize = useRef({ w: 0, h: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const updateContainerSize = (container: HTMLDivElement) => {
    const rect = container.getBoundingClientRect();
    containerSize.current = {
      w: rect.width,
      h: rect.height,
    };
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    
    mousePosition.current = {
      x: x,
      y: y,
    };
  };

  const updateMouse = () => {
    if (isHovered) {
      mouse.current.x += (mousePosition.current.x - mouse.current.x) * 0.1;
      mouse.current.y += (mousePosition.current.y - mouse.current.y) * 0.1;
    } else {
      // When not hovered, have spotlight gently float around the center
      const time = Date.now() * 0.001;
      const container = containerRef.current;
      if (container) {
        updateContainerSize(container);
        const centerX = containerSize.current.w / 2;
        const centerY = containerSize.current.h / 2;
        mouse.current.x = centerX + Math.sin(time * 0.5) * (centerX * 0.5);
        mouse.current.y = centerY + Math.cos(time * 0.7) * (centerY * 0.3);
      }
    }
    
    const container = containerRef.current;
    if (container) {
      container.style.setProperty("--x", `${mouse.current.x}px`);
      container.style.setProperty("--y", `${mouse.current.y}px`);
    }
    
    requestAnimationFrame(updateMouse);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    updateContainerSize(container);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", () => setIsHovered(true));
    container.addEventListener("mouseleave", () => setIsHovered(false));
    
    const animationFrame = requestAnimationFrame(updateMouse);
    
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", () => setIsHovered(true));
      container.removeEventListener("mouseleave", () => setIsHovered(false));
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden cursor-default",
        className
      )}
      style={{
        "--spotlight-color": spotlightColor,
        "--size": `${size}px`,
        "--strength": strength,
      } as React.CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `radial-gradient(var(--size) circle at var(--x) var(--y), var(--spotlight-color), transparent ${size/2}px)`,
        }}
      />
      {children}
    </motion.div>
  );
};