"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  format?: "number" | "percent" | "time" | "decimal";
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  format = "number",
  duration = 1.2,
  className,
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(
    format === "percent" ? "0%" : format === "time" ? "0.0s" : "0"
  );

  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();

    const raf = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;

      switch (format) {
        case "percent":
          setDisplay(`${(current * 100).toFixed(0)}%`);
          break;
        case "time":
          setDisplay(`${current.toFixed(1)}s`);
          break;
        case "decimal":
          setDisplay(current.toFixed(2));
          break;
        default:
          setDisplay(Math.round(current).toLocaleString());
      }

      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, value, format, duration]);

  return (
    <span ref={ref} className={cn("font-mono tabular-nums", className)}>
      {prefix}{display}{suffix}
    </span>
  );
}
