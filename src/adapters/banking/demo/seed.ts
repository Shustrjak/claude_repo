import seedJson from "./seed.json";
import { isDemoSeed, type DemoSeed } from "./state";

function parseSeed(value: unknown): DemoSeed {
  if (!isDemoSeed(value)) {
    throw new Error("DemoAdapter seed.json does not match the demo seed shape");
  }
  return value;
}

/**
 * Deterministic demo seed. Demo values only: the language list does not answer Q-17,
 * and the demo MPIN (1234) and demo codes (123456) are documented test credentials.
 */
export const demoSeed: DemoSeed = parseSeed(seedJson);
