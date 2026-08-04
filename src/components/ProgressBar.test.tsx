import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders current/target amounts and the percentage", () => {
    render(<ProgressBar current={250} target={1000} />);
    expect(screen.getByText("250 / 1,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("caps the percentage at 100", () => {
    render(<ProgressBar current={2000} target={1000} />);
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("handles a zero target without dividing by zero", () => {
    render(<ProgressBar current={0} target={0} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
