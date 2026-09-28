import { describe, expect, it } from "vitest";
import { priorityOverviewPath, priorityReturnPage } from "./priorityNavigation";

describe("priority detail return destination", () => {
  it("preserves the overview origin in the URL, including after refresh", () => {
    const query = new URLSearchParams(priorityOverviewPath.split("?")[1]);
    expect(priorityReturnPage(query)).toBe("overview");
    expect(priorityReturnPage(new URLSearchParams(query.toString()))).toBe("overview");
  });
  it.each(["", "from=settings", "from=https://example.com", "from=unknown"])(
    "defaults settings and unrecognized origins safely: %s", (query) => {
      expect(priorityReturnPage(new URLSearchParams(query))).toBe("settings");
    },
  );
});
