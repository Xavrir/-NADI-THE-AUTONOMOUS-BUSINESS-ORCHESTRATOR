"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface DetailsDrawerProps {
  drawerKey: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function DetailsDrawer({ drawerKey, title, subtitle, children }: DetailsDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get("drawer") === drawerKey;

  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawer");
    params.delete("id");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full border-l border-[var(--border)] bg-[var(--surface)] sm:max-w-[480px]"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-lg font-bold text-[var(--text-primary)]">
            {title}
          </SheetTitle>
          {subtitle && (
            <SheetDescription className="text-sm text-[var(--text-muted)]">
              {subtitle}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-6 flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export function useDrawer(drawerKey: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const open = useCallback(
    (id?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("drawer", drawerKey);
      if (id) params.set("id", id);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, drawerKey]
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawer");
    params.delete("id");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const isOpen = searchParams.get("drawer") === drawerKey;
  const activeId = searchParams.get("id");

  return { open, close, isOpen, activeId };
}
