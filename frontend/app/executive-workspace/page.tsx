"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Gavel, Users, Scale, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, Plus, Target, BarChart2, ClipboardList, Lightbulb, Shield, Zap, Settings, ChevronRight, Building2, Search, Filter } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useEnsureWorkspace } from "@/hooks/use-api";

import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { ExecutiveWorkspace, ExecutiveRole } from "@/types";

const ROLE_ICONS: Record<ExecutiveRole, React.ReactNode> = {
  CEO: <Gavel className="h-5 w-5" />,
  Planner: <Target className="h-5 w-5" />,
  Engineering: <Zap className="h-5 w-5" />,
  Finance: <Scale className="h-5 w-5" />,
  Marketing: <MessageSquare className="h-5 w-5" />,
  Legal: <Shield className="h-5 w-5" />,
  Risk: <AlertTriangle className="h-5 w-5" />,
  Operations: <Users className="h-5 w-5" />,
};

const EXECUTIVE_ROLES: ExecutiveRole[] = [
  "CEO", "Planner", "Engineering", "Finance", "Marketing", "Legal", "Risk", "Operations",
];

export default function ExecutiveWorkspaceRootPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | ExecutiveRole>("all");

  const { data: workspacesData, isLoading, refetch } = useQuery({
    queryKey: ["executive-workspace", "all"],
    queryFn: () => apiClient.get<{ workspaces: ExecutiveWorkspace[] }>("/executive-workspace?limit=200"),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const workspaces = workspacesData?.data?.workspaces ?? [];
  const filtered = workspaces.filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (roleFilter !== "all" && w.executive_role !== roleFilter) return false;
    if (searchQuery && !w.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Executive Workspace"
        title="All Workspaces"
        description="Browse all executive workspaces across objectives. Each role gets isolated memory, tasks, and KPIs."
        actions={
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <PremiumCard variant="glass" className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-1">Search</label>
                <Input placeholder="Search workspaces..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="All roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {["CEO", "Planner", "Engineering", "Finance", "Marketing", "Legal", "Risk", "Operations"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4" aria-busy="true">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse bg-muted/50 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">No workspaces found.</p>
                <p className="text-sm mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filtered.map((ws) => (
                  <Link key={ws.id} href={"/executive-workspace/" + ws.objective_id + "/" + ws.executive_role} className="flex items-center justify-between p-5 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary flex-shrink-0">
                        {ROLE_ICONS[ws.executive_role]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{ws.executive_role}</p>
                          <Badge variant="outline" className="text-xs">{ws.executive_role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{ws.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <Badge variant={ws.status === "active" ? "default" : "secondary"} className="gap-1">
                        {ws.status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                        {ws.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono">{ws.objective_id.slice(0, 12)}...</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>

        <aside className="space-y-6">
          <PremiumCard variant="glass" className="p-5">
            <h3 className="mb-4 font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" />Overview</h3>
            <p className="text-muted-foreground mb-4">Browse all executive workspaces across objectives. Each role gets isolated memory, tasks, and KPIs.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">1.</span>Memory partitioned by role</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">2.</span>Personal task & decision tracking</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">3.</span>Role-specific KPIs</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">4.</span>Live SSE updates from board</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">5.</span>Auto-created from board sessions</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-5 border-primary/30">
            <h3 className="mb-3 font-semibold flex items-center gap-2 text-primary"><Zap className="h-5 w-5" />Executive Workspace</h3>
            <p className="text-muted-foreground mb-4">Each executive role gets a personalized workspace with partitioned memory, task tracking, KPIs, and live updates from board sessions.</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">1.</span>Memory partitioned by role</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">2.</span>Personal task & decision tracking</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">3.</span>Role-specific KPIs</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">4.</span>Live SSE updates from board</li>
              <li className="flex gap-2"><span className="flex-shrink-0 text-primary">5.</span>Auto-created from board sessions</li>
            </ul>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}