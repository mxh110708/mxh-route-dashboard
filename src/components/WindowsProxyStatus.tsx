import type { DesktopProfilesState } from "../app/desktop";
import { Button, DataLine } from "./ui";

export function WindowsProxyStatus(props: {
  health: DesktopProfilesState["windowsProxyHealth"];
  busy: boolean;
  reapply?: () => void;
}) {
  if (!props.health || props.health === "unsupported") return null;
  const labels = {
    inactive: "未检测（服务停止或正在切换）",
    healthy: "已开启，地址匹配 MXH Route",
    confirming: "检测到开关关闭，正在复核",
    repairing: "正在恢复系统代理开关",
    foreign: "地址 / PAC / 自动检测已改变，已避让",
    suspended: "反复被关闭或曾被接管，已暂停自动恢复",
    unknown: "读取失败或恢复结果不明；未再次写入，请检查后重启代理",
  };
  return (
    <div role="status" aria-live="polite">
      <DataLine label="Windows 系统代理" value={labels[props.health]} />
      {props.health === "suspended" && props.reapply && (
        <Button disabled={props.busy} onClick={props.reapply}>重新核对并恢复</Button>
      )}
    </div>
  );
}
