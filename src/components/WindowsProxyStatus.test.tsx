import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WindowsProxyStatus } from "./WindowsProxyStatus";

describe("Windows system proxy status", () => {
  it("does not invent actual state for older or unsupported hosts", () => {
    expect(renderToStaticMarkup(<WindowsProxyStatus health={undefined} busy={false} />)).toBe("");
    expect(renderToStaticMarkup(<WindowsProxyStatus health="unsupported" busy={false} />)).toBe("");
  });
  it.each(["healthy", "confirming", "repairing", "foreign", "unknown", "inactive"] as const)(
    "%s is visible without offering an unsafe reapply button", health => {
      const html = renderToStaticMarkup(<WindowsProxyStatus health={health} busy={false} reapply={() => {}} />);
      expect(html).toContain("Windows 系统代理");
      expect(html).toContain('role="status"');
      expect(html).not.toContain("<button");
    },
  );
  it("offers explicit guarded recovery only when suspended", () => {
    const html = renderToStaticMarkup(<WindowsProxyStatus health="suspended" busy reapply={() => {}} />);
    expect(html).toContain("重新核对并恢复");
    expect(html).toContain("disabled");
  });
});
