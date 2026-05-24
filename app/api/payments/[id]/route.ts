/**
 * GET /api/payments/[id] — fetch a single escrow row.
 *
 * Visible only to the participants (client, freelancer, or admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { EscrowService } from "@/lib/payments/EscrowService";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const row = await new EscrowService().findById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorize: caller's profile must be client_id, freelancer_id, or admin.
  const r = await pool.query<{ id: string; user_type: string }>(
    `SELECT id, user_type FROM profiles WHERE clerk_id = $1`,
    [userId]
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const me = r.rows[0];
  if (
    me.id !== row.client_id &&
    me.id !== row.freelancer_id &&
    me.user_type !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ escrow: row });
}
