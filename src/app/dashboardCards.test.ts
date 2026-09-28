import { describe, expect, it, vi } from "vitest";
import { loadStoredJson } from "../lib/storage";
import { dashboardCardIds, groupCardRows, loadDashboardCardsConfig, toggleCard } from "./dashboardCards";
vi.mock("../lib/storage", () => ({ loadStoredJson: vi.fn(), removeStoredValue: vi.fn(), saveStoredJson: vi.fn() }));

describe("automatic failover overview card", () => {
  it("is desktop-only and takes a full row", () => {
    expect(dashboardCardIds(true)).toContain("priorityFailover");
    expect(dashboardCardIds(false)).not.toContain("priorityFailover");
    expect(groupCardRows(["systemProxy", "priorityFailover", "clashMode"])).toEqual([["systemProxy"], ["priorityFailover"], ["clashMode"]]);
  });
  it("adds the entry to an old saved layout without enabling other hidden cards", () => {
    vi.mocked(loadStoredJson).mockReturnValue({ enabled: ["systemProxy"], order: ["systemProxy", "status", "profile"] });
    const config = loadDashboardCardsConfig(true);
    expect(config.enabled).toContain("priorityFailover");
    expect(config.enabled).not.toContain("status");
    expect(config.order.slice(0, 3)).toEqual(["systemProxy", "status", "profile"]);
  });
  it("respects hiding the entry on later loads", () => {
    vi.mocked(loadStoredJson).mockReturnValue(null);
    const hidden = toggleCard(loadDashboardCardsConfig(true), "priorityFailover");
    vi.mocked(loadStoredJson).mockReturnValue(hidden);
    expect(loadDashboardCardsConfig(true).enabled).not.toContain("priorityFailover");
  });
});
