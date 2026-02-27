"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X, Send, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant" | "error";
  content: string;
  templateId?: string;
  templateName?: string;
}

const SUGGESTIONS = [
  "Order fulfillment workflow with stock check and auto-confirm",
  "CSV import pipeline that classifies and posts to ledger",
  "Low stock alert that creates restock orders automatically",
  "WhatsApp notification flow for order status updates",
];

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      return data;
    },
    onSuccess: (data) => {
      const tpl = data.template;
      const nodeCount = tpl.configJson.nodes?.length ?? 0;
      const edgeCount = tpl.configJson.edges?.length ?? 0;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Created "${tpl.name}" — ${nodeCount} nodes, ${edgeCount} edges. You can find it in the Templates tab or open it in the Builder.`,
          templateId: tpl.id,
          templateName: tpl.name,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
    onError: (err: Error) => {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: err.message },
      ]);
    },
  });

  const handleSend = () => {
    const prompt = input.trim();
    if (!prompt || generateMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setInput("");
    generateMutation.mutate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-sm border border-[var(--primary)] bg-[var(--primary)] text-white shadow-[4px_4px_0px_0px_var(--background)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--background)]"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed bottom-6 right-6 z-50 flex w-[380px] flex-col overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--card)] shadow-[8px_8px_0px_0px_var(--background)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--primary)]" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">
            AI Builder
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "360px", minHeight: "200px" }}>
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Describe a workflow in plain language. The AI will generate a template you can run or edit.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--text-primary)]"
                >
                  <ChevronRight className="h-3 w-3 shrink-0 text-[var(--primary)]" />
                  <span className="line-clamp-1">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-sm px-3 py-2 text-xs",
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white"
                  : msg.role === "error"
                  ? "border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.templateId && (
                <a
                  href={`/workflows/builder?template=${msg.templateId}`}
                  className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--primary)] hover:underline"
                >
                  Open in Builder <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {generateMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
              <span className="text-xs text-[var(--text-muted)]">Generating workflow...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow..."
            rows={1}
            className="flex-1 resize-none rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            style={{ maxHeight: "80px" }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || generateMutation.isPending}
            size="sm"
            className="h-8 w-8 shrink-0 bg-[var(--primary)] p-0 text-white hover:opacity-90 disabled:opacity-40"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
