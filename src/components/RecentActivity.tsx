"use client";

import type { ContributionEvent } from "@/types";

interface RecentActivityProps {
  events: ContributionEvent[];
}

function shortAddress(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function RecentActivity({ events }: RecentActivityProps) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      <ul className="space-y-2">
        {events.map((e) => (
          <li
            key={`${e.ledger}-${e.donor}-${e.amount}`}
            className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-2.5 transition-colors hover:bg-gray-100"
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="font-mono text-gray-900">{shortAddress(e.donor)}</span>
              <span className="text-gray-400">contributed</span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-indigo-600">
                +{e.amount.toLocaleString()} XLM
              </p>
              <p className="text-xs text-gray-400">Ledger #{e.ledger.toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
