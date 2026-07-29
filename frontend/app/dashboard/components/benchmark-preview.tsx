"use client";

import { motion } from "motion/react";
import Link from "next/link";

const baselines = [
  {
    name: "Single Agent",
    runtime: { value: 4.2 },
    confidence: { value: 0.72 },
    retries: 1.2,
    parallelism: 1,
    health: { value: 0.72 },
  },
  {
    name: "Fixed Team",
    runtime: { value: 6.8 },
    confidence: { value: 0.81 },
    retries: 0.6,
    parallelism: 1,
    health: { value: 0.81 },
  },
  {
    name: "OrchestraOS",
    runtime: { value: 3.1 },
    confidence: { value: 0.89 },
    retries: 0.3,
    parallelism: 8,
    health: { value: 0.91 },
  },
];

const metrics = ["runtime", "confidence", "retries", "parallelism", "health"] as const;

function toNum(v: unknown): number {
  return v && typeof v === "object" && "value" in v ? (v as { value: number }).value : Number(v);
}

export function BenchmarkPreview() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border/80"
    >
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Benchmark Comparison</h2>
          <Link
            href="/benchmarks"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="py-2 pr-4 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Metric
                </th>
                {baselines.map((b) => (
                  <th
                    key={b.name}
                    className={`px-3 py-2 text-right text-[10px] font-medium uppercase tracking-[0.08em] ${
                      b.name === "OrchestraOS" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric} className="border-b border-border/20 last:border-0">
                  <td className="py-2.5 pr-4 font-medium capitalize text-foreground/80">
                    {metric}
                  </td>
                  {baselines.map((b) => {
                    const val = toNum(b[metric as keyof typeof b]);
                    const best = Math[metric === "retries" ? "min" : "max"](...baselines.map((x) => toNum(x[metric as keyof typeof x])));
                    return (
                      <td
                        key={b.name}
                        className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                          b.name === "OrchestraOS" ? "text-primary" : "text-muted-foreground"
                        } ${val === best ? "font-semibold" : ""}`}
                      >
                        {metric === "runtime" && `${val.toFixed(1)}s`}
                        {metric === "confidence" && `${(val * 100).toFixed(0)}%`}
                        {metric === "retries" && val.toFixed(1)}
                        {metric === "parallelism" && `${val}×`}
                        {metric === "health" && `${(val * 100).toFixed(0)}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
