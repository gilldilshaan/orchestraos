"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface StaggerChildrenProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerChildren({ children, staggerDelay = 0.05, className }: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function FadeInView({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 1.2,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(performance.now());

  if (typeof window !== "undefined" && ref.current) {
    const startVal = valueRef.current;
    const elapsed = performance.now() - startVal;
    const progress = Math.min(elapsed / (duration * 1000), 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    ref.current.textContent = prefix + current.toFixed(decimals) + suffix;
    if (progress < 1) {
      requestAnimationFrame(() => {});
    }
  }

  return <span ref={ref} className={className}>{prefix}{from.toFixed(decimals)}{suffix}</span>;
}

interface PulseRingProps {
  active?: boolean;
  color?: string;
  size?: number;
}

export function PulseRing({ active = true, color = "hsl(var(--primary))", size = 12 }: PulseRingProps) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {active && (
        <span
          className="absolute inset-0 animate-pulse-ring rounded-full"
          style={{
            backgroundColor: color,
            opacity: 0.3,
          }}
        />
      )}
      <span
        className="relative inline-block rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: active ? color : "hsl(var(--muted-foreground) / 0.3)",
        }}
      />
    </span>
  );
}
