/**
 * POST /api/payments/escrow
 *
 * Open an escrow on a job. The caller must be the client who owns the
 * job, and the freelancer must be the accepted-proposal counterparty.
 *
 * Body (JSON):
 *   { jobId, freelancerId, proposalId?, amountMinor, currency?, provider, note? }
 *
 * In live mode (STRIPE_SECRET_KEY set + PaymentsProvider=stripe) this
 * creates a Stripe PaymentIntent. Otherwise the MockProvider records
 * the row so the rest of the lifecycle (release / refund) is testable
 * end-to-end without external credentials.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import pool from "@/lib/db";
import { EscrowService } from "@/lib/payments/EscrowService";
import type { PaymentProviderId } from "@/lib/payments/PaymentProvider";

const VALID_PROVIDERS: PaymentProviderId[] = ["stripe", "easypaisa", "jazzcash", "mock"];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      jobId,
      freelancerId,
      proposalId,
      amountMinor,
      currency,
      provider,
      note,
    } = body as Record<string, unknown>;

    if (typeof jobId !== "string" || typeof freelancerId !== "string") {
      return NextResponse.json({ error: "jobId and freelancerId required" }, { status: 400 });
    }
    if (typeof amountMinor !== "number" || amountMinor <= 0) {
      return NextResponse.json({ error: "amountMinor must be > 0" }, { status: 400 });
    }
    if (typeof provider !== "string" || !VALID_PROVIDERS.includes(provider as PaymentProviderId)) {
      return NextResponse.json(
        { error: `provider must be one of ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    // Resolve the caller's profile id and authorize: they must own the job.
    const caller = await pool.query<{ id: string }>(
      `SELECT id FROM profiles WHERE clerk_id = $1`,
      [userId]
    );
    if (caller.rows.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const callerId = caller.rows[0].id;

    const job = await pool.query<{ client_id: string }>(
      `SELECT client_id FROM jobs WHERE id = $1`,
      [jobId]
    );
    if (job.rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.rows[0].client_id !== callerId) {
      return NextResponse.json(
        { error: "Only the job's client can fund an escrow" },
        { status: 403 }
      );
    }

    const service = new EscrowService();
    const row = await service.create({
      jobId,
      clientId:     callerId,
      freelancerId,
      proposalId:   typeof proposalId === "string" ? proposalId : null,
      amountMinor,
      currency:     typeof currency === "string" ? currency : undefined,
      provider:     provider as PaymentProviderId,
      note:         typeof note === "string" ? note : undefined,
    });

    return NextResponse.json({ escrow: row }, { status: 201 });
  } catch (e) {
    console.error("[/api/payments/escrow] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "escrow creation failed" },
      { status: 400 }
    );
  }
}
