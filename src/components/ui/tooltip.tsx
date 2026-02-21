"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, side = "top", delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const positionClass = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          className={`absolute ${positionClass} z-50 pointer-events-none animate-fade-in`}
          role="tooltip"
        >
          <div className="whitespace-nowrap rounded-md bg-bg-card border border-white/[0.12] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
