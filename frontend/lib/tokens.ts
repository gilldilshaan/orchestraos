/** OrchestraOS design tokens (spec §3), mirrored from styles/tokens.css for use in JS (charts, canvas, inline styles). */
export const colors = {
  bgBase: "#05070B",
  bgSurface1: "#0A0D14",
  bgSurface2: "#10141D",
  glassFill: "rgba(16,20,29,0.55)",
  glassBorder: "rgba(255,255,255,0.08)",
  hairline: "rgba(255,255,255,0.06)",

  textPrimary: "#EDEFF3",
  textSecondary: "#97A1B0",
  textMuted: "#5C6577",

  accentBlue: "#3D6BFF",
  accentIndigo: "#4B3FE0",
  accentCyan: "#33C9D6",
  accentViolet: "#8D7BF0",

  positive: "#3FBF83",
  warning: "#E6A83C",
  critical: "#E5555F",
} as const;

/** Risk/status severity → color, for consistent chart/badge coding. */
export const severityColor = {
  low: colors.positive,
  medium: colors.warning,
  high: colors.critical,
  critical: colors.critical,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const chartPalette = [colors.accentBlue, colors.accentCyan, colors.accentViolet, colors.accentIndigo] as const;
