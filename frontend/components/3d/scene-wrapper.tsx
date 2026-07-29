"use client";

import dynamic from "next/dynamic";

export const AiCoreScene = dynamic(() => import("./ai-core"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export const MissionControlBackground = dynamic(() => import("./mission-control-background"), {
  ssr: false,
  loading: () => null,
});

export const OrganizationUniverse = dynamic(() => import("./organization-universe"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-xl bg-muted/10" />,
});

export const ExecutionGalaxy = dynamic(() => import("./execution-galaxy"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-xl bg-muted/10" />,
});

export const DecisionGeneration = dynamic(() => import("./decision-generation"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export const DataPacketStream = dynamic(() => import("./data-packet").then((m) => ({ default: m.DataPacketStream })), {
  ssr: false,
  loading: () => null,
});
