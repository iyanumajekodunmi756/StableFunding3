import { describe, expect, it } from "vitest";
import {
  InsufficientFunds,
  UserRejected,
  WalletNotFound,
  mapTransactionError,
} from "./errors";

describe("mapTransactionError", () => {
  it("maps user-rejection messages to UserRejected", () => {
    const err = mapTransactionError(new Error("The user declined the request"));
    expect(err).toBeInstanceOf(UserRejected);
  });

  it("maps insufficient-funds messages to InsufficientFunds", () => {
    const err = mapTransactionError(new Error("insufficient balance to cover fees"));
    expect(err).toBeInstanceOf(InsufficientFunds);
  });

  it("passes unknown errors through unchanged", () => {
    const original = new Error("Something unexpected happened");
    expect(mapTransactionError(original)).toBe(original);
  });

  it("maps non-Error values to a generic error", () => {
    const err = mapTransactionError("not an error object");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("An unknown error occurred");
  });

  it("defines all three error classes with correct names", () => {
    expect(new WalletNotFound("Freighter").name).toBe("WalletNotFound");
    expect(new UserRejected().name).toBe("UserRejected");
    expect(new InsufficientFunds("1 XLM", "0 XLM").name).toBe("InsufficientFunds");
  });
});
