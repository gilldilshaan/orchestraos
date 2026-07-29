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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{
          duration: 0.25,
          ease: [0.32, 0.72, 0, 1],
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
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.32, 0.72, 0, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, duration = 1.2, decimals = 1, suffix = "", className }: CountUpProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
      >
        <AnimatedValue value={value} duration={duration} decimals={decimals} suffix={suffix} />
      </motion.span>
    </motion.span>
  );
}

function AnimatedValue({ value, duration, decimals, suffix }: { value: number; duration: number; decimals: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  const start = useRef(performance.now());

  // Use requestAnimationFrame for smooth animation
  if (typeof window !== "undefined") {
    cancelAnimationFrame(rafRef.current!);
    start.current = performance.now();
    valueRef.current = 0;

    const animate = (now: number) => {
      const elapsed = now - start.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = value * eased;
      valueRef.current = current;
      if (ref.current) {
        ref.current.textContent = current.toFixed(decimals) + suffix;
      }
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }

  return <span ref={ref}>{(0).toFixed(decimals)}{suffix}</span>;
}

interface SlideInPanelProps {
  children: React.ReactNode;
  isOpen?: boolean;
  from?: "left" | "right";
  className?: string;
}

export function SlideInPanel({ children, isOpen = true, from = "right", className }: SlideInPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={className}
          initial={{ opacity: 0, x: from === "right" ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: from === "right" ? 20 : -20 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
