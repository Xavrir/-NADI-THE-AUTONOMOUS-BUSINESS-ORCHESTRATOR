"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Play, Loader2, ArrowLeft, Zap, GitBranch, Brain, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowNode } from "./_components/workflow-node";
import { NodeInspector } from "./_components/node-inspector";

interface TemplateConfig {
  nodes: Array<{ id: string; type: string; label: string; config?: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; label?: string }>;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  configJson: TemplateConfig;
}

const nodeTypes = { workflowNode: WorkflowNode };

function layoutNodes(
  configNodes: TemplateConfig["nodes"],
  configEdges: TemplateConfig["edges"]
): Node[] {
  const SPACING_X = 220;
  const SPACING_Y = 110;
  const BASE_X = 300;

  const childMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();
  for (const e of configEdges) {
    childMap.set(e.source, [...(childMap.get(e.source) ?? []), e.target]);
    parentMap.set(e.target, [...(parentMap.get(e.target) ?? []), e.source]);
  }

  const roots = configNodes.filter((n) => !(parentMap.get(n.id)?.length));
  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();

  const queue: Array<{ id: string; depth: number; lane: number }> = [];
  for (const r of roots) queue.push({ id: r.id, depth: 0, lane: 0 });

  const depthSlots = new Map<number, number>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const slot = depthSlots.get(depth) ?? 0;
    depthSlots.set(depth, slot + 1);

    const siblings = configNodes.filter(
      (n) => !visited.has(n.id) && parentMap.get(n.id)?.some((p) => childMap.get(p)?.includes(n.id) && childMap.get(p)?.includes(id))
    );
    const totalAtDepth = Math.max(1, slot + 1 + siblings.length);
    const xOffset = (slot - (totalAtDepth - 1) / 2) * SPACING_X;

    positions.set(id, { x: BASE_X + xOffset, y: depth * SPACING_Y + 50 });

    const children = childMap.get(id) ?? [];
    for (let i = 0; i < children.length; i++) {
      if (!visited.has(children[i])) {
        queue.push({ id: children[i], depth: depth + 1, lane: i });
      }
    }
  }

  for (const n of configNodes) {
    if (!positions.has(n.id)) {
      positions.set(n.id, { x: BASE_X, y: configNodes.indexOf(n) * SPACING_Y + 50 });
    }
  }

  return configNodes.map((n) => ({
    id: n.id,
    type: "workflowNode",
    position: positions.get(n.id)!,
    data: { label: n.label, nodeType: n.type, status: "idle", config: n.config },
  }));
}

function layoutEdges(configEdges: TemplateConfig["edges"]): Edge[] {
  return configEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: false,
    style: { stroke: "var(--border)", strokeWidth: 2 },
    labelStyle: { fill: "var(--text-muted)", fontSize: 11 },
    labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.9 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border)", width: 16, height: 16 },
  }));
}

export function WorkflowBuilderContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") ?? "tpl-finance-close";
  const queryClient = useQueryClient();

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const { data: template, isLoading } = useQuery<TemplateData>({
    queryKey: ["workflow-template", templateId],
    queryFn: async () => {
      const res = await fetch("/api/workflows/templates");
      const templates: TemplateData[] = await res.json();
      return templates.find((t) => t.id === templateId) ?? templates[0];
    },
  });

  const initialNodes = useMemo(
    () => (template ? layoutNodes(template.configJson.nodes, template.configJson.edges) : []),
    [template]
  );
  const initialEdges = useMemo(
    () => (template ? layoutEdges(template.configJson.edges) : []),
    [template]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowInspector(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workflows/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, triggerType: "manual" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onMutate: () => {
      if (!template) return;
      const configNodes = template.configJson.nodes;
      configNodes.forEach((n, i) => {
        setTimeout(() => {
          setNodes((prev) =>
            prev.map((node) =>
              node.id === n.id ? { ...node, data: { ...node.data, status: "running" } } : node
            )
          );
          setEdges((prev) =>
            prev.map((edge) =>
              edge.source === n.id
                ? { ...edge, animated: true, style: { ...edge.style, stroke: "var(--primary)" } }
                : edge
            )
          );
        }, i * 600);
        setTimeout(() => {
          setNodes((prev) =>
            prev.map((node) =>
              node.id === n.id ? { ...node, data: { ...node.data, status: "completed" } } : node
            )
          );
          setEdges((prev) =>
            prev.map((edge) =>
              edge.source === n.id
                ? { ...edge, animated: false, style: { ...edge.style, stroke: "var(--success)" } }
                : edge
            )
          );
        }, i * 600 + 500);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      const delay = (template?.configJson.nodes.length ?? 0) * 600 + 1500;
      setTimeout(() => {
        setNodes((prev) =>
          prev.map((node) => ({ ...node, data: { ...node.data, status: "idle" } }))
        );
        setEdges((prev) =>
          prev.map((edge) => ({
            ...edge,
            animated: false,
            style: { ...edge.style, stroke: "var(--border)" },
          }))
        );
      }, delay);
    },
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Workflow Builder" subtitle="Loading..." />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={template?.name ?? "Workflow Builder"}
        subtitle={template?.description ?? "Visual workflow editor"}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/workflows">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || !template?.configJson.nodes.length}
              className="btn-glow gap-1.5 bg-[var(--primary)] text-white hover:opacity-90"
            >
              {runMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
              ) : (
                <><Play className="h-4 w-4" /> Run Workflow</>
              )}
            </Button>
          </div>
        }
      />

      <div className="flex h-8 items-center gap-4 border-y border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-[var(--primary)]" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Trigger</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3 text-[var(--info)]" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Logic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="h-3 w-3 text-purple-400" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">AI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-[var(--warning)]" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Policy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-400" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Approval</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Play className="h-3 w-3 text-[var(--success)]" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Execute</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-[var(--text-muted)]" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Audit</span>
        </div>
      </div>

      <div className="flex overflow-hidden rounded-sm border border-[var(--border)]" style={{ height: "calc(100vh - 252px)" }}>
        <div style={{ width: "100%", height: "100%", flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange<Node>}
            onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            style={{ backgroundColor: "var(--bg)" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
            <Controls
              className="!border-[var(--border)] !bg-[var(--surface)] !shadow-lg [&>button]:!border-[var(--border)] [&>button]:!bg-[var(--card)] [&>button]:!text-[var(--text-muted)] [&>button:hover]:!bg-[var(--surface)]"
            />
            <MiniMap
              nodeColor="var(--primary)"
              maskColor="var(--bg)"
              className="!border-[var(--border)] !bg-[var(--surface)]"
            />
          </ReactFlow>
        </div>

        {showInspector && (
          <div className="w-72 shrink-0 border-l border-[var(--border)] bg-[var(--surface)]">
            <NodeInspector
              node={selectedNode as { id: string; data: { label: string; nodeType: string; status?: string } } | null}
              onClose={() => setShowInspector(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
