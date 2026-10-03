import { DemoAdapter } from "./demo/DemoAdapter";
import { createMemoryStorage } from "./demo/storage";
import { NullAdapter } from "./NullAdapter";
import { bankingAdapterContract } from "./testing/bankingAdapterContract";

const DEMO_MPIN = "1234";

bankingAdapterContract({
  name: "NullAdapter",
  create: async () => new NullAdapter(),
  mpin: DEMO_MPIN,
});

bankingAdapterContract({
  name: "DemoAdapter",
  create: async () => {
    const adapter = new DemoAdapter({ storage: createMemoryStorage(), now: () => new Date("2026-10-01T12:00:00Z") });
    await adapter.login({ method: "mpin", mpin: DEMO_MPIN });
    return adapter;
  },
  mpin: DEMO_MPIN,
});
