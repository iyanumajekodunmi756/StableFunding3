export interface CampaignState {
  totalRaised: number;
  target: number;
  deadlineTimestamp: number;
  deadlinePassed: boolean;
  isClaimed: boolean;
}

export interface ContributionEvent {
  donor: string;
  amount: number;
  totalRaised: number;
  ledger: number;
}

export type TxStatus = "idle" | "awaiting_approval" | "validating" | "success" | "failure";

export type TxAction = "contribute" | "claim";

export interface TxState {
  status: TxStatus;
  action: TxAction;
  hash: string | null;
  error: string | null;
}
