import { StateGraph, START, END } from "@langchain/langgraph";
import { WorkflowStateAnnotation } from "./state";
import type { WorkflowState } from "./state";
import { getExecutor } from "./nodes";
import { getCheckpointer } from "./checkpointer";

interface NodeConfig {
  id: string;
  type: string;
  label: string;
  config?: Record<string, unknown>;
}

interface EdgeConfig {
  source: string;
  target: string;
  label?: string;
  when?: string;
}

export function buildGraph(nodes: NodeConfig[], edges: EdgeConfig[]) {
  if (nodes.length === 0) {
    throw new Error("Graph must have at least one node");
  }

  // Calling addNode with string key expands N from "__start__" to string,
  // enabling addEdge to accept arbitrary string node names.
  const firstNode = nodes[0];
  let g = new StateGraph(WorkflowStateAnnotation).addNode(
    firstNode.id,
    getExecutor(firstNode)
  );

  for (const node of nodes.slice(1)) {
    g = g.addNode(node.id, getExecutor(node));
  }

  // Determine entry node (first node with no incoming edges)
  const hasIncoming = new Set(edges.map((e) => e.target));
  const entryNodes = nodes.filter((n) => !hasIncoming.has(n.id));
  const entryNode = entryNodes[0] ?? nodes[0];
  g = g.addEdge(START, entryNode.id);

  // Group edges by source to detect conditional routing
  const edgesBySource = new Map<string, EdgeConfig[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge);
  }

  for (const [source, outEdges] of edgesBySource) {
    const hasLabels = outEdges.some((e) => e.label ?? e.when);

    if (outEdges.length > 1 && hasLabels) {
      // Conditional routing — branch based on branchPath in state
      const routeMap: Record<string, string> = {};
      for (const e of outEdges) {
        const key = e.label ?? e.when ?? e.target;
        routeMap[key] = e.target;
      }

      g = g.addConditionalEdges(
        source,
        (state: WorkflowState) => {
          const path = state.branchPath;
          if (path && path in routeMap) {
            return path;
          }
          return Object.keys(routeMap)[0];
        },
        routeMap
      );
    } else {
      for (const e of outEdges) {
        g = g.addEdge(e.source, e.target);
      }
    }
  }

  // Terminal nodes (no outgoing edges) → END
  const hasOutgoing = new Set(edges.map((e) => e.source));
  for (const node of nodes) {
    if (!hasOutgoing.has(node.id)) {
      g = g.addEdge(node.id, END);
    }
  }

  return g.compile({ checkpointer: getCheckpointer() });
}
