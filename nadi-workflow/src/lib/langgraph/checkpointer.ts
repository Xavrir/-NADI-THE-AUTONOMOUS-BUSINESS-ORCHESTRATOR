import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import path from "path";

const CHECKPOINT_DB_PATH = path.join(
  process.cwd(),
  "prisma",
  "langgraph-checkpoints.db"
);

let _checkpointer: SqliteSaver | null = null;

export function getCheckpointer(): SqliteSaver {
  if (!_checkpointer) {
    _checkpointer = SqliteSaver.fromConnString(CHECKPOINT_DB_PATH);
  }
  return _checkpointer;
}
