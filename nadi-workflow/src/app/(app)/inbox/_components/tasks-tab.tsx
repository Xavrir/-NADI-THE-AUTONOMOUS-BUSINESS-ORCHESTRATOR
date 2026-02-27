"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { StatusChip } from "@/components/shared/status-chip";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  sourceType: string | null;
  createdAt: string;
}

const priorityVariant = (p: string) => {
  if (p === "high") return "danger" as const;
  if (p === "medium") return "warning" as const;
  return "neutral" as const;
};

export function TasksTab() {
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["inbox", "tasks"],
    queryFn: () => fetch("/api/inbox/tasks").then((r) => r.json()),
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-[var(--surface)] animate-pulse" />)}</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <p className="text-sm text-[var(--text-muted)]">No open tasks</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between card-elevated px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <StatusChip variant={priorityVariant(task.priority)} label={task.priority} />
            <span className="text-sm text-[var(--text-primary)]">{task.title}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            {task.sourceType && <span>{task.sourceType}</span>}
            {task.dueDate && (
              <span>Due {format(new Date(task.dueDate), "MMM d")}</span>
            )}
            <StatusChip
              variant={task.status === "open" ? "info" : "success"}
              label={task.status}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
