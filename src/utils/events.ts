import type { xdr } from "@stellar/stellar-sdk";
import type { ContributionEvent } from "@/types";

export interface RawContractEvent {
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  ledger: number;
  inSuccessfulContractCall: boolean;
}

/**
 * Decodes raw Soroban RPC contract events into contribution entries.
 *
 * FundEvent encoding (new, with #[topic]/#[data] attributes):
 *   topics: [symbol "fund_event", donor]
 *   data:   [amount, total_raised, target]
 *
 * Legacy encoding (no attributes, all fields in data):
 *   topics: [symbol "fund_event"]
 *   data:   [donor, amount, total_raised, target]
 *
 * @param rawEvents   Events returned by `rpc.Server.getEvents`.
 * @param scValToNative  Converter used to decode ScVal values (injected for testability).
 */
export function decodeContributionEvents(
  rawEvents: RawContractEvent[],
  scValToNative: (scval: xdr.ScVal) => unknown,
): ContributionEvent[] {
  const parsed: ContributionEvent[] = [];

  for (const e of rawEvents) {
    if (!e.inSuccessfulContractCall) continue;

    const topics = e.topic.map((t) => scValToNative(t));
    if (topics[0] !== "fund_event") continue;

    const data = scValToNative(e.value) as unknown[];
    const legacy = topics.length === 1; // pre-attribute encoding: donor lives in data

    parsed.push({
      donor: String(legacy ? data[0] : topics[1]),
      amount: Number(legacy ? data[1] : data[0]),
      totalRaised: Number(legacy ? data[2] : data[1]),
      ledger: e.ledger,
    });
  }

  parsed.sort((a, b) => b.ledger - a.ledger);
  return parsed.slice(0, 6);
}
