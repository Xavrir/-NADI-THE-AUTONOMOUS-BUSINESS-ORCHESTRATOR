"use client";

import React, { useState, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface InputField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface Template {
  id: string;
  name: string;
  configJson: {
    inputSchema?: InputField[];
    nodes: any[];
  };
}

interface RunWorkflowDialogProps {
  template: Template;
  onRun: (templateId: string, input: Record<string, unknown>) => void;
  isPending: boolean;
  pendingTemplateId: string | null;
}

export function RunWorkflowDialog({
  template,
  onRun,
  isPending,
  pendingTemplateId,
}: RunWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const inputSchema = template.configJson.inputSchema || [];
  const hasInputSchema = inputSchema.length > 0;

  useEffect(() => {
    if (!open) {
      setFormData({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedData = { ...formData };
    
    // Parse numbers
    inputSchema.forEach((field) => {
      if (field.type === "number" && processedData[field.name] !== undefined && processedData[field.name] !== "") {
        processedData[field.name] = Number(processedData[field.name]);
      }
    });

    onRun(template.id, processedData);
    setOpen(false);
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isRunningThis = isPending && pendingTemplateId === template.id;
  const isDisabled = isPending || template.configJson.nodes.length === 0;

  const buttonContent = isRunningThis ? (
    <>
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running...
    </>
  ) : (
    <>
      <Play className="h-3.5 w-3.5" /> Run
    </>
  );

  // No input schema → run immediately, no dialog
  if (!hasInputSchema) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={isDisabled}
        onClick={() => onRun(template.id, {})}
      >
        {buttonContent}
      </Button>
    );
  }

  // Has input schema → show dialog
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={isDisabled}
        onClick={() => setOpen(true)}
      >
        {buttonContent}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm border border-[var(--border)] bg-[var(--surface)] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
            Run {template.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {inputSchema.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label
                htmlFor={field.name}
                className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]"
              >
                {field.label}
                {field.required && <span className="text-[var(--danger)] ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none min-h-[100px]"
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none appearance-none"
                >
                  <option value="" disabled>
                    {field.placeholder || "Select an option..."}
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="rounded-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[var(--primary)] text-white hover:opacity-90 gap-1.5 rounded-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Run Workflow
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
