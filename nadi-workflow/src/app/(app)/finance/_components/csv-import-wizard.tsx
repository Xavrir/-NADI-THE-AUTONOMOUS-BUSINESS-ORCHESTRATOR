"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ParsedRow = Record<string, string>;

interface ImportResult {
  batchId: string;
  posted: number;
  review: number;
  skipped: number;
  total: number;
  entries: Array<{
    description: string;
    category: string;
    confidence: number;
    status: string;
  }>;
}

type WizardStep = "upload" | "preview" | "result";

export function CsvImportWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (data: ParsedRow[]) => {
      const res = await fetch("/api/finance/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: data }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["review"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as ParsedRow[];
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setRows(data);
          setStep("preview");
        }
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setFileName("");
    setResult(null);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-[var(--border)] bg-[var(--surface)]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
            {step === "upload" && "Upload Bank CSV"}
            {step === "preview" && "Preview & Confirm"}
            {step === "result" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[var(--border)] p-12 transition-colors hover:border-[var(--primary)]"
          >
            <FileSpreadsheet className="h-12 w-12 text-[var(--text-muted)]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Drop a .csv file here or click to browse
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Supports Indonesian bank formats (tanggal, keterangan, debit, kredit)
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
              />
              <span className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
                <Upload className="h-4 w-4" />
                Choose File
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-primary)]">{fileName}</span>
                {" — "}{rows.length} rows detected
              </p>
              <Button variant="ghost" size="sm" onClick={reset}>
                Change file
              </Button>
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-1.5 text-[var(--text-secondary)]">
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="px-3 py-2 text-center text-xs text-[var(--text-muted)]">
                  Showing 10 of {rows.length} rows
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
              <Button
                onClick={() => importMutation.mutate(rows)}
                disabled={importMutation.isPending}
                className="gap-2 bg-[var(--primary)] text-white hover:opacity-90"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Import {rows.length} rows</>
                )}
              </Button>
            </div>

            {importMutation.isError && (
              <p className="text-sm text-[var(--danger)]">
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : "Import failed"}
              </p>
            )}
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--success-muted)] bg-[var(--success-muted)]/10 p-4">
              <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  Import complete
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Batch {result.batchId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="font-mono text-2xl font-bold text-[var(--success)]">{result.posted}</p>
                <p className="text-xs text-[var(--text-muted)]">Posted</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="font-mono text-2xl font-bold text-[var(--warning)]">{result.review}</p>
                <p className="text-xs text-[var(--text-muted)]">Needs Review</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center">
                <p className="font-mono text-2xl font-bold text-[var(--text-muted)]">{result.skipped}</p>
                <p className="text-xs text-[var(--text-muted)]">Skipped</p>
              </div>
            </div>

            {result.review > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--warning-muted)] bg-[var(--warning-muted)]/10 p-3 text-sm text-[var(--warning)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {result.review} transaction{result.review > 1 ? "s" : ""} sent to Inbox &gt; Review for manual classification
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)} className="bg-[var(--primary)] text-white hover:opacity-90">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
