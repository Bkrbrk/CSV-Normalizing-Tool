import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Workspace } from "./Workspace";

const nav = () => screen.getAllByRole("navigation", { name: "Workspace" })[0]!;
const metric = (label: string) =>
  screen.getByText(label, { selector: "span.uppercase" }).closest(".panel")!.querySelector(".tabular")!.textContent;

describe("DataPilot workspace flow", () => {
  it("loads the demo, cleans, shows real metrics, undoes and resets", async () => {
    render(<Workspace />);
    fireEvent.click(screen.getByRole("button", { name: "Load demo" }));

    expect(metric("Rows")).toBe("64");
    expect(metric("Duplicate rows")).not.toBe("0");

    fireEvent.click(within(nav()).getByRole("button", { name: "Clean" }));
    const dedupe = screen.getByRole("button", { name: /remove duplicates · select columns first/i });
    expect(dedupe).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.click(screen.getByRole("button", { name: /^trim · 12 columns/i }));
    fireEvent.click(screen.getByRole("button", { name: /^remove duplicates · 12 columns/i }));
    expect(screen.getByRole("heading", { name: /last change: remove duplicates/i })).toBeInTheDocument();

    fireEvent.click(within(nav()).getByRole("button", { name: "Overview" }));
    const rowsAfter = Number(metric("Rows"));
    expect(rowsAfter).toBeLessThan(64);
    expect(metric("Duplicate rows")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(Number(metric("Rows"))).toBe(64);

    // History reflects remaining trim step; reset restores original
    fireEvent.click(within(nav()).getByRole("button", { name: /history/i }));
    expect(screen.getByText("Trim whitespace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reset to original/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^reset$/i }));
    expect(await screen.findByText("No cleaning steps yet")).toBeInTheDocument();
  });

  it("blocks mean fill on a text column with an explanation", () => {
    render(<Workspace />);
    fireEvent.click(screen.getByRole("button", { name: "Load demo" }));
    fireEvent.click(within(nav()).getByRole("button", { name: "Clean" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /region/i }));
    fireEvent.click(screen.getByRole("radio", { name: /column mean/i }));
    expect(screen.getByText(/"region" is text, not numeric/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^fill · 1 column/i })).toBeDisabled();
  });
});
