import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import path from "path";

const IS_SERVERLESS = !!process.env.TURSO_DATABASE_URL;

const CHECKPOINT_DB_PATH = path.join(
  process.cwd(),
  "prisma",
  "langgraph-checkpoints.db"
);

let _checkpointer: BaseCheckpointSaver | null = null;

export function getCheckpointer(): BaseCheckpointSaver {
  if (!_checkpointer) {
    _checkpointer = IS_SERVERLESS
      ? new MemorySaver()
      : SqliteSaver.fromConnString(CHECKPOINT_DB_PATH);
  }
  return _checkpointer;
}
