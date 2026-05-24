/**
 * POST /api/payments/[id]/refund
 *
 * Refund a held escrow back to the client. Authorized for:
 *   - the funding client (self-refund before work started), or
 *   - an admin (dispute resolution).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { EscrowService } from "@/lib/payments/EscrowService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { note?: string };

    const service = new EscrowService();
    const row = await service.findById(id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const caller = await pool.query<{ id: string; user_type: string }>(
      `SELECT id, user_type FROM profiles WHERE clerk_id = $1`,
      [userId]
    );
    if (caller.rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const me = caller.rows[0];
    if (me.id !== row.client_id && me.user_type !== "admin") {
      return NextResponse.json(
        { error: "Only the funding client or an admin can refund" },
        { status: 403 }
      );
    }

    const updated = await service.refund(id, body.note);
    return NextResponse.json({ escrow: updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "refund failed" },
      { status: 400 }
    );
  }
}
