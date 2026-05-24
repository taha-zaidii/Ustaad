/**
 * EscrowService — orchestrates the payment lifecycle on top of the
 * payments table and a PaymentProvider strategy.
 *
 * State machine (enforced by both this service and a DB CHECK):
 *
 *      ┌──────────────┐    release()    ┌──────────────┐
 *      │              │ ──────────────► │   released   │
 *      │     held     │                 └──────────────┘
 *      │              │    refund()     ┌──────────────┐
 *      │              │ ──────────────► │   refunded   │
 *      └──────┬───────┘                 └──────────────┘
 *             │ cancel()
 *             ▼
 *      ┌──────────────┐
 *      │  cancelled   │   (terminal; no provider call)
 *      └──────────────┘
 *
 * Every terminal state writes its timestamp so the lifecycle is
 * fully auditable from a single SELECT.
 *
 * SRS: REQ-4.x (payments).
 */
import pool from "@/lib/db";
import {
  getPaymentProvider,
  type PaymentProviderId,
} from "./PaymentProvider";

export type EscrowStatus = "held" | "released" | "refunded" | "cancelled";

export interface EscrowRow {
  id:             string;
  job_id:         string;
  client_id:      string;
  freelancer_id:  string;
  proposal_id:    string | null;
  amount_minor:   number;
  currency:       string;
  provider:       PaymentProviderId;
  provider_ref:   string | null;
  status:         EscrowStatus;
  held_at:        string;
  released_at:    string | null;
  refunded_at:    string | null;
  cancelled_at:   string | null;
  note:           string | null;
  metadata:       Record<string, unknown>;
  created_at:     string;
  updated_at:     string;
}

export interface CreateEscrowInput {
  jobId:         string;
  clientId:      string;
  freelancerId:  string;
  proposalId?:   string | null;
  amountMinor:   number;
  currency?:     string;
  provider:      PaymentProviderId;
  note?:         string;
}

export class EscrowService {
  /** Authorize the hold with the provider and persist the row. */
  async create(input: CreateEscrowInput): Promise<EscrowRow> {
    if (input.amountMinor <= 0) {
      throw new Error("amount_minor must be > 0");
    }
    if (input.clientId === input.freelancerId) {
      throw new Error("client and freelancer must differ");
    }

    const provider = getPaymentProvider(input.provider);

    // Insert FIRST so we have the row id (used as the gateway's
    // idempotency key). If the provider call fails we mark the row
    // cancelled rather than leaving a phantom hold.
    const insert = await pool.query<EscrowRow>(
      `INSERT INTO payments
         (job_id, client_id, freelancer_id, proposal_id,
          amount_minor, currency, provider, status, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'held',$8)
       RETURNING *`,
      [
        input.jobId,
        input.clientId,
        input.freelancerId,
        input.proposalId ?? null,
        input.amountMinor,
        input.currency || "PKR",
        input.provider,
        input.note ?? null,
      ]
    );
    const row = insert.rows[0];

    const res = await provider.hold({
      amountMinor: input.amountMinor,
      currency:    row.currency,
      description: `Ustaad escrow ${row.id} for job ${input.jobId}`,
      clientRef:   row.id,
      metadata:    { job_id: input.jobId },
    });

    if (!res.ok) {
      await pool.query(
        `UPDATE payments
            SET status = 'cancelled',
                cancelled_at = NOW(),
                note = COALESCE(note, '') || ' [hold-failed:' || $2 || ']'
          WHERE id = $1`,
        [row.id, res.error || "unknown"]
      );
      throw new Error(`payment hold failed: ${res.error}`);
    }

    const updated = await pool.query<EscrowRow>(
      `UPDATE payments
          SET provider_ref = $2,
              metadata     = metadata || $3::jsonb
        WHERE id = $1
        RETURNING *`,
      [row.id, res.providerRef ?? null, JSON.stringify({ hold_raw: res.raw ?? null })]
    );
    return updated.rows[0];
  }

  /** Move funds to the freelancer. Only valid from 'held'. */
  async release(id: string, note?: string): Promise<EscrowRow> {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, "released");

    const provider = getPaymentProvider(row.provider);
    const res = await provider.release(row.provider_ref || "", row.amount_minor);
    if (!res.ok) throw new Error(`release failed: ${res.error}`);

    const updated = await pool.query<EscrowRow>(
      `UPDATE payments
          SET status      = 'released',
              released_at = NOW(),
              note        = COALESCE($2, note),
              metadata    = metadata || $3::jsonb
        WHERE id = $1
        RETURNING *`,
      [id, note ?? null, JSON.stringify({ release_raw: res.raw ?? null })]
    );
    return updated.rows[0];
  }

  /** Refund the client. Only valid from 'held'. */
  async refund(id: string, note?: string): Promise<EscrowRow> {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, "refunded");

    const provider = getPaymentProvider(row.provider);
    const res = await provider.refund(row.provider_ref || "", row.amount_minor);
    if (!res.ok) throw new Error(`refund failed: ${res.error}`);

    const updated = await pool.query<EscrowRow>(
      `UPDATE payments
          SET status      = 'refunded',
              refunded_at = NOW(),
              note        = COALESCE($2, note),
              metadata    = metadata || $3::jsonb
        WHERE id = $1
        RETURNING *`,
      [id, note ?? null, JSON.stringify({ refund_raw: res.raw ?? null })]
    );
    return updated.rows[0];
  }

  /** Cancel without provider interaction (only valid on 'held'). */
  async cancel(id: string, note?: string): Promise<EscrowRow> {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, "cancelled");
    const updated = await pool.query<EscrowRow>(
      `UPDATE payments
          SET status       = 'cancelled',
              cancelled_at = NOW(),
              note         = COALESCE($2, note)
        WHERE id = $1
        RETURNING *`,
      [id, note ?? null]
    );
    return updated.rows[0];
  }

  async findById(id: string): Promise<EscrowRow | null> {
    const r = await pool.query<EscrowRow>(
      `SELECT * FROM payments WHERE id = $1`,
      [id]
    );
    return r.rows[0] ?? null;
  }

  // ── Private helpers ────────────────────────────────────────────────────
  private async requireRow(id: string): Promise<EscrowRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`escrow not found: ${id}`);
    return row;
  }

  /**
   * Pure state-machine guard. Exposed as a static so the unit tests
   * can exercise every transition without touching the DB.
   */
  static assertTransition(from: EscrowStatus, to: EscrowStatus): void {
    const allowed: Record<EscrowStatus, EscrowStatus[]> = {
      held:      ["released", "refunded", "cancelled"],
      released:  [],
      refunded:  [],
      cancelled: [],
    };
    if (!allowed[from].includes(to)) {
      throw new Error(`invalid transition: ${from} → ${to}`);
    }
  }
  private assertTransition(from: EscrowStatus, to: EscrowStatus): void {
    EscrowService.assertTransition(from, to);
  }
}
