"use client";

export class WalletNotFound extends Error {
  public readonly walletName: string;

  constructor(walletName: string) {
    super(`${walletName} extension is not installed or detected`);
    this.name = "WalletNotFound";
    this.walletName = walletName;
  }
}

export class UserRejected extends Error {
  public readonly code: number;

  constructor(message?: string) {
    super(message ?? "User rejected the transaction signature request");
    this.name = "UserRejected";
    this.code = 4001;
  }
}

export class InsufficientFunds extends Error {
  public readonly required: string;
  public readonly available: string;

  constructor(required: string, available: string) {
    super(`Insufficient XLM balance. Required: ${required}, Available: ${available}`);
    this.name = "InsufficientFunds";
    this.required = required;
    this.available = available;
  }
}

export function mapTransactionError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (
      msg.includes("user declined") ||
      msg.includes("cancel") ||
      msg.includes("reject") ||
      msg.includes("userrejected")
    ) {
      return new UserRejected();
    }

    if (
      msg.includes("insufficient") ||
      msg.includes("budget") ||
      msg.includes("fee") ||
      msg.includes("could not be funded")
    ) {
      return new InsufficientFunds("~0.01 XLM", "0 XLM");
    }

    return err;
  }

  return new Error("An unknown error occurred");
}
