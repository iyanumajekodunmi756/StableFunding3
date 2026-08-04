"use client";

import type { CampaignState, TxAction, TxStatus } from "@/types";

interface ClaimFundsProps {
  campaign: CampaignState;
  txStatus: TxStatus;
  txAction: TxAction;
  onClaim: () => Promise<void>;
}

const PENDING_LABELS: Record<TxStatus, string | null> = {
  idle: null,
  awaiting_approval: "Awaiting Wallet Approval...",
  validating: "Validating Block Ledger...",
  success: null,
  failure: null,
};

export default function ClaimFunds({ campaign, txStatus, txAction, onClaim }: ClaimFundsProps) {
  const isPending = txStatus === "awaiting_approval" || txStatus === "validating";
  const claimPending = isPending && txAction === "claim";
  const claimable = campaign.deadlinePassed && campaign.totalRaised >= campaign.target;
  const pendingLabel = claimPending ? PENDING_LABELS[txStatus] : null;

  const statusText = campaign.isClaimed
    ? "Funds have already been claimed and the campaign is closed."
    : campaign.deadlinePassed
      ? campaign.totalRaised >= campaign.target
        ? "The campaign succeeded. Claim the raised funds to close it out."
        : "The campaign ended, but the target was not reached, so funds cannot be claimed."
      : "Claiming opens once the campaign deadline passes.";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Claim Funds</h3>
          <p className="mt-1 text-sm text-gray-500">{statusText}</p>
        </div>

        {campaign.isClaimed ? (
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Claimed
          </span>
        ) : (
          <button
            onClick={onClaim}
            disabled={!claimable || isPending}
            className={`flex-shrink-0 rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              claimable
                ? "bg-green-600 text-white hover:bg-green-700"
                : "border border-gray-300 bg-gray-50 text-gray-400"
            }`}
          >
            {claimPending ? "Claiming..." : claimable ? "Claim Funds" : "Unavailable"}
          </button>
        )}
      </div>

      {claimPending && pendingLabel && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {pendingLabel}
        </div>
      )}
    </div>
  );
}
