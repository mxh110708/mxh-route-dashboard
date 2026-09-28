import type { DesktopPriorityState } from "../app/desktop";

// Describe the running policy, never the editable (possibly unsaved) switch.
export function priorityStatus(view: DesktopPriorityState): { label: string; tone: "neutral" | "good" | "warning" } {
  if (!view.running) return { label: "代理未运行", tone: "neutral" };
  if (view.directMode) return { label: "直连模式 · 已暂停", tone: "neutral" };
  if (!view.active) return { label: "监测未启用", tone: "neutral" };
  if (!view.selected) return { label: "等待节点状态", tone: "neutral" };
  if (!view.monitoredSelected) return { label: "当前节点未受监测", tone: "warning" };
  if (view.preferred && view.selected !== view.preferred) return { label: "备用运行 · 等待切回", tone: "warning" };
  return { label: "自动监测中", tone: "good" };
}
