import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TransactionAlert from "./TransactionAlert";

const base = {
  hash: null as string | null,
  error: null as string | null,
  explorerUrl: null as string | null,
  onDismiss: () => {},
};

describe("TransactionAlert", () => {
  it("renders nothing when there is no transaction result", () => {
    const { container } = render(
      <TransactionAlert status={null} {...base} action="contribute" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the claim success message for claim actions", () => {
    render(
      <TransactionAlert
        status="success"
        hash="abc123"
        explorerUrl="https://stellar.expert/explorer/testnet/tx/abc123"
        action="claim"
        {...base}
      />,
    );
    expect(screen.getByText("Funds claimed successfully!")).toBeInTheDocument();
  });

  it("shows the contribution success message for contribute actions", () => {
    render(
      <TransactionAlert
        status="success"
        hash="abc123"
        explorerUrl="https://stellar.expert/explorer/testnet/tx/abc123"
        action="contribute"
        {...base}
      />,
    );
    expect(screen.getByText("Contribution recorded on-chain!")).toBeInTheDocument();
  });

  it("shows failure state with the error message", () => {
    render(<TransactionAlert {...base} status="failure" error="boom" action="contribute" />);
    expect(screen.getByText("Transaction Failed")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
