"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT = 180_000; // 3 minutes

export function Screensaver() {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const resetTimer = useCallback(() => {
    if (active) setActive(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(true), IDLE_TIMEOUT);
  }, [active]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    for (const ev of events) window.addEventListener(ev, resetTimer);
    resetTimer();
    return () => {
      for (const ev of events) window.removeEventListener(ev, resetTimer);
      clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Star {
      x: number;
      y: number;
      z: number;
      pz: number;
    }

    const stars: Star[] = [];
    for (let i = 0; i < 400; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
        pz: 0,
      });
    }

    let textOpacity = 0;
    let textFading = true;

    const animate = () => {
      ctx.fillStyle = "rgba(15,15,26,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const star of stars) {
        star.pz = star.z;
        star.z -= 2;

        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * canvas.width * 2;
          star.y = (Math.random() - 0.5) * canvas.height * 2;
          star.z = canvas.width;
          star.pz = star.z;
        }

        const sx = (star.x / star.z) * cx + cx;
        const sy = (star.y / star.z) * cy + cy;
        const px = (star.x / star.pz) * cx + cx;
        const py = (star.y / star.pz) * cy + cy;

        const brightness = 1 - star.z / canvas.width;
        ctx.strokeStyle = `rgba(0,212,255,${brightness * 0.7})`;
        ctx.lineWidth = brightness * 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      // Title text
      textOpacity += textFading ? -0.003 : 0.003;
      if (textOpacity <= 0.2) textFading = false;
      if (textOpacity >= 0.8) textFading = true;

      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(0,212,255,${textOpacity * 0.6})`;
      ctx.font = "bold 48px 'Inter', system-ui, sans-serif";
      ctx.fillText("THE MOLE WORLD", cx, cy - 20);
      ctx.fillStyle = `rgba(148,163,184,${textOpacity * 0.4})`;
      ctx.font = "16px 'Inter', system-ui, sans-serif";
      ctx.fillText("Production Dashboard", cx, cy + 20);
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = `rgba(148,163,184,${textOpacity * 0.2})`;
      ctx.fillText("Move mouse or press any key to wake up", cx, cy + 60);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 cursor-none"
      style={{ zIndex: 9999, background: "#0f0f1a" }}
      onClick={resetTimer}
    />
  );
}
