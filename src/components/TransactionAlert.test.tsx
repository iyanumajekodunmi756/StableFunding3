import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TransactionAlert from "./TransactionAlert";

const onDismiss = () => {};
const EXPLORER = "https://stellar.expert/explorer/testnet/tx/abc123";

describe("TransactionAlert", () => {
  it("renders nothing when there is no transaction result", () => {
    const { container } = render(
      <TransactionAlert
        status={null}
        hash={null}
        error={null}
        explorerUrl={null}
        action="contribute"
        onDismiss={onDismiss}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the claim success message for claim actions", () => {
    render(
      <TransactionAlert
        status="success"
        hash="abc123"
        error={null}
        explorerUrl={EXPLORER}
        action="claim"
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText("Funds claimed successfully!")).toBeInTheDocument();
  });

  it("shows the contribution success message for contribute actions", () => {
    render(
      <TransactionAlert
        status="success"
        hash="abc123"
        error={null}
        explorerUrl={EXPLORER}
        action="contribute"
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText("Contribution recorded on-chain!")).toBeInTheDocument();
  });

  it("shows failure state with the error message", () => {
    render(
      <TransactionAlert
        status="failure"
        hash={null}
        error="boom"
        explorerUrl={null}
        action="contribute"
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText("Transaction Failed")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
