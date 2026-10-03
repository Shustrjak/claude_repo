import seedJson from "./seed.json";
import { isDemoSeed, type DemoSeed } from "./state";

function parseSeed(value: unknown): DemoSeed {
  if (!isDemoSeed(value)) {
    throw new Error("DemoAdapter seed.json does not match the demo seed shape");
  }
  return value;
}

/**
 * Deterministic demo seed. Its languages, ru and en, are the v1 interface languages (D-49);
 * the demo MPIN (1234) and demo codes (123456) are documented test credentials.
 */
export const demoSeed: DemoSeed = parseSeed(seedJson);
