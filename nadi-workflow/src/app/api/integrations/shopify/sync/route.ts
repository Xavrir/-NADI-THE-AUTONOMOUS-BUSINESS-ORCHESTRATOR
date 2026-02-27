import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

interface ShopifyVariant {
  sku: string;
  price: string;
  inventory_quantity?: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  variants: ShopifyVariant[];
  updated_at: string;
}

export async function POST() {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;

  if (!token || !shop) {
    return NextResponse.json(
      { error: "Shopify credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://${shop}/admin/api/2024-01/products.json?limit=50`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Shopify API error: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const products: ShopifyProduct[] = data.products ?? [];

    let synced = 0;
    let skipped = 0;
    const details: Array<{ sku: string; title: string; action: string }> = [];

    for (const product of products) {
      const variant = product.variants[0];
      if (!variant?.sku) {
        skipped++;
        continue;
      }

      const price = Math.round(parseFloat(variant.price));
      const existing = await prisma.product.findUnique({
        where: { sku: variant.sku },
      });

      if (existing) {
        if (existing.price !== price) {
          await prisma.product.update({
            where: { sku: variant.sku },
            data: { name: product.title, price },
          });
          details.push({ sku: variant.sku, title: product.title, action: "updated" });
        } else {
          details.push({ sku: variant.sku, title: product.title, action: "unchanged" });
        }
      } else {
        await prisma.product.create({
          data: {
            sku: variant.sku,
            name: product.title,
            price,
            cogs: 0,
            reorderPoint: 10,
          },
        });
        details.push({ sku: variant.sku, title: product.title, action: "created" });
      }
      synced++;
    }

    await prisma.connectorConfig.updateMany({
      where: { type: "shopify" },
      data: { lastSyncAt: new Date() },
    });

    await writeAudit({
      eventType: "shopify_sync",
      actor: "system",
      targetType: "connector",
      targetId: "shopify",
      summary: `Shopify sync completed: ${synced} products synced, ${skipped} skipped`,
      afterJson: { synced, skipped, details },
    });

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: products.length,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Shopify sync failed: ${message}` },
      { status: 500 }
    );
  }
}
