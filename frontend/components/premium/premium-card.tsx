"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { useState, useRef, type ReactNode } from "react";

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: "lift" | "glow" | "both" | "none";
  glowColor?: string;
  onClick?: () => void;
  variant?: "default" | "glass" | "bordered" | "elevated";
}

export function PremiumCard({
  children,
  className,
  hoverEffect = "both",
  glowColor = "hsl(var(--primary))",
  onClick,
  variant = "default",
}: PremiumCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const variantStyles = {
    default: "border border-border/50 bg-card",
    glass: "border border-border/30 bg-card/50 backdrop-blur-xl",
    bordered: "border-2 border-border/40 bg-card",
    elevated: "border border-border/40 bg-card shadow-[0_4px_24px_rgba(0,0,0,0.15)]",
  };

  const glow = hoverEffect === "glow" || hoverEffect === "both";
  const lift = hoverEffect === "lift" || hoverEffect === "both";

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden transition-colors duration-300",
        variantStyles[variant],
        onClick && "cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0.5);
        mouseY.set(0.5);
      }}
      onClick={onClick}
      animate={{
        y: lift && isHovered ? -2 : 0,
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {glow && (
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${mouseX.get() * 100}% ${mouseY.get() * 100}%, ${glowColor}10, transparent 40%)`,
            }}
          />
        </motion.div>
      )}
      {/* Top edge glow line */}
      {isHovered && (
        <motion.div
          className="pointer-events-none absolute left-0 top-0 h-px w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${glowColor}40 50%, transparent 100%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

interface PremiumMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
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
    <PremiumCard
      variant="glass"
      className={cn("p-5", className)}
      glowColor={color}
    >
      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight" style={{ color }}>
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && "↑"}
                {trend === "down" && "↓"}
                {trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground/60">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}12` }}
          >
            <div className="text-sm" style={{ color }}>
              {icon}
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-3 h-px w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}30, transparent)`,
        }}
      />
    </PremiumCard>
  );
}

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "premium";
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
    premium:
      "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15",
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
      <span className="relative flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
}
