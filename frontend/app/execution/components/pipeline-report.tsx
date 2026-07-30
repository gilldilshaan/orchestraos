"use client";

interface PipelineReportProps {
  objectiveId: string;
}

export function PipelineReport({ objectiveId }: PipelineReportProps) {
  return <div>{objectiveId}</div>;
}
