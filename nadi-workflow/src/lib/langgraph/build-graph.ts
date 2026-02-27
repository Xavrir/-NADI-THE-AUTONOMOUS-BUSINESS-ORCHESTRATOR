import { StateGraph, START, END } from "@langchain/langgraph";
import { WorkflowStateAnnotation } from "./state";
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
  const graph = new StateGraph(WorkflowStateAnnotation);

  // Add all nodes
  for (const node of nodes) {
    graph.addNode(node.id, getExecutor(node));
  }

  // Connect START to first node (entry node = first in array or zero in-degree)
  const hasIncoming = new Set(edges.map((e) => e.target));
  const entryNodes = nodes.filter((n) => !hasIncoming.has(n.id));
  const firstNode = entryNodes[0] ?? nodes[0];

  if (firstNode) {
    graph.addEdge(START, firstNode.id);
  }

  // Group edges by source to detect conditional routing
  const edgesBySource = new Map<string, EdgeConfig[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge);
  }

  for (const [source, outEdges] of edgesBySource) {
    const hasLabels = outEdges.some((e) => e.label || e.when);

    if (outEdges.length > 1 && hasLabels) {
      // Conditional routing — branch based on branchPath
      const routeMap: Record<string, string> = {};
      for (const e of outEdges) {
        const key = e.label ?? e.when ?? e.target;
        routeMap[key] = e.target;
      }

      graph.addConditionalEdges(
        source,
        (state) => {
          const path = state.branchPath;
          if (path && path in routeMap) {
            return path;
          }
          // Fallback to first edge's key
          return Object.keys(routeMap)[0];
        },
        routeMap
      );
    } else if (outEdges.length === 1) {
      graph.addEdge(source, outEdges[0].target);
    } else if (outEdges.length > 1) {
      // Multiple edges without labels — follow all (use first as sequential chain)
      // LangGraph doesn't support fan-out to multiple targets from addEdge in sequence
      // so treat as sequential: add edges to all targets
      for (const e of outEdges) {
        graph.addEdge(source, e.target);
      }
    }
  }

  // Terminal nodes (no outgoing edges) → END
  const hasOutgoing = new Set(edges.map((e) => e.source));
  for (const node of nodes) {
    if (!hasOutgoing.has(node.id)) {
      graph.addEdge(node.id, END);
    }
  }

  return graph.compile({ checkpointer: getCheckpointer() });
}
