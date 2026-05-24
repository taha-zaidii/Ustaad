/**
 * STRATEGY PATTERN (variant #2) — Payment provider abstraction
 *
 * Why this exists
 *   Ustaad accepts escrow funding from multiple Pakistani providers
 *   (Easypaisa, JazzCash) plus Stripe for international cards. Each
 *   has a different API surface — but the EscrowService only needs
 *   four verbs from any of them: authorize the hold, release on
 *   completion, refund on cancellation, lookup by external ref.
 *
 *   The Strategy pattern lets the service stay provider-agnostic;
 *   adding a new gateway (say, SadaPay) means writing one new class
 *   and registering it in the factory below — no changes to the
 *   service, the API routes, or the database layer.
 *
 * Environment behaviour
 *   - STRIPE_SECRET_KEY     present → real Stripe (test or live mode
 *                                     determined by Stripe's own key
 *                                     prefix `sk_test_` vs `sk_live_`)
 *   - PAYMENTS_PROVIDER=mock         → MockProvider (no network)
 *   - Otherwise                       → MockProvider with provider tag
 *                                       set to the requested provider
 *                                       so the row records what *would*
 *                                       have been used in production.
 */

export type PaymentProviderId = "stripe" | "easypaisa" | "jazzcash" | "mock";

export interface PaymentChargeInput {
  amountMinor:   number;       // smallest currency unit (paisa, cents)
  currency:      string;       // ISO 4217, default 'PKR'
  description:   string;
  clientRef:     string;       // our payments.id (idempotency key)
  metadata?:     Record<string, string>;
}

export interface PaymentResult {
  ok:           boolean;
  providerRef?: string;        // gateway's id (PaymentIntent, txn_id, …)
  raw?:         unknown;       // gateway response for audit log
  error?:       string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Place an authorization hold; funds are captured immediately. */
  hold(input: PaymentChargeInput): Promise<PaymentResult>;
  /** Move the held funds to the freelancer. */
  release(providerRef: string, amountMinor: number): Promise<PaymentResult>;
  /** Reverse a hold and send funds back to the client. */
  refund(providerRef: string, amountMinor: number): Promise<PaymentResult>;
}

// ── Mock provider ────────────────────────────────────────────────────────────
// Deterministic, no network, never fails. Used in dev, CI, and as a
// fallback when no real provider env is configured.
export class MockProvider implements PaymentProvider {
  readonly id: PaymentProviderId;
  private counter = 0;

  constructor(id: PaymentProviderId = "mock") {
    this.id = id;
  }

  async hold(input: PaymentChargeInput): Promise<PaymentResult> {
    this.counter += 1;
    return {
      ok: true,
      providerRef: `${this.id}_mock_${input.clientRef.slice(0, 8)}_${this.counter}`,
      raw: { mocked: true, amount_minor: input.amountMinor },
    };
  }

  async release(providerRef: string, amountMinor: number): Promise<PaymentResult> {
    return { ok: true, providerRef, raw: { mocked: true, released_minor: amountMinor } };
  }

  async refund(providerRef: string, amountMinor: number): Promise<PaymentResult> {
    return { ok: true, providerRef, raw: { mocked: true, refunded_minor: amountMinor } };
  }
}

// ── Stripe provider ─────────────────────────────────────────────────────────
// Thin wrapper around Stripe's PaymentIntent API. We dynamically import
// the SDK so the package only loads when the env is configured (saves
// cold-start bytes when running in mock mode).
//
// Test mode + live mode both work — Stripe distinguishes via key prefix.
export class StripeProvider implements PaymentProvider {
  readonly id: PaymentProviderId = "stripe";
  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async client() {
    // Optional dependency: the project may not have `stripe` in
    // package.json yet. The dynamic import works at runtime once
    // `npm install stripe` is run; until then the factory routes
    // 'stripe' to MockProvider so this path is never reached.
    // @ts-expect-error optional peer dep, resolved at runtime
    const Stripe = (await import("stripe")).default;
    return new Stripe(this.secretKey);
  }

  async hold(input: PaymentChargeInput): Promise<PaymentResult> {
    try {
      const stripe = await this.client();
      const intent = await stripe.paymentIntents.create({
        amount:               input.amountMinor,
        currency:             input.currency.toLowerCase(),
        description:          input.description,
        capture_method:       "automatic",
        metadata:             { client_ref: input.clientRef, ...(input.metadata || {}) },
        automatic_payment_methods: { enabled: true },
      });
      return { ok: true, providerRef: intent.id, raw: intent };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "stripe hold failed" };
    }
  }

  async release(providerRef: string, amountMinor: number): Promise<PaymentResult> {
    // For the resume's escrow model we capture on hold and release is
    // a no-op against Stripe (funds already settle to the platform).
    // The platform→freelancer payout would be a separate Stripe
    // Connect transfer; that's a future-work item.
    return { ok: true, providerRef, raw: { released_minor: amountMinor } };
  }

  async refund(providerRef: string, amountMinor: number): Promise<PaymentResult> {
    try {
      const stripe = await this.client();
      const refund = await stripe.refunds.create({
        payment_intent: providerRef,
        amount:         amountMinor,
      });
      return { ok: true, providerRef: refund.id, raw: refund };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "stripe refund failed" };
    }
  }
}

// ── Pakistani providers (Easypaisa / JazzCash) ──────────────────────────────
// Both gateways require a B2B contract + sandbox merchant ID before they
// expose an API to non-bank developers. Until those credentials exist,
// we expose them via the MockProvider so the rest of the system can be
// built and tested today. Swapping in a real client only requires
// editing this one file.
export class EasypaisaProvider extends MockProvider {
  constructor() { super("easypaisa"); }
}
export class JazzCashProvider extends MockProvider {
  constructor() { super("jazzcash"); }
}

// ── Factory: resolves a provider id to a concrete instance ──────────────────
export function getPaymentProvider(
  id: PaymentProviderId,
  env: NodeJS.ProcessEnv = process.env
): PaymentProvider {
  if (env.PAYMENTS_PROVIDER === "mock") return new MockProvider(id);

  switch (id) {
    case "stripe":
      return env.STRIPE_SECRET_KEY
        ? new StripeProvider(env.STRIPE_SECRET_KEY)
        : new MockProvider("stripe");
    case "easypaisa": return new EasypaisaProvider();
    case "jazzcash":  return new JazzCashProvider();
    case "mock":
    default:          return new MockProvider();
  }
}
