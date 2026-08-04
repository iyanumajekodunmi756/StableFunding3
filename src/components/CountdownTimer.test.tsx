import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CountdownTimer from "./CountdownTimer";

describe("CountdownTimer", () => {
  it("shows 'Campaign ended' once the deadline has passed", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    render(<CountdownTimer deadlineTimestamp={past} />);
    expect(screen.getByText("Campaign ended")).toBeInTheDocument();
  });

  it("shows a live countdown while the deadline is in the future", () => {
    const future = Math.floor(Date.now() / 1000) + 86_400;
    render(<CountdownTimer deadlineTimestamp={future} />);
    expect(screen.getByText(/^\d+d \d+h \d+m \d+s$/)).toBeInTheDocument();
  });
});
