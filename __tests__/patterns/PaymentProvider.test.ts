/**
 * Unit tests — PaymentProvider Strategy + EscrowService state machine.
 *
 * Proves:
 *   1. The factory routes to MockProvider when no real provider env
 *      is configured (the default for dev / CI).
 *   2. MockProvider hold/release/refund are deterministic and return
 *      a non-empty providerRef.
 *   3. EscrowService.assertTransition enforces a single-step lifecycle:
 *      held → {released, refunded, cancelled} and nothing else.
 *   4. Terminal states (released, refunded, cancelled) cannot transition
 *      anywhere — the only way out is to start a new escrow.
 */
import {
  getPaymentProvider,
  MockProvider,
  StripeProvider,
  EasypaisaProvider,
  JazzCashProvider,
} from "@/lib/payments/PaymentProvider";

// The state-machine test imports EscrowService for its static method,
// which (transitively) imports @/lib/db. Stub it so the test stays
// pure-unit.
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));
import { EscrowService } from "@/lib/payments/EscrowService";

describe("PaymentProvider (Strategy)", () => {
  it("routes to MockProvider when STRIPE_SECRET_KEY is unset", () => {
    const p = getPaymentProvider("stripe", {} as NodeJS.ProcessEnv);
    expect(p).toBeInstanceOf(MockProvider);
    expect(p.id).toBe("stripe");
  });

  it("routes to StripeProvider when STRIPE_SECRET_KEY is set", () => {
    const p = getPaymentProvider("stripe", {
      STRIPE_SECRET_KEY: "sk_test_dummy",
    } as unknown as NodeJS.ProcessEnv);
    expect(p).toBeInstanceOf(StripeProvider);
  });

  it("routes easypaisa to EasypaisaProvider", () => {
    const p = getPaymentProvider("easypaisa", {} as NodeJS.ProcessEnv);
    expect(p).toBeInstanceOf(EasypaisaProvider);
    expect(p.id).toBe("easypaisa");
  });

  it("routes jazzcash to JazzCashProvider", () => {
    const p = getPaymentProvider("jazzcash", {} as NodeJS.ProcessEnv);
    expect(p).toBeInstanceOf(JazzCashProvider);
    expect(p.id).toBe("jazzcash");
  });

  it("PAYMENTS_PROVIDER=mock forces MockProvider regardless of id", () => {
    const p = getPaymentProvider("stripe", {
      PAYMENTS_PROVIDER: "mock",
      STRIPE_SECRET_KEY: "sk_test_dummy",
    } as unknown as NodeJS.ProcessEnv);
    expect(p).toBeInstanceOf(MockProvider);
  });

  it("MockProvider.hold returns a non-empty providerRef", async () => {
    const p = new MockProvider("mock");
    const r = await p.hold({
      amountMinor: 1500_00,
      currency:    "PKR",
      description: "test",
      clientRef:   "test-12345678",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.providerRef).toBe("string");
    expect(r.providerRef!.length).toBeGreaterThan(0);
  });

  it("MockProvider.release and refund pass through deterministically", async () => {
    const p = new MockProvider("easypaisa");
    expect((await p.release("ref-1", 1000)).ok).toBe(true);
    expect((await p.refund("ref-1", 1000)).ok).toBe(true);
  });
});

describe("EscrowService state machine", () => {
  it("allows held → released", () => {
    expect(() => EscrowService.assertTransition("held", "released")).not.toThrow();
  });
  it("allows held → refunded", () => {
    expect(() => EscrowService.assertTransition("held", "refunded")).not.toThrow();
  });
  it("allows held → cancelled", () => {
    expect(() => EscrowService.assertTransition("held", "cancelled")).not.toThrow();
  });

  it("rejects released → anything", () => {
    expect(() => EscrowService.assertTransition("released", "refunded")).toThrow(/invalid transition/);
    expect(() => EscrowService.assertTransition("released", "cancelled")).toThrow(/invalid transition/);
    expect(() => EscrowService.assertTransition("released", "held")).toThrow(/invalid transition/);
  });

  it("rejects refunded → anything", () => {
    expect(() => EscrowService.assertTransition("refunded", "released")).toThrow(/invalid transition/);
    expect(() => EscrowService.assertTransition("refunded", "cancelled")).toThrow(/invalid transition/);
  });

  it("rejects cancelled → anything", () => {
    expect(() => EscrowService.assertTransition("cancelled", "released")).toThrow(/invalid transition/);
  });

  it("rejects same-state transition", () => {
    expect(() => EscrowService.assertTransition("held", "held")).toThrow(/invalid transition/);
  });
});
