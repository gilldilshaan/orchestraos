"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Gavel, Users, Scale, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw, ChevronRight, Target, BarChart2, ClipboardList, Lightbulb, Shield, Zap } from "lucide-react";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceSSE } from "@/hooks/use-workspace-sse";
import { useWorkspaceQuery, useWorkspaceItemsQuery, useWorkspaceSummaryQuery, useWorkspaceMemoriesQuery, useWorkspaceKpisQuery, useEnsureWorkspace, useCreateWorkspaceItem, useUpdateWorkspaceItem, useUpdateKpis } from "@/hooks/use-api";

import { PageHeader } from "@/components/page-header";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

import type { ExecutiveWorkspace, WorkspaceItem, WorkspaceSummary, WorkspaceItemKind, WorkspaceItemStatus, ExecutiveRole } from "@/types";

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

const ROLE_DESCRIPTIONS: Record<ExecutiveRole, string> = {
  CEO: "Chair the board, weigh every voice, and issue the final decision.",
  Planner: "Own execution sequencing, milestones, and delivery feasibility.",
  Engineering: "Own technical feasibility, build capacity, and delivery risk.",
  Finance: "Own budget adequacy, unit economics, and return on investment.",
  Marketing: "Own market traction, adoption assumptions, and go-to-market spend.",
  Legal: "Own compliance, regulatory exposure, and contractual liability.",
  Risk: "Own risk exposure, uncertainty, and mitigation coverage.",
  Operations: "Own capacity, staffing, and operational readiness.",
};

const KIND_COLORS: Record<WorkspaceItemKind, string> = {
  task: "bg-primary/10 text-primary border-primary/20",
  decision: "bg-blue/10 text-blue border-blue/20",
  note: "bg-muted/50 text-muted-foreground border-muted",
  approval: "bg-amber/10 text-amber border-amber/20",
  risk: "bg-destructive/10 text-destructive border-destructive/20",
  insight: "bg-green/10 text-green border-green/20",
};

const STATUS_COLORS: Record<WorkspaceItemStatus, string> = {
  open: "bg-muted/50 text-muted-foreground border-muted",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-success/10 text-success border-success/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted/50 text-muted-foreground border-muted line-through",
};

const EXECUTIVE_ROLES: ExecutiveRole[] = ["CEO", "Planner", "Engineering", "Finance", "Marketing", "Legal", "Risk", "Operations"];
const KIND_LABELS: Record<WorkspaceItemKind, string> = { task: "Task", decision: "Decision", note: "Note", approval: "Approval", risk: "Risk", insight: "Insight" };
const KIND_ORDER: WorkspaceItemKind[] = ["task", "decision", "risk", "approval", "insight", "note"];

function RoleTab({ role: roleProp, isActive, objectiveId }: { roleProp: ExecutiveRole; isActive: boolean; objectiveId: string }) {
  return (
    <Link
      href={"/executive-workspace/" + objectiveId + "/" + roleProp}
      className="flex-shrink-0 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap " +
        (isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")
    >
      <div className="flex items-center gap-2">
        {ROLE_ICONS[roleProp]}
        {roleProp}
      </div>
    </Link>
  );
}

function SectionTab({ tab, activeTab, onClick }: { tab: string; activeTab: string; onClick: (t: string) => void }) {
  return (
    <button
      onClick={() => onClick(tab)}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
        (activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")
      role="tab"
      aria-selected={activeTab === tab}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  );
}

function ItemKindBadge({ kind, count }: { kind: WorkspaceItemKind; count: number }) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-background/50">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className={KIND_COLORS[kind]}>
          {KIND_LABELS[kind]}
        </Badge>
      </div>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm text-muted-foreground">{summary?.items?.open_by_kind?.[kind] ?? 0} open</div>
    </div>
  );
}

function ItemCard({ item, onStatusChange, onPriorityChange, updating }: {
  item: WorkspaceItem;
  onStatusChange: (item: WorkspaceItem, status: WorkspaceItemStatus) => void;
  onPriorityChange: (item: WorkspaceItem, priority: string) => void;
  updating: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge variant="outline" className={KIND_COLORS[item.kind]}>
          {KIND_LABELS[item.kind]}
        </Badge>
        <div className="min-w-0">
          <p className="font-medium truncate">{item.title}</p>
          {item.content && <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Badge
          variant={
            item.status === "completed" ? "default" :
            item.status === "in_progress" ? "secondary" :
            item.status === "blocked" ? "destructive" : "outline"
          }
          className="text-xs"
        >
          {item.status}
        </Badge>
        <Select value={item.priority ?? "medium"} onValueChange={(v) => onPriorityChange(item, v)} disabled={updating}>
          <SelectTrigger className="w-[100px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={item.status} onValueChange={(v) => onStatusChange(item, v as WorkspaceItemStatus)} disabled={updating}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function ExecutiveWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const objectiveId = params.objectiveId as string;
  const roleParam = params.role as ExecutiveRole;

  const [activeTab, setActiveTab] = useState<"overview" | "items" | "memories" | "kpis">("overview");
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [newItemKind, setNewItemKind] = useState<WorkspaceItemKind>("task");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<string>("medium");
  const [newItemDueAt, setNewItemDueAt] = useState("");

  const { data: workspaceData, isLoading: workspaceLoading, refetch: refetchWorkspace } = useWorkspaceQuery(objectiveId, roleParam);
  const { data: summaryData, isLoading: summaryLoading } = useWorkspaceSummaryQuery(objectiveId, roleParam);
  const { data: itemsData, isLoading: itemsLoading, refetch: refetchItems } = useWorkspaceItemsQuery(objectiveId, roleParam);
  const { data: kpisData, isLoading: kpisLoading } = useWorkspaceKpisQuery(objectiveId, roleParam);
  const { data: memoriesData, isLoading: memoriesLoading } = useWorkspaceMemoriesQuery(objectiveId, roleParam);
  const sse = useWorkspaceSSE(objectiveId, roleParam);
  const { mutateAsync: ensureWorkspace } = useEnsureWorkspace();
  const { mutateAsync: createItem, isPending: creatingItem } = useCreateWorkspaceItem(objectiveId, roleParam);
  const { mutateAsync: updateItem, isPending: updatingItem } = useUpdateWorkspaceItem(objectiveId, roleParam);
  const { mutateAsync: updateKpis, isPending: updatingKpis } = useUpdateKpis(objectiveId, roleParam);

  const workspace = workspaceData?.data;
  const summary = summaryData?.data;
  const items = itemsData?.data?.items ?? [];
  const kpis = kpisData?.data ?? {};
  const memories = memoriesData?.data?.memories ?? [];

  useEffect(() => {
    if (workspace?.status === "active" && sse.connected) {
      const interval = setInterval(() => refetchWorkspace(), 10000);
      return () => clearInterval(interval);
    }
  }, [workspace?.status, sse.connected, refetchWorkspace]);

  useEffect(() => {
    if (objectiveId && roleParam) ensureWorkspace({ objective_id: objectiveId, executive_role: roleParam });
  }, [objectiveId, roleParam, ensureWorkspace]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    await createItem({ kind: newItemKind, title: newItemTitle, content: newItemContent || undefined, priority: newItemPriority || undefined, due_at: newItemDueAt || undefined });
    setNewItemDialogOpen(false);
    setNewItemTitle(""); setNewItemContent("");
    refetchItems();
  };

  const handleStatusChange = async (item: WorkspaceItem, newStatus: WorkspaceItemStatus) => { await updateItem({ item_id: item.id, status: newStatus }); refetchItems(); };
  const handlePriorityChange = async (item: WorkspaceItem, newPriority: string) => { await updateItem({ item_id: item.id, priority: newPriority }); refetchItems(); };

  const groupedItems = items.reduce((acc, item) => { if (!acc[item.kind]) acc[item.kind] = []; acc[item.kind].push(item); return acc; }, {} as Record<string, WorkspaceItem[]>);

  if (workspaceLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!workspace) return <div className="flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Workspace not found.</p></div>;

  const isConnected = sse.connected;

  return (
    <div className="space-y-6">
      <PageHeader kicker={roleParam} title={workspace.title} description={ROLE_DESCRIPTIONS[roleParam]} actions={
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">{isConnected && <Loader2 className="h-3 w-3 animate-spin" />}{isConnected ? "Live" : "Offline"}</Badge>
          <Button variant="ghost" size="sm" onClick={() => router.push("/executive-workspace/" + objectiveId)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </div>} />
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border/30" role="tablist">
        {EXECUTIVE_ROLES.map((r) => <RoleTab key={r} role={r} isActive={r === roleParam} objectiveId={objectiveId} />)}
      </div>
      <div className="flex gap-1 mb-4" role="tablist">
        {["overview", "items", "memories", "kpis"].map((tab) => <SectionTab key={tab} tab={tab} activeTab={activeTab} onClick={setActiveTab} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Items" value={summary?.items?.total ?? 0} icon={<ClipboardList className="h-5 w-5" />} tone="primary" />
                <StatCard label="Open" value={Object.values(summary?.items?.open_by_kind ?? {}).reduce((a, b) => a + b, 0)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" delta={summary?.items?.total ? Math.round((Object.values(summary?.items?.open_by_kind ?? {}).reduce((a, b) => a + b, 0) / summary.items.total) * 100) + "% open" : undefined} />
                <StatCard label="Memories" value={summary?.memories?.total ?? 0} icon={<Lightbulb className="h-5 w-5" />} tone="success" />
                <StatCard label="KPIs Tracked" value={Object.keys(kpis).length} icon={<BarChart2 className="h-5 w-5" />} tone="secondary" />
              </div>
              <PremiumCard variant="glass" className="p-5"><h3 className="mb-4 font-semibold flex items-center gap-2"><ClipboardList className="h-5 w-5" />Items by Kind</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{KIND_ORDER.map((kind) => { const count = summary?.items?.by_kind?.[kind] ?? 0; return <ItemKindBadge key={kind} kind={kind} count={count} />; })}</div></PremiumCard>
              <PremiumCard variant="glass" className="p-5"><h3 className="mb-4 font-semibold flex items-center gap-2"><Plus className="h-5 w-5" />Quick Actions</h3><div className="flex flex-wrap gap-3"><Dialog open={newItemDialogOpen} onOpenChange={setNewItemDialogOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Item</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Create Workspace Item</DialogTitle></DialogHeader><form onSubmit={handleCreateItem} className="space-y-4 py-4"><div className="grid gap-2 sm:grid-cols-2"><div><label className="block text-sm font-medium mb-1">Kind</label><Select value={newItemKind} onValueChange={setNewItemKind}><SelectTrigger><SelectValue placeholder="Select kind" /></SelectTrigger><SelectContent>{KIND_ORDER.map((k) => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}</SelectContent></Select></div><div><label className="block text-sm font-medium mb-1">Priority</label><Select value={newItemPriority} onValueChange={setNewItemPriority}><SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div></div><div><label className="block text-sm font-medium mb-1">Title *</label><Input value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} placeholder="Brief title for the item" /></div><div><label className="block text-sm font-medium mb-1">Content</label><Textarea value={newItemContent} onChange={(e) => setNewItemContent(e.target.value)} placeholder="Detailed description..." rows={3} /></div><div><label className="block text-sm font-medium mb-1">Due Date (optional)</label><Input type="date" value={newItemDueAt} onChange={(e) => setNewItemDueAt(e.target.value)} /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setNewItemDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={creatingItem || !newItemTitle.trim()}>{creatingItem ? "Creating..." : "Create Item"}</Button></DialogFooter></form></DialogContent></Dialog><Button variant="outline" onClick={() => refetchWorkspace()} disabled={workspaceLoading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div></PremiumCard>
            </>
          )}
          {activeTab === "items" && (
            <PremiumCard variant="glass" className="p-0">
              <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold">Workspace Items</h3>
                <Badge variant="outline">{items.length} total</Badge>
              </div>
              <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No items yet. Create your first task, decision, or note.</p>
                  </div>
                ) : (
                  KIND_ORDER.map((kind) => {
                    const kindItems = groupedItems[kind] ?? [];
                    if (kindItems.length === 0) return null;
                    return (
                      <div key={kind} className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className={KIND_COLORS[kind]}>{KIND_LABELS[kind]} ({kindItems.length})</Badge>
                        </div>
                        <div className="space-y-2">
                          {kindItems.map((item) => <ItemCard key={item.id} item={item} onStatusChange={handleStatusChange} onPriorityChange={handlePriorityChange} updating={updatingItem} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PremiumCard>
          )}
          {activeTab === "memories" && (
            <PremiumCard variant="glass" className="p-0">
              <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold">Executive Memories</h3>
                <Badge variant="outline">{memories.length}</Badge>
              </div>
              <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
                {memories.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No memories recorded for this executive yet.</p>
                    <p className="text-sm mt-1">Memories are added automatically during board sessions and planning.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memories.map((mem) => (
                      <div key={mem.id} className="p-4 rounded-xl border border-border/50 bg-background/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium truncate">{mem.content?.summary || "Memory"}</span>
                              {mem.confidence != null && <Badge variant="outline" className="text-xs">{Math.round(mem.confidence * 100)}% confidence</Badge>}
                              {mem.tags && mem.tags.length > 0 && <Badge variant="outline" className="text-xs">{mem.tags.slice(0, 3).join(", ")}{mem.tags.length > 3 && "+" + (mem.tags.length - 3)}</Badge>}
                            </div>
                            {mem.content?.strategy && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mem.content.strategy}</p>}
                            {mem.content?.lessons && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">Lessons: {mem.content.lessons.slice(0, 2).join("; ")}</p>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(mem.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PremiumCard>
          )}
          {activeTab === "kpis" && (
            <PremiumCard variant="glass" className="p-5">
              <h3 className="mb-4 font-semibold flex items-center gap-2"><BarChart2 className="h-5 w-5" />Key Performance Indicators</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(kpis).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-xl border border-border/50 bg-background/50">
                    <div className="text-sm text-muted-foreground mb-1">{formatKey(key)}</div>
                    <div className="text-3xl font-bold">{typeof value === "number" ? (value % 1 === 0 ? value.toString() : value.toFixed(2)) : String(value)}</div>
                  </div>
                ))}
                {Object.keys(kpis).length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground"><BarChart2 className="mx-auto h-10 w-10 mb-2 opacity-50" /><p>No KPIs recorded yet. They will populate as the board runs.</p></div>}
              </div>
            </PremiumCard>
          )}
        </div>

        <aside className="space-y-6">
          <PremiumCard variant="glass" className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">{ROLE_ICONS[roleParam]}</div>
              <div><h3 className="text-lg font-semibold">{roleParam} Workspace</h3><p className="text-sm text-muted-foreground">{objectiveId.slice(0, 12)}...</p></div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{ROLE_DESCRIPTIONS[roleParam]}</p>
              <div className="flex items-center gap-2"><Badge variant={workspace.status === "active" ? "default" : "secondary"}>{workspace.status}</Badge></div>
            </div>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-4">
            <h3 className="mb-3 font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4" />KPI Snapshot</h3>
            <div className="space-y-2">
              {Object.entries(kpis).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="font-mono font-semibold">{typeof value === "number" ? value.toFixed(2) : String(value)}</span>
                </div>
              ))}
              {Object.keys(kpis).length === 0 && <p className="text-sm text-muted-foreground text-center py-2">KPIs will appear after board sessions complete.</p>}
            </div>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-4">
            <h3 className="mb-3 font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" />Recent Items</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {items.slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No items yet.</p>
              ) : (
                items.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={KIND_COLORS[item.kind] + " text-xs"}>{KIND_LABELS[item.kind]}</Badge>
                      <span className="font-medium truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "completed" ? "default" : item.status === "in_progress" ? "secondary" : item.status === "blocked" ? "destructive" : "outline"} className="text-xs">{item.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PremiumCard>

          <PremiumCard variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Live Connection</span>
              <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
                {isConnected ? (<><Loader2 className="h-3 w-3 animate-spin" />Connected</>) : (<><XCircle className="h-3 w-3" />Offline</>)}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Events received: {sse.items.length}</div>
          </PremiumCard>
        </aside>
      </div>
    </div>
  );
}

const formatKey = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());