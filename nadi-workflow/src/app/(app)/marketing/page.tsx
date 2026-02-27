"use client";

import { Calendar, ImagePlus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WEEKLY_PLAN = [
  { day: "Mon", content: "Product spotlight: Gula Aren Latte 1L", channel: "Instagram", status: "published", type: "Image Post" },
  { day: "Tue", content: "Behind the scenes: roasting process", channel: "TikTok", status: "published", type: "Short Video" },
  { day: "Wed", content: "Customer review highlight", channel: "Instagram Stories", status: "scheduled", type: "Story Carousel" },
  { day: "Thu", content: "Flash promo: 15% off Americano Iced", channel: "Shopee", status: "scheduled", type: "Promo Banner" },
  { day: "Fri", content: "Weekend bundle: Kopi Susu + Matcha Latte", channel: "Tokopedia", status: "draft", type: "Listing Update" },
  { day: "Sat", content: "Barista tip of the week", channel: "Instagram Reels", status: "draft", type: "Short Video" },
  { day: "Sun", content: "Week recap + next week teaser", channel: "WhatsApp Broadcast", status: "pending", type: "Text + Image" },
];

const CONTENT_PACKS = [
  { title: "March Coffee Festival Pack", items: 12, status: "ready", description: "Social assets for Jakarta Coffee Week partnership" },
  { title: "Ramadan Campaign 2026", items: 8, status: "in_progress", description: "Iftar bundle promotions and story templates" },
  { title: "New Product Launch: Oat Latte", items: 5, status: "draft", description: "Launch week content for all channels" },
];

const statusColors: Record<string, { variant: "success" | "warning" | "info" | "neutral"; label: string }> = {
  published: { variant: "success", label: "Published" },
  scheduled: { variant: "info", label: "Scheduled" },
  draft: { variant: "neutral", label: "Draft" },
  pending: { variant: "warning", label: "Pending" },
  ready: { variant: "success", label: "Ready" },
  in_progress: { variant: "warning", label: "In Progress" },
};

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle="Weekly content calendar and content packs"
      />

      <div className="space-y-6">
        {/* Weekly Calendar */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <Calendar className="h-4 w-4 text-[var(--primary)]" />
            This Week
          </h2>
          <div className="grid gap-3 md:grid-cols-7">
            {WEEKLY_PLAN.map((item) => {
              const st = statusColors[item.status] ?? statusColors.draft;
              return (
                <div
                  key={item.day}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[var(--primary)]">{item.day}</span>
                    <StatusChip variant={st.variant} label={st.label} />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{item.content}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-[var(--text-muted)]">{item.channel}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Content Packs */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <ImagePlus className="h-4 w-4 text-[var(--primary)]" />
            Content Packs
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {CONTENT_PACKS.map((pack) => {
              const st = statusColors[pack.status] ?? statusColors.draft;
              return (
                <div
                  key={pack.title}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{pack.title}</h3>
                    <StatusChip variant={st.variant} label={st.label} />
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{pack.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">{pack.items} assets</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
