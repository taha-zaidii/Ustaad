/**
 * POST /api/payments/[id]/release
 *
 * Releases a held escrow to the freelancer. Only the client who funded
 * it can release. The state-machine in EscrowService rejects any
 * non-held source state.
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

    const caller = await pool.query<{ id: string }>(
      `SELECT id FROM profiles WHERE clerk_id = $1`,
      [userId]
    );
    if (caller.rows.length === 0 || caller.rows[0].id !== row.client_id) {
      return NextResponse.json({ error: "Only the funding client can release" }, { status: 403 });
    }

    const updated = await service.release(id, body.note);
    return NextResponse.json({ escrow: updated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "release failed" },
      { status: 400 }
    );
  }
}
