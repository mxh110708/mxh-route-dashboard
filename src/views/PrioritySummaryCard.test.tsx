import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PrioritySummaryContent } from "./PrioritySummaryCard";

describe("priority overview entry", () => {
  it("is a keyboard accessible details entry, not an immediate policy switch", () => {
    const html = renderToStaticMarkup(<PrioritySummaryContent view={null} failed={false} onOpen={() => {}} />);
    expect(html).toContain('type="button"');
    expect(html).toContain("查看详情与设置");
    expect(html).toContain("正在读取");
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain("自动监测中");
  });
  it("does not retain a healthy display on read failure", () => {
    const html = renderToStaticMarkup(<PrioritySummaryContent view={null} failed onOpen={() => {}} />);
    expect(html).toContain("状态读取失败");
    expect(html).not.toContain("自动监测中");
    expect(html).not.toContain("尚未选择入口组");
  });
});
