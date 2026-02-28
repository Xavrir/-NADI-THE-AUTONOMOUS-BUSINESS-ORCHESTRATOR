"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ImagePlus, ChevronLeft, ChevronRight, Plus, ExternalLink, Loader2, Play, Zap } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mocking "today" as March 25, 2026 to match the previous demo context
const DEMO_TODAY = new Date(2026, 2, 25); 

const MOCK_EVENTS = [
  { id: 1, date: new Date(2026, 2, 23), content: "New Arrivals Drop", channel: "IG", status: "published", type: "Carousel" },
  { id: 2, date: new Date(2026, 2, 24), content: "Behind the Stitch", channel: "TikTok", status: "published", type: "Video" },
  { id: 3, date: new Date(2026, 2, 25), content: "Customer fit check", channel: "IG Story", status: "scheduled", type: "Carousel" },
  { id: 4, date: new Date(2026, 2, 26), content: "Flash sale Cargo Jogger", channel: "Shopify", status: "scheduled", type: "Banner" },
  { id: 5, date: new Date(2026, 2, 27), content: "Weekend streetwear bundle", channel: "Tokopedia", status: "draft", type: "Listing" },
  { id: 6, date: new Date(2026, 2, 28), content: "Styling tips: Hoodie layering", channel: "IG Reels", status: "draft", type: "Video" },
  { id: 7, date: new Date(2026, 2, 29), content: "Week recap + top sellers", channel: "WhatsApp", status: "pending", type: "Text" },
  { id: 8, date: new Date(2026, 2, 5), content: "Payday Drop Promo", channel: "All", status: "published", type: "Campaign" },
  { id: 9, date: new Date(2026, 3, 2), content: "Ramadan Collection Teaser", channel: "IG", status: "draft", type: "Image" },
  { id: 10, date: new Date(2026, 1, 14), content: "Valentine's Couple Sets", channel: "TikTok", status: "published", type: "Video" },
];

interface ContentPack {
  title: string;
  items: number;
  status: string;
  description: string;
  isReal?: boolean;
  outputJson?: Record<string, unknown>;
}

const CONTENT_PACKS: ContentPack[] = [
  { title: "March New Arrivals Pack", items: 12, status: "ready", description: "Social assets for Spring collection launch across all channels" },
  { title: "Ramadan Campaign 2026", items: 8, status: "in_progress", description: "Modest streetwear bundles and story templates for Ramadan" },
  { title: "Collaboration Drop: Local Artists", items: 5, status: "draft", description: "Limited edition graphic tee launch content for all channels" },
];

const statusColors: Record<string, { variant: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  published: { variant: "success", label: "Published" },
  scheduled: { variant: "info", label: "Scheduled" },
  draft: { variant: "neutral", label: "Draft" },
  pending: { variant: "warning", label: "Pending" },
  ready: { variant: "success", label: "Ready" },
  in_progress: { variant: "warning", label: "In Progress" },
};

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(DEMO_TODAY);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignTheme, setCampaignTheme] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedPack, setSelectedPack] = useState<ContentPack | null>(null);

  interface RunNodeRun {
    nodeType: string;
    nodeId: string;
    outputJson: Record<string, unknown> | null;
  }

  interface WorkflowRun {
    templateId: string;
    status: string;
    nodeRuns: RunNodeRun[];
  }

  const { data: runs, isLoading } = useQuery<WorkflowRun[]>({
    queryKey: ["workflow-runs"],
    queryFn: async () => {
      const res = await fetch("/api/workflows/runs");
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json();
    },
  });

  interface TemplateConfig {
    inputSchema?: Array<{ name: string; label: string; type: string; placeholder?: string; required?: boolean; options?: string[] }>;
    nodes: Array<{ id: string }>;
  }

  interface WorkflowTemplate {
    id: string;
    name: string;
    configJson: TemplateConfig;
  }

  const { data: templates } = useQuery<WorkflowTemplate[]>({
    queryKey: ["workflow-templates"],
    queryFn: () => fetch("/api/workflows/templates").then((r) => r.json()),
  });

  const marketingTemplate = templates?.find(t => t.id === "tpl-marketing-weekly");

  const runMutation = useMutation({
    mutationFn: async ({ templateId, input }: { templateId: string; input: Record<string, unknown> }) => {
      const res = await fetch("/api/workflows/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, triggerType: "manual", input }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      setCampaignOpen(false);
      setCampaignTheme("");
      setBudget("");
    },
  });

  const handleRunCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketingTemplate) return;
    runMutation.mutate({
      templateId: marketingTemplate.id,
      input: {
        campaign_theme: campaignTheme,
        budget_idr: budget ? Number(budget) : undefined
      }
    });
  };

  const realContentPacks: ContentPack[] = (runs || [])
    .filter((run) => run.templateId === "tpl-marketing-weekly" && run.status === "completed")
    .map((run) => {
      const aiNode = run.nodeRuns.find((nr) => nr.nodeType === "ai" || nr.nodeId.includes("ai"));
      const output = aiNode?.outputJson;
      
      if (output?.packs && Array.isArray(output.packs)) {
        return (output.packs as Array<Record<string, unknown>>).map((p) => ({
          title: (p.title as string) || "AI Generated Pack",
          items: (p.items as number) || 0,
          status: "ready",
          description: (p.description as string) || "Generated by Marketing Weekly pipeline",
          isReal: true,
          outputJson: p
        }));
      }
      
      if (output?.title) {
         return [{
            title: output.title as string,
            items: (output.items as number) || 0,
            status: "ready",
            description: (output.description as string) || "Generated by Marketing Weekly pipeline",
            isReal: true,
            outputJson: output
         }];
      }

      return [];
    })
    .flat();

  const displayPacks = realContentPacks.length > 0 ? [...realContentPacks, ...CONTENT_PACKS] : CONTENT_PACKS;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  // weekStartsOn: 1 means Monday
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(DEMO_TODAY);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div>
      <PageHeader
        title="Marketing Planner"
        subtitle={format(currentDate, "MMMM yyyy")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-none border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8 rounded-none border-[var(--border)] font-mono text-xs font-bold uppercase tracking-wider hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">Today</Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-none border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"><ChevronRight className="h-4 w-4" /></Button>
            
            <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="ml-2 btn-glow h-8 rounded-none bg-[var(--primary)] text-[#000] gap-1 font-bold"
                  disabled={!marketingTemplate}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-sm border border-[var(--border)] bg-[var(--surface)] sm:max-w-[425px] card-elevated">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Launch New Campaign
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRunCampaign} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <label htmlFor="campaign_theme" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Campaign Theme <span className="text-[var(--primary)]">*</span>
                    </label>
                    <input
                      id="campaign_theme"
                      required
                      placeholder="e.g., Ramadan Collection"
                      value={campaignTheme}
                      onChange={(e) => setCampaignTheme(e.target.value)}
                      className="w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="budget" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Budget (IDR)
                    </label>
                    <input
                      id="budget"
                      type="number"
                      placeholder="500000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCampaignOpen(false)}
                      className="rounded-none border-[var(--border)] font-mono text-[10px] font-bold uppercase tracking-widest"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={runMutation.isPending}
                      className="bg-[var(--primary)] text-[#000] hover:opacity-90 gap-1.5 rounded-none font-bold uppercase tracking-widest text-[10px] btn-glow"
                    >
                      {runMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Run Pipeline
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="space-y-8">
        {/* Calendar Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)] font-display">
              <CalendarIcon className="h-4 w-4 text-[var(--primary)]" />
              {format(currentDate, "MMMM yyyy")} Calendar
            </h2>
          </div>
          
          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] overflow-hidden card-elevated">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--card)]">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center border-r border-[var(--border)] last:border-r-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{day}</div>
                </div>
              ))}
            </div>
            
            {/* Days grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {days.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isDemoToday = isSameDay(day, DEMO_TODAY);
                const dayEvents = MOCK_EVENTS.filter(e => isSameDay(e.date, day));
                
                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[120px] p-1.5 border-b border-r border-[var(--border)] group relative
                      ${i % 7 === 6 ? 'border-r-0' : ''} 
                      ${i >= days.length - 7 ? 'border-b-0' : ''}
                      ${!isCurrentMonth ? 'bg-[var(--background)] opacity-50' : 'bg-[var(--surface)] hover:bg-[var(--primary)]/[0.02]'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`font-mono text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-sm
                        ${isDemoToday ? 'bg-[var(--primary)] text-[#000] shadow-[2px_2px_0px_0px_var(--background)]' : 'text-[var(--text-secondary)]'}
                      `}>
                        {format(day, dateFormat)}
                      </span>
                      
                      <button className="h-5 w-5 flex items-center justify-center border border-dashed border-[var(--border)] rounded-sm text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {dayEvents.map(event => {
                        const st = statusColors[event.status] ?? statusColors.draft;
                        return (
                          <Popover key={event.id}>
                            <PopoverTrigger asChild>
                              <div className="relative rounded-sm border border-[var(--border)] bg-[var(--card)] p-1.5 hover:border-[var(--primary)] transition-colors cursor-pointer shadow-[1px_1px_0px_0px_var(--background)] hover:shadow-[1px_1px_0px_0px_var(--primary)]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider truncate mr-1">{event.channel}</span>
                                  <div className={`w-1.5 h-1.5 shrink-0 rounded-none ${st.variant === 'success' ? 'bg-[var(--success)]' : st.variant === 'warning' ? 'bg-[var(--warning)]' : st.variant === 'info' ? 'bg-[var(--info)]' : 'bg-[var(--text-muted)]'}`} />
                                </div>
                                <p className="text-[10px] font-medium text-[var(--text-primary)] leading-tight line-clamp-2">{event.content}</p>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4 rounded-sm border border-[var(--border)] bg-[var(--surface)] shadow-[4px_4px_0px_0px_var(--background)]">
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{event.content}</h4>
                                  <div className="flex items-center gap-2">
                                    <StatusChip variant={st.variant} label={st.label} className="h-4 rounded-sm font-mono text-[8px] uppercase tracking-widest" />
                                    <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-tighter">{format(event.date, "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">Channel</span>
                                    <p className="text-[10px] font-mono font-bold text-[var(--primary)]">{event.channel}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">Type</span>
                                    <p className="text-[10px] font-mono font-bold text-[var(--text-primary)]">{event.type}</p>
                                  </div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Content Packs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--text-primary)] font-display">
              <ImagePlus className="h-4 w-4 text-[var(--primary)]" />
              Asset Packs
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCampaignOpen(true)}
              className="h-8 font-mono text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-none"
            >
              Run Marketing Pipeline <Zap className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {isLoading && (
              <div className="col-span-full flex items-center justify-center p-12 border border-dashed border-[var(--border)] rounded-sm bg-[var(--surface)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)] mr-2" />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Fetching pipeline data...</span>
              </div>
            )}
            
            {!isLoading && realContentPacks.length === 0 && (
              <div 
                onClick={() => setCampaignOpen(true)}
                className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--primary)]/30 rounded-sm bg-[var(--primary)]/[0.02] hover:bg-[var(--primary)]/[0.05] transition-all cursor-pointer group"
              >
                <div className="h-12 w-12 rounded-none border border-[var(--primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_var(--primary)]">
                  <Zap className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <h3 className="text-sm font-bold font-display text-[var(--text-primary)] uppercase tracking-widest mb-1">Run Marketing Pipeline</h3>
                <p className="text-xs text-[var(--text-muted)] font-mono text-center max-w-xs">Generate AI content packs with the Marketing Weekly pipeline</p>
              </div>
            )}

            {!isLoading && displayPacks.map((pack, idx) => {
              const st = statusColors[pack.status] ?? statusColors.draft;
              return (
                <div
                  key={`${pack.title}-${idx}`}
                  className={`card-elevated p-0 group flex flex-col border-[var(--border)] overflow-hidden ${pack.isReal ? 'border-[var(--primary)]/50 shadow-[4px_4px_0px_0px_color-mix(in_srgb,var(--primary)_20%,transparent)]' : ''}`}
                >
                  <div className="p-4 border-b border-[var(--border)] flex justify-between items-start bg-[var(--surface)]">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-bold font-display text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{pack.title}</h3>
                      {pack.isReal && <span className="font-mono text-[8px] font-bold text-[var(--primary)] uppercase tracking-tighter">Pipeline Generated</span>}
                    </div>
                    <StatusChip variant={st.variant} label={st.label} className="rounded-sm font-mono tracking-widest text-[9px] uppercase border-[var(--border)]" />
                  </div>
                  <div className="p-4 flex-1">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{pack.description}</p>
                  </div>
                  <div className="p-3 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--text-muted)]"><span className="text-[var(--primary)] font-bold">{pack.items}</span> files</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedPack(pack)}
                      className="h-6 text-[10px] rounded-none border-[var(--border)] bg-transparent hover:bg-[var(--primary)] hover:text-[#000] hover:border-[var(--primary)] uppercase font-bold tracking-wider transition-colors shadow-[2px_2px_0px_0px_transparent] hover:shadow-[2px_2px_0px_0px_var(--primary)]"
                    >
                      Open Drive
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Dialog open={!!selectedPack} onOpenChange={(open) => !open && setSelectedPack(null)}>
          <DialogContent className="rounded-sm border border-[var(--border)] bg-[var(--surface)] sm:max-w-[600px] card-elevated max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
                {selectedPack?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">Description</span>
                  <StatusChip 
                    variant={selectedPack ? (statusColors[selectedPack.status]?.variant ?? "neutral") : "neutral"} 
                    label={selectedPack ? (statusColors[selectedPack.status]?.label ?? "Draft") : "Draft"} 
                    className="h-4 rounded-sm font-mono text-[8px] uppercase tracking-widest" 
                  />
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--card)] p-3 border border-[var(--border)] rounded-sm">
                  {selectedPack?.description}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">Content Assets ({selectedPack?.items})</span>
                {selectedPack?.isReal ? (
                  <div className="bg-[#000] p-4 rounded-sm border border-[var(--border)] overflow-x-auto">
                    <pre className="text-[11px] font-mono text-[var(--primary)] leading-relaxed">
                      {JSON.stringify(selectedPack.outputJson, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[var(--border)] rounded-sm bg-[var(--card)]">
                    <p className="text-xs font-mono text-[var(--text-muted)] text-center">
                      This is demo content. <br />
                      <span className="text-[var(--primary)] font-bold">Run the Marketing Weekly pipeline</span> <br />
                      to generate real content packs.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPack(null)}
                  className="rounded-none border-[var(--border)] font-mono text-[10px] font-bold uppercase tracking-widest"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
