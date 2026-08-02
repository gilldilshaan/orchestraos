"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/segmented-control";
import {
  useConnectorsQuery,
  useCreateConnector,
  useDeleteConnector,
  useConnectConnector,
  useDisconnectConnector,
  useConnectorActionsQuery,
  useAuditLogsQuery,
  useExecuteAction,
  useMarketplaceQuery,
  PROVIDER_META,
  DEFAULT_PROVIDER_META,
  type ConnectorConfig,
  type MarketplaceEntry,
} from "@/hooks/use-connectors";
import {
  Plus,
  Trash2,
  Plug,
  Unplug,
  Play,
  Activity,
  FileText,
  Shield,
  ChevronRight,
  ChevronDown,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function ConnectorsPage() {
  const { data: connectors = [] } = useConnectorsQuery();
  const { data: marketplace = [] } = useMarketplaceQuery();
  const createConnector = useCreateConnector();
  const deleteConnector = useDeleteConnector();
  const connectConnector = useConnectConnector();
  const disconnectConnector = useDisconnectConnector();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectorName, setConnectorName] = useState("");
  const [authType, setAuthType] = useState("api_key");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [configFields, setConfigFields] = useState<Record<string, string>>({});

  const [expandedConnector, setExpandedConnector] = useState<string | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, string>>({});
  const [selectedAction, setSelectedAction] = useState<string>("");

  const executeAction = useExecuteAction();

  const connectedCount = connectors.filter((c) => c.status === "connected").length;
  const errorCount = connectors.filter((c) => c.status === "error" || c.status === "failed").length;
  const disconnectedCount = connectors.length - connectedCount - errorCount;

  const handleCreate = async () => {
    if (!selectedProvider || !connectorName.trim()) return;
    await createConnector.mutateAsync({
      provider: selectedProvider,
      name: connectorName,
      auth_type: authType,
      credentials: creds,
      config: Object.keys(configFields).length > 0 ? configFields : undefined,
    });
    setShowCreate(false);
    setSelectedProvider(null);
    setConnectorName("");
    setCreds({});
    setConfigFields({});
  };

  const handleExecute = async (connectorId: string) => {
    if (!selectedAction) return;
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(actionParams)) {
      if (v) {
        params[k] = isNaN(Number(v)) ? v : Number(v);
      }
    }
    await executeAction.mutateAsync({
      connector_id: connectorId,
      action: selectedAction,
      params,
    });
    setSelectedAction("");
    setActionParams({});
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-6 py-4">
        <PageHeader
          kicker="Explore"
          title="Connector Marketplace"
          description="Integrate OrchestraOS with external systems"
          actions={
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Connector
            </button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="space-y-6 p-6">
          {/* Create Form */}
          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden rounded-xl border border-border/40 bg-card/50"
              >
                <div className="space-y-4 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    New Connector
                  </h3>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {marketplace.map((entry) => {
                      const meta = PROVIDER_META[entry.provider] ?? DEFAULT_PROVIDER_META;
                      const Icon = meta.icon;
                      return (
                        <button
                          key={entry.provider}
                          onClick={() => {
                            setSelectedProvider(entry.provider);
                            setCreds({});
                            setConfigFields({});
                          }}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-150 hover:border-primary/50",
                            selectedProvider === entry.provider
                              ? "border-primary bg-primary/10"
                              : "border-border/40 bg-muted/20",
                          )}
                        >
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", meta.color)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-[11px] font-medium capitalize">{entry.provider.replace(/_/g, " ")}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedProvider && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Connector name"
                        value={connectorName}
                        onChange={(e) => setConnectorName(e.target.value)}
                        className="input"
                      />

                      <SegmentedControl
                        value={authType}
                        onChange={setAuthType}
                        options={[
                          { value: "api_key", label: "API Key" },
                          { value: "oauth", label: "OAuth" },
                          { value: "none", label: "None" },
                        ]}
                      />

                      <div className="space-y-2">
                        {selectedProvider === "github" && (
                          <>
                            <CredField label="Token" value={creds} onChange={setCreds} />
                            <ConfigField label="base_url" value={configFields} onChange={setConfigFields} placeholder="https://api.github.com (optional)" />
                          </>
                        )}
                        {selectedProvider === "jira" && (
                          <>
                            <CredField label="email" value={creds} onChange={setCreds} />
                            <CredField label="token" value={creds} onChange={setCreds} />
                            <ConfigField label="base_url" value={configFields} onChange={setConfigFields} placeholder="https://your-domain.atlassian.net" />
                          </>
                        )}
                        {selectedProvider === "slack" && (
                          <CredField label="bot_token" value={creds} onChange={setCreds} display="Bot Token" />
                        )}
                        {selectedProvider === "notion" && (
                          <CredField label="token" value={creds} onChange={setCreds} display="Integration Token" />
                        )}
                        {selectedProvider === "google_workspace" && (
                          <CredField label="access_token" value={creds} onChange={setCreds} display="OAuth Token" />
                        )}
                        {selectedProvider === "webhook" && (
                          <CredField label="secret" value={creds} onChange={setCreds} display="Webhook Secret (optional)" />
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowCreate(false)}
                          className="rounded-lg border border-border/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreate}
                          disabled={!connectorName.trim()}
                          className="rounded-lg bg-primary px-4 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Installed Connectors */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
                Installed Connectors
              </h2>
              <span className="chip">{connectors.length}</span>
            </div>

            {connectors.length === 0 && !showCreate && (
              <EmptyState
                compact
                icon={<Plug className="h-5 w-5" />}
                title="No connectors installed"
                description="Add a connector above to integrate external systems."
              />
            )}

            <div className="space-y-3">
              {connectors.map((conn) => {                const meta = PROVIDER_META[conn.provider] ?? DEFAULT_PROVIDER_META;
                const Icon = meta.icon;
                const isExpanded = expandedConnector === conn.id;
                return (
                  <div
                    key={conn.id}
                    className="rounded-xl border border-border/40 bg-card/30 transition-colors hover:border-border/60"
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{conn.name}</span>
                          <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                            {conn.provider}
                          </span>
                          <StatusBadgeConnector status={conn.status} />
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {conn.auth_type} · {conn.health_status ?? "unknown"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {conn.status !== "connected" ? (
                          <button
                            onClick={() => connectConnector.mutate(conn.id)}
                            className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10"
                          >
                            Connect
                          </button>
                        ) : (
                          <button
                            onClick={() => disconnectConnector.mutate(conn.id)}
                            className="rounded-lg border border-amber-500/30 px-2.5 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/10"
                          >
                            Disconnect
                          </button>
                        )}
                        <button
                          onClick={() => deleteConnector.mutate(conn.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedConnector(isExpanded ? null : conn.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border/30"
                        >
                          <ConnectorDetail
                            connector={conn}
                            selectedAction={selectedAction}
                            setSelectedAction={setSelectedAction}
                            actionParams={actionParams}
                            setActionParams={setActionParams}
                            onExecute={handleExecute}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health summary + browse providers */}
          <div className="border-t border-border/20 pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">
                  Browse Providers
                </h2>
                <span className="chip">{marketplace.length} available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip text-success">{connectedCount} connected</span>
                <span className="chip">{disconnectedCount} disconnected</span>
                {errorCount > 0 && (
                  <span className="chip text-destructive">{errorCount} error</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {marketplace.map((entry) => {
                const meta = PROVIDER_META[entry.provider] ?? DEFAULT_PROVIDER_META;
                const Icon = meta.icon;
                const installed = connectors.find((c) => c.provider === entry.provider);
                return (
                  <button
                    key={entry.provider}
                    onClick={() => {
                      setSelectedProvider(entry.provider);
                      setCreds({});
                      setConfigFields({});
                      setShowCreate(true);
                    }}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card/30 p-4 text-left transition-all duration-150 hover:border-primary/50 hover:bg-card/50"
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105", meta.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium capitalize">{entry.provider.replace(/_/g, " ")}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                      installed
                        ? installed.status === "connected"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : installed.status === "error" || installed.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-muted/30 text-muted-foreground"
                        : "bg-muted/20 text-muted-foreground/40",
                    )}>
                      {installed
                        ? installed.status === "connected"
                          ? "Connected"
                          : installed.status === "error" || installed.status === "failed"
                            ? "Error"
                            : "Idle"
                        : "Not installed"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectorDetail({
  connector,
  selectedAction,
  setSelectedAction,
  actionParams,
  setActionParams,
  onExecute,
}: {
  connector: ConnectorConfig;
  selectedAction: string;
  setSelectedAction: (a: string) => void;
  actionParams: Record<string, string>;
  setActionParams: (p: Record<string, string>) => void;
  onExecute: (connectorId: string) => void;
}) {
  const { data: actions = [] } = useConnectorActionsQuery(connector.id);
  const { data: auditLogs = [] } = useAuditLogsQuery(connector.id);
  const { data: marketplace = [] } = useMarketplaceQuery();
  const [tab, setTab] = useState<"actions" | "audit">("actions");

  const availableActions =
    marketplace.find((m) => m.provider === connector.provider)?.actions ?? [];

  const selectedActionDef = availableActions.find((a) => a.name === selectedAction);

  return (
    <div className="space-y-4 p-4">
      {/* Tabs */}
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "actions", label: "Actions" },
          { value: "audit", label: "Audit" },
        ]}
      />

      {tab === "actions" && (
        <div className="space-y-3">
          {/* Execute Action */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground">Execute Action</h4>
            <div className="flex flex-wrap gap-1.5">
              {availableActions.map((a) => (
                <button
                  key={a.name}
                  onClick={() => {
                    setSelectedAction(a.name);
                    setActionParams({});
                  }}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all",
                    selectedAction === a.name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground hover:border-border",
                  )}
                >
                  {a.name.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {selectedActionDef && (
            <div className="space-y-2 rounded-lg bg-muted/20 p-3">
              <p className="text-[10px] text-muted-foreground/70">{selectedActionDef.description}</p>
              <div className="space-y-1.5">
                {Object.entries(selectedActionDef.params).map(([key, desc]) => (
                  <input
                    key={key}
                    type="text"
                    placeholder={`${key} (${desc})`}
                    value={actionParams[key] ?? ""}
                    onChange={(e) => setActionParams({ ...actionParams, [key]: e.target.value })}
                    className="input px-2.5 py-1.5 text-[11px]"
                  />
                ))}
              </div>
              <button
                onClick={() => onExecute(connector.id)}
                disabled={!selectedAction}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                Execute
              </button>
            </div>
          )}

          {/* Action History */}
          <div>
            <h4 className="mb-2 text-[11px] font-semibold text-muted-foreground">Recent Actions</h4>
            <div className="space-y-1">
              {actions.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {a.status === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : a.status === "failed" ? (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span className="text-[11px] font-medium">{a.action.replace(/_/g, " ")}</span>
                    {a.duration_ms && (
                      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{a.duration_ms}ms</span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground">Audit Trail</h4>
          {auditLogs.length === 0 ? (
            <EmptyState
              compact
              icon={<Shield className="h-5 w-5" />}
              title="No audit records yet"
              description="Audit entries will appear here after actions are executed."
            />
          ) : (
            auditLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-2">
                {log.result === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium">{log.action}</span>
                    <span className="text-[9px] text-muted-foreground">by {log.actor}</span>
                  </div>
                  <p className="truncate text-[9px] text-muted-foreground/60">{log.target}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Webhook section */}
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold text-violet-300">Webhooks</span>
        </div>
        <p className="mt-1 text-[9px] text-violet-300/60">
          Use POST /api/v1/connectors/webhooks to register a webhook for real-time event delivery
        </p>
      </div>
    </div>
  );
}

function StatusBadgeConnector({ status }: { status: string }) {
  if (status === "connected")
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-medium text-emerald-400">Connected</span>;
  if (status === "error")
    return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-medium text-red-400">Error</span>;
  return <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">Disconnected</span>;
}

function CredField({
  label,
  value,
  onChange,
  display,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  display?: string;
}) {
  return (
    <input
      type="password"
      placeholder={display ?? label}
      value={value[label] ?? ""}
      onChange={(e) => onChange({ ...value, [label]: e.target.value })}
      className="input"
    />
  );
}

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder ?? label}
      value={value[label] ?? ""}
      onChange={(e) => onChange({ ...value, [label]: e.target.value })}
      className="input"
    />
  );
}
