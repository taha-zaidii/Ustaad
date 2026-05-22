/**
 * Unit tests — Observer pattern (lib/patterns/NotificationObserver.ts).
 *
 * Proves:
 *   1. Multiple observers receive every published event.
 *   2. Subscribe returns an unsubscribe handle that actually unsubscribes.
 *   3. One observer throwing does NOT block the others (failure isolation).
 *   4. Observer.notify can be sync or async; publish awaits all of them.
 */
import {
  NotificationSubject,
  type Observer,
  type DomainEvent,
} from "@/lib/patterns/NotificationObserver";

class SpyObserver implements Observer {
  public received: DomainEvent[] = [];
  constructor(public readonly name: string) {}
  notify(e: DomainEvent) {
    this.received.push(e);
  }
}

class ThrowingObserver implements Observer {
  name = "boom";
  notify(): void {
    throw new Error("intentional failure");
  }
}

class AsyncObserver implements Observer {
  name = "async";
  public received: DomainEvent[] = [];
  async notify(e: DomainEvent) {
    await new Promise((r) => setTimeout(r, 5));
    this.received.push(e);
  }
}

const sampleEvent: DomainEvent = {
  type: "job.posted",
  jobId: "job-1",
  clientId: "client-1",
  title: "Test job",
};

describe("NotificationSubject", () => {
  test("notifies every subscribed observer", async () => {
    const subject = new NotificationSubject();
    const a = new SpyObserver("a");
    const b = new SpyObserver("b");
    subject.subscribe(a);
    subject.subscribe(b);

    await subject.publish(sampleEvent);

    expect(a.received).toEqual([sampleEvent]);
    expect(b.received).toEqual([sampleEvent]);
  });

  test("unsubscribe handle removes the observer", async () => {
    const subject = new NotificationSubject();
    const a = new SpyObserver("a");
    const b = new SpyObserver("b");
    subject.subscribe(a);
    const off = subject.subscribe(b);
    off();

    await subject.publish(sampleEvent);

    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(0);
  });

  test("a throwing observer does not block siblings", async () => {
    const subject = new NotificationSubject();
    const a = new SpyObserver("a");
    const c = new SpyObserver("c");
    subject.subscribe(a);
    subject.subscribe(new ThrowingObserver());
    subject.subscribe(c);

    // Should not throw — Promise.allSettled isolates failures.
    await expect(subject.publish(sampleEvent)).resolves.toBeUndefined();

    expect(a.received).toEqual([sampleEvent]);
    expect(c.received).toEqual([sampleEvent]);
  });

  test("awaits async observers (no race; publish resolves after fan-out completes)", async () => {
    const subject = new NotificationSubject();
    const async1 = new AsyncObserver();
    subject.subscribe(async1);

    await subject.publish(sampleEvent);
    expect(async1.received).toHaveLength(1);
  });
});
