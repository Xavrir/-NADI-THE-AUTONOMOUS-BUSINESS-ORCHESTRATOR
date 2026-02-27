import { Annotation } from "@langchain/langgraph";

export const WorkflowStateAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  templateId: Annotation<string>(),
  templateName: Annotation<string>(),
  triggerType: Annotation<string>(),
  data: Annotation<Record<string, unknown>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  confidence: Annotation<number | undefined>(),
  policyResult: Annotation<"pass" | "blocked" | undefined>(),
  branchPath: Annotation<string | undefined>(),
  nodesCompleted: Annotation<number>({
    reducer: (a, b) => a + b,
    default: () => 0,
  }),
  nodesFailed: Annotation<number>({
    reducer: (a, b) => a + b,
    default: () => 0,
  }),
  sideEffects: Annotation<Array<{ type: string; id?: string }>>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  approvalInterrupt: Annotation<
    | {
        approvalId: string;
        title: string;
        riskLevel: string;
      }
    | undefined
  >(),
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;
