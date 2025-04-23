"use client";

import { useEffect, useState } from "react";

export const RadialGradientBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const mouseXpercentage = Math.round((clientX / windowWidth) * 100);
      const mouseYpercentage = Math.round((clientY / windowHeight) * 100);

      setMousePosition({ x: mouseXpercentage, y: mouseYpercentage });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 w-full h-full -z-50"
      style={{
        backgroundColor: "#DCD9D4",
        backgroundImage: `
          linear-gradient(to bottom, rgba(255,255,255,0.50) 0%, rgba(0,0,0,0.50) 100%), 
          radial-gradient(at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.50) 50%),
          repeating-radial-gradient(
            circle at center, 
            rgba(255,255,255,0.25) 85px,
            rgba(255,255,255,0.20) 0px,
            rgba(0,0,0,0.30) 0px,
            rgba(0,0,0,0.27) 90px
          )
        `,
        backgroundBlendMode: "soft-light, screen, multiply",
        boxShadow: "inset 0 0 100px rgba(0,0,0,0.3)",
        pointerEvents: "none",
      }}
    />
  );
};
