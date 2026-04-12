"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const phrases = [
  "Take a moment to breathe...",
  "You showed up today. That takes courage.",
  "Every step forward matters, no matter how small.",
  "Be gentle with yourself.",
  "Healing is not linear — and that's okay.",
  "What you shared today was brave.",
  "Growth happens one conversation at a time.",
  "You are worthy of peace.",
  "Rest in this stillness for a moment.",
  "Thank you for investing in yourself today.",
];

interface SessionWindDownModalProps {
  isOpen: boolean;
}

export default function SessionWindDownModal({ isOpen }: SessionWindDownModalProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Portal requires DOM — guard SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPhraseIndex(0);
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 3800);
    return () => clearInterval(id);
  }, [isOpen]);

  if (!mounted) return null;

  // Portal to document.body so fixed positioning is always relative to the
  // true viewport — not clipped by any transformed ancestor container.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wind-down-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background:
              "linear-gradient(160deg, #0d0b1e 0%, #110d2e 35%, #0a1628 65%, #0b1020 100%)",
          }}
        >
          {/* Ambient orbs */}
          <motion.div
            style={{
              position: "absolute",
              width: 340,
              height: 340,
              top: "10%",
              left: "15%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              bottom: "12%",
              right: "10%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
              filter: "blur(50px)",
              pointerEvents: "none",
            }}
            animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
          <motion.div
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              top: "55%",
              left: "5%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)",
              filter: "blur(35px)",
              pointerEvents: "none",
            }}
            animate={{ x: [0, 20, -10, 0], y: [0, -25, 10, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 7 }}
          />

          {/* Breathing pulse ring */}
          <div style={{ position: "relative", marginBottom: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  width: 80 + i * 36,
                  height: 80 + i * 36,
                  borderRadius: "50%",
                  border: "1px solid rgba(192,132,252,0.2)",
                }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
              />
            ))}
            <motion.div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle, rgba(167,139,250,0.6) 0%, rgba(139,92,246,0.3) 60%, transparent 100%)",
                boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  stroke="rgba(216,180,254,0.9)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.div>
          </div>

          {/* Quote area */}
          <div style={{ position: "relative", width: "100%", maxWidth: 320, padding: "0 24px", textAlign: "center", minHeight: 96 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
                style={{
                  color: "rgba(255,255,255,0.90)",
                  fontSize: "clamp(1.15rem, 4vw, 1.5rem)",
                  fontWeight: 300,
                  lineHeight: 1.55,
                  letterSpacing: "0.01em",
                  margin: 0,
                }}
              >
                {phrases[phraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Dot progress indicators */}
          <div style={{ display: "flex", gap: 6, marginTop: 32 }}>
            {phrases.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: i === phraseIndex ? 0.7 : 0.15,
                  scale: i === phraseIndex ? 1 : 0.7,
                }}
                transition={{ duration: 0.4 }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: "white" }}
              />
            ))}
          </div>

          {/* Subtle processing label */}
          <motion.p
            style={{
              position: "absolute",
              bottom: 40,
              color: "rgba(255,255,255,0.25)",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            Saving your session&hellip;
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
