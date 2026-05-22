/**
 * Unit tests — Factory pattern (lib/patterns/UserFactory.ts).
 *
 * Proves the factory dispatches to the right subclass and that each
 * subclass enforces the role-correct can*() permission set.
 */
import { UserFactory, type ProfileRow } from "@/lib/patterns/UserFactory";

const baseRow = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: "00000000-0000-0000-0000-000000000001",
  clerk_id: "user_TEST",
  email: "test@example.com",
  full_name: "Test User",
  user_type: "client",
  ...overrides,
});

describe("UserFactory", () => {
  test("creates a Customer for user_type='client' with the right permissions", () => {
    const u = UserFactory.create(baseRow({ user_type: "client" }));
    expect(u.type).toBe("client");
    expect(u.canPostJob()).toBe(true);
    expect(u.canApplyToJob()).toBe(false);
    expect(u.canReview()).toBe(true);
    expect(u.canResolveDisputes()).toBe(false);
  });

  test("creates a Worker for user_type='freelancer' with the right permissions", () => {
    const u = UserFactory.create(baseRow({ user_type: "freelancer" }));
    expect(u.type).toBe("freelancer");
    expect(u.canPostJob()).toBe(false);
    expect(u.canApplyToJob()).toBe(true);
    expect(u.canReview()).toBe(false);
    expect(u.canResolveDisputes()).toBe(false);
  });

  test("creates an Admin for user_type='admin' with dispute-resolution permission", () => {
    const u = UserFactory.create(baseRow({ user_type: "admin" }));
    expect(u.type).toBe("admin");
    expect(u.canPostJob()).toBe(false);
    expect(u.canApplyToJob()).toBe(false);
    expect(u.canReview()).toBe(false);
    expect(u.canResolveDisputes()).toBe(true);
  });

  test("falls back to email when full_name is null (defensive default)", () => {
    const u = UserFactory.create(
      baseRow({ full_name: null, email: "x@y.com" })
    );
    expect(u.fullName).toBe("x@y.com");
  });

  test("throws on unknown user_type — bad seed surfaces loudly", () => {
    expect(() =>
      UserFactory.create(baseRow({ user_type: "ghost" as never }))
    ).toThrow(/unknown user_type/);
  });
});
