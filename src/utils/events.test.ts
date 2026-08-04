import { describe, expect, it } from "vitest";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { decodeContributionEvents } from "./events";
import type { RawContractEvent } from "./events";

const DONOR = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const DONOR2 = "GB3YJ3TQ7JVBQK4FZ6ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5ZQ5Z";

function newEncodingEvent(ledger: number): RawContractEvent {
  return {
    topic: [nativeToScVal("fund_event"), nativeToScVal(DONOR)],
    value: nativeToScVal([100, 500, 1000]),
    ledger,
    inSuccessfulContractCall: true,
  };
}

function legacyEncodingEvent(ledger: number): RawContractEvent {
  return {
    topic: [nativeToScVal("fund_event")],
    value: nativeToScVal([DONOR2, 250, 750, 1000]),
    ledger,
    inSuccessfulContractCall: true,
  };
}

// The deployed contract marks multiple struct fields with #[data], which
// Soroban encodes as a struct ScVal (map) rather than a Vec.
function structEncodingEvent(ledger: number): RawContractEvent {
  return {
    topic: [nativeToScVal("fund_event"), nativeToScVal(DONOR)],
    value: nativeToScVal({ amount: 100, total_raised: 500, target: 1000 }),
    ledger,
    inSuccessfulContractCall: true,
  };
}

describe("decodeContributionEvents", () => {
  it("decodes the new #[topic]/#[data] encoding", () => {
    const events = decodeContributionEvents([newEncodingEvent(12345)], scValToNative);
    expect(events).toEqual([
      { donor: DONOR, amount: 100, totalRaised: 500, ledger: 12345 },
    ]);
  });

  it("decodes the legacy all-in-data encoding", () => {
    const events = decodeContributionEvents([legacyEncodingEvent(12346)], scValToNative);
    expect(events).toEqual([
      { donor: DONOR2, amount: 250, totalRaised: 750, ledger: 12346 },
    ]);
  });

  it("decodes the struct-encoded #[data] emitted by the deployed contract", () => {
    const events = decodeContributionEvents([structEncodingEvent(12347)], scValToNative);
    expect(events).toEqual([
      { donor: DONOR, amount: 100, totalRaised: 500, ledger: 12347 },
    ]);
  });

  it("ignores non-fund events and failed contract calls", () => {
    const failed = { ...newEncodingEvent(1), inSuccessfulContractCall: false };
    const claimEvent: RawContractEvent = {
      topic: [nativeToScVal("claim_event"), nativeToScVal(DONOR)],
      value: nativeToScVal([500, 1000]),
      ledger: 2,
      inSuccessfulContractCall: true,
    };
    const events = decodeContributionEvents([failed, claimEvent], scValToNative);
    expect(events).toEqual([]);
  });

  it("sorts by ledger descending and caps the list at 6", () => {
    const input = [1, 2, 3, 4, 5, 6, 7].map((n) => newEncodingEvent(n * 100));
    const events = decodeContributionEvents(input, scValToNative);
    expect(events).toHaveLength(6);
    expect(events[0].ledger).toBe(700);
    expect(events[5].ledger).toBe(200);
  });
});
