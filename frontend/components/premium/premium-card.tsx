"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: "lift" | "glow" | "both" | "none";
  glowColor?: string;
  onClick?: () => void;
}

export function PremiumCard({
  children,
  className,
  hoverEffect = "both",
  glowColor = "hsl(var(--primary))",
  onClick,
}: PremiumCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const glow = hoverEffect === "glow" || hoverEffect === "both";
  const lift = hoverEffect === "lift" || hoverEffect === "both";

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0.5, y: 0.5 });
      }}
      onClick={onClick}
      animate={{
        y: lift && isHovered ? -2 : 0,
        boxShadow: isHovered && glow
          ? `0 0 20px ${glowColor}15, 0 0 40px ${glowColor}08`
          : "0 0 0px transparent",
      }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
    >
      {glow && isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, ${glowColor}08, transparent 40%)`,
            }}
          />
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}

interface PremiumMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: string;
  className?: string;
  delay?: number;
}

export function PremiumMetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = "hsl(var(--primary))",
  className,
  delay = 0,
}: PremiumMetricCardProps) {
  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5",
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at 50% 0%, ${color}08, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ color }}
            >
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && "↑ "}
                {trend === "down" && "↓ "}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <div className="text-sm" style={{ color }}>
              {icon}
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-3 h-0.5 w-full rounded-full opacity-30"
        style={{
          background: `linear-gradient(90deg, ${color}, transparent)`,
        }}
      />
    </motion.div>
  );
}

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function GlowButton({
  children,
  onClick,
  className,
  variant = "primary",
  size = "md",
}: GlowButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-muted/50",
  };

  return (
    <motion.button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0 rounded-lg opacity-0"
        style={{
          background: `radial-gradient(200px circle at 50% 50%, hsl(var(--primary) / 0.2), transparent)`,
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}
