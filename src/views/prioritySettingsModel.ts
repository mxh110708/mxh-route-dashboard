import type { DesktopPrioritySettings } from "../app/desktop";

export function movePriorityNode(order: string[], from: number, to: number): string[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
  const next = [...order]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
}
export function priorityDraftError(settings: DesktopPrioritySettings, custom: boolean, nodes: string[]): string | null {
  if (settings.enabled && !nodes.length) return "当前分组没有可参与切换的代理节点。";
  if (custom && !settings.order.length) return "自定义顺序至少需要一个节点。";
  if (settings.order.some(tag => !nodes.includes(tag))) return "部分节点已不在当前分组，请刷新或移除这些节点。";
  for (const key of ["failureRounds", "backupSuccessRounds", "recoverySuccessRounds"] as const) {
    if (!Number.isInteger(settings[key]) || settings[key] < 1 || settings[key] > 20) return "连续轮数必须为 1–20 的整数。";
  }
  for (const key of ["recoveryStableMs", "failbackCooldownMs", "probeTimeoutMs", "healthyIntervalMs", "failureIntervalMs"] as const) {
    const min = key === "probeTimeoutMs" ? 1000 : key.includes("Interval") ? 5000 : 10000;
    const max = key === "probeTimeoutMs" ? 60000 : key.includes("Interval") ? 600000 : 3600000;
    if (!Number.isInteger(settings[key]) || settings[key] < min || settings[key] > max) return "高级参数超出允许范围，请检查输入框旁的范围说明。";
  }
  return null;
}
