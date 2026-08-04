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
 * NOTE: when the contract marks several struct fields with #[data], Soroban
 * encodes them as a struct ScVal (map), e.g. `{ amount, total_raised,
 * target }` — the shape the deployed contract emits. Both the Vec and the
 * struct shape are handled below.
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

    const data = scValToNative(e.value);
    const legacy = topics.length === 1; // pre-attribute encoding: donor lives in data

    let donor: string;
    let amount: number;
    let totalRaised: number;

    if (Array.isArray(data)) {
      // Vec encoding: legacy [donor, amount, total_raised, target] or new [amount, total_raised, target]
      donor = String(legacy ? data[0] : topics[1]);
      amount = toFinite(legacy ? data[1] : data[0]);
      totalRaised = toFinite(legacy ? data[2] : data[1]);
    } else {
      // Struct encoding: new #[data] fields on a struct → { amount, total_raised, target }
      const record = data as Record<string, unknown>;
      donor = String(topics[1]);
      amount = toFinite(record.amount);
      totalRaised = toFinite(record.total_raised);
    }

    parsed.push({ donor, amount, totalRaised, ledger: e.ledger });
  }

  parsed.sort((a, b) => b.ledger - a.ledger);
  return parsed.slice(0, 6);
}

function toFinite(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
