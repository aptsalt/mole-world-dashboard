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

    // Read theme colors from CSS variables
    const styles = getComputedStyle(document.documentElement);
    const cyanColor = styles.getPropertyValue("--cyan").trim() || "#7dd3fc";
    const mutedColor = styles.getPropertyValue("--muted").trim() || "#8a95b8";
    const bgColor = styles.getPropertyValue("--bg").trim() || "#1f2435";

    // Parse hex to RGB for canvas rgba() usage
    const hexToRgb = (hex: string) => {
      const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 137, g: 180, b: 250 };
    };
    const cyan = hexToRgb(cyanColor);
    const muted = hexToRgb(mutedColor);
    const bg = hexToRgb(bgColor);

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
      ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},0.15)`;
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
        ctx.strokeStyle = `rgba(${cyan.r},${cyan.g},${cyan.b},${brightness * 0.7})`;
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
      ctx.fillStyle = `rgba(${cyan.r},${cyan.g},${cyan.b},${textOpacity * 0.6})`;
      ctx.font = "bold 48px 'Inter', system-ui, sans-serif";
      ctx.fillText("THE MOLE WORLD", cx, cy - 20);
      ctx.fillStyle = `rgba(${muted.r},${muted.g},${muted.b},${textOpacity * 0.4})`;
      ctx.font = "16px 'Inter', system-ui, sans-serif";
      ctx.fillText("Production Dashboard", cx, cy + 20);
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = `rgba(${muted.r},${muted.g},${muted.b},${textOpacity * 0.2})`;
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
      style={{ zIndex: 9999, background: "var(--bg)" }}
      onClick={resetTimer}
    />
  );
}
