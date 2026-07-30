"use client";

import { motion } from "motion/react";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generated strategic reports and analyses
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card px-8 py-14 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 text-muted-foreground/60">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/80">No reports available yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Reports are assembled from execution artifacts (planner, organization, decisions, risks) once the Artifact Store is implemented.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
