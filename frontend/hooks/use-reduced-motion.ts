"use client";

import { useSpring, useMotionValue } from "motion/react";
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}

export function useAnimatedValue(target: number, options?: { damping?: number; stiffness?: number }) {
  const prefersReduced = useReducedMotion();
  const motionValue = useMotionValue(target);
  const spring = useSpring(motionValue, {
    damping: options?.damping ?? 20,
    stiffness: options?.stiffness ?? 100,
  });

  useEffect(() => {
    if (prefersReduced) {
      motionValue.set(target);
    } else {
      motionValue.set(target);
    }
  }, [target, prefersReduced, motionValue]);

  return spring;
}

export function useAnimatedColor(
  targetColor: string,
  options?: { damping?: number; stiffness?: number }
) {
  return useAnimatedValue(0, options);
}
