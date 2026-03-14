import { requireUser } from "@/lib/auth-server";
import { syncOrdersForUser, type SyncProgressEvent } from "@/lib/ebay-sync";
import { handleApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function formatSSE(event: SyncProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const raw = url.searchParams.get("daysBack");
    const parsed = raw != null ? parseInt(raw, 10) : NaN;
    const daysBack = Number.isFinite(parsed) ? parsed : 90;
    const now = new Date();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const push = (event: SyncProgressEvent) => {
          controller.enqueue(encoder.encode(formatSSE(event)));
        };
        try {
          const { count } = await syncOrdersForUser(user.id, {
            daysBack,
            onProgress: push,
          });
          await db
            .update(users)
            .set({
              lastSyncAt: now,
              lastSyncStatus: "success",
              lastSyncCount: count,
              lastSyncError: null,
              updatedAt: now,
            })
            .where(eq(users.id, user.id));
          push({ type: "done", count });
        } catch (syncErr) {
          const errMessage =
            syncErr instanceof Error ? syncErr.message : String(syncErr);
          await db
            .update(users)
            .set({
              lastSyncAt: now,
              lastSyncStatus: "error",
              lastSyncCount: null,
              lastSyncError: errMessage,
              updatedAt: now,
            })
            .where(eq(users.id, user.id));
          push({ type: "error", message: errMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
