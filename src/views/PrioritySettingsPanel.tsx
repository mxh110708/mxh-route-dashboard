import { useEffect, useRef, useState } from "react";
import type { DesktopHost, DesktopPrioritySettings, DesktopPriorityState } from "../app/desktop";
import { Button, Dialog, Field, Select } from "../components/ui";
import { movePriorityNode, priorityDraftError } from "./prioritySettingsModel";
import styles from "./PrioritySettingsPanel.module.css";

type NumberKey = Exclude<keyof DesktopPrioritySettings, "enabled" | "group" | "order">;
const numbers: { key: NumberKey; label: string; min: number; max: number; seconds?: boolean }[] = [
  { key: "failureRounds", label: "当前节点连续失败轮数", min: 1, max: 20 },
  { key: "backupSuccessRounds", label: "备用节点连续成功轮数", min: 1, max: 20 },
  { key: "recoverySuccessRounds", label: "首选恢复连续成功轮数", min: 1, max: 20 },
  { key: "recoveryStableMs", label: "切回前稳定时间（秒）", min: 10, max: 3600, seconds: true },
  { key: "failbackCooldownMs", label: "切回冷却时间（秒）", min: 10, max: 3600, seconds: true },
  { key: "probeTimeoutMs", label: "单次探测超时（秒）", min: 1, max: 60, seconds: true },
  { key: "healthyIntervalMs", label: "正常时轮间等待（秒）", min: 5, max: 600, seconds: true },
  { key: "failureIntervalMs", label: "异常时轮间等待（秒）", min: 5, max: 600, seconds: true },
];

export function PrioritySettingsPanel({ host }: { host: DesktopHost }) {
  const api = host.profiles;
  const [view, setView] = useState<DesktopPriorityState | null>(null);
  const [base, setBase] = useState<DesktopPriorityState | null>(null);
  const [draft, setDraft] = useState<DesktopPrioritySettings | null>(null);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const generation = useRef(0);
  const mutating = useRef(false);
  const dragging = useRef<number | null>(null);
  const accept = (value: DesktopPriorityState) => {
    setView(value); setBase(value); setDraft(value.settings); setCustom(value.settings.order.length > 0);
  };
  useEffect(() => {
    if (!api.priorityState) return;
    let stale = false;
    api.priorityState().then(value => { if (!stale) accept(value); }).catch(reason => { if (!stale) setError(String(reason)); });
    const timer = setInterval(() => {
      if (mutating.current) return;
      const stamp = generation.current;
      api.priorityState!().then(value => { if (!stale && stamp === generation.current) setView(value); }).catch(reason => { if (!stale && stamp === generation.current) setError(String(reason)); });
    }, 5000);
    return () => { stale = true; clearInterval(timer); };
  }, [api]);
  if (!api.priorityState || !api.prioritySave || !api.priorityApply) return null;
  const nodes = view?.groups.find(group => group.tag === draft?.group)?.nodes ?? [];
  const conflict = !!view && !!base && (view.revision !== base.revision || view.profileId !== base.profileId);
  const dirty = !!draft && !!base && (JSON.stringify(draft) !== JSON.stringify(base.settings) || custom !== (base.settings.order.length > 0));
  const validation = draft ? priorityDraftError(draft, custom, nodes) : null;
  const order = draft ? custom ? draft.order : nodes : [];
  const change = (patch: Partial<DesktopPrioritySettings>) => { if (draft) setDraft({ ...draft, ...patch }); setMessage(""); };
  const save = async () => {
    if (!draft || !base || validation || conflict) return;
    generation.current++; mutating.current = true; setBusy(true); setError("");
    try { accept(await api.prioritySave!(draft, base.revision, base.profileId)); setMessage("已保存。当前代理未重载；可稍后重载，或下次启动时生效。"); }
    catch (reason) { setError(String(reason)); } finally { mutating.current = false; setBusy(false); }
  };
  const refresh = async () => {
    generation.current++; mutating.current = true; setBusy(true); setError("");
    try { accept(await api.priorityState!()); setMessage(""); } catch (reason) { setError(String(reason)); } finally { mutating.current = false; setBusy(false); }
  };
  const apply = async () => {
    if (!base) return;
    generation.current++; mutating.current = true; setConfirm(false); setBusy(true); setError("");
    try { await api.priorityApply!(base.revision, base.profileId); accept(await api.priorityState!()); setMessage("代理已重新加载，保存的策略已应用。"); }
    catch (reason) { setError(`已保存，但未确认重载完成：${String(reason)}`); } finally { mutating.current = false; setBusy(false); }
  };
  return <section className={styles.panel} aria-labelledby="priority-title">
    <div className={styles.heading}><div><h2 id="priority-title">自动故障切换</h2><p>按优先级选择入口，首选稳定恢复后切回。不以最低延迟排名。</p></div>
      {draft && <button className={draft.enabled ? "switch on" : "switch"} role="switch" aria-label="启用自动故障切换" aria-checked={draft.enabled} disabled={busy} onClick={() => change({ enabled: !draft.enabled })} />}
    </div>
    {error && <p role="alert">{error}</p>}
    {!draft || !view || !base ? <p>正在读取策略配置…</p> : <>
      <div className={styles.status} aria-live="polite">
        <strong>{!view.running ? "代理未运行" : view.directMode ? "Direct 模式下已暂停" : !view.active ? "监测未启用" : view.paused ? "手动选择后已暂停" : "自动监测中"}</strong>
        <span>当前运行节点：{view.selected ?? "—"}</span>
        {view.needsReload && <span>有待重载的策略配置</span>}
        {view.lastSwitch && <span>最近切换：{view.lastSwitch.from} → {view.lastSwitch.to} · {view.lastSwitch.reason} · {new Date(view.lastSwitch.at).toLocaleTimeString()}</span>}
      </div>
      {conflict && <p role="alert">配置文件或当前配置已在其他位置变化，请刷新后再保存。</p>}
      {dirty && <p>有未保存修改，当前运行策略不受影响。</p>}
      {draft.group && !view.groups.some(group => group.tag === draft.group) && <p role="alert">已保存的分组“{draft.group}”不存在或不符合入口代理组结构，请重新选择；不会自动改用其他分组。</p>}
      <Field label="目标入口分组"><Select value={view.groups.some(group => group.tag === draft.group) ? draft.group : ""} placeholder="请选择入口代理组" disabled={busy} options={[
        ...view.groups.map(group => ({ value: group.tag, label: group.tag })),
      ]} onChange={group => { change({ group, order: [] }); setCustom(false); }} /></Field>
      <p>从当前代理配置读取，仅列出成员全部为实际代理节点的分组；业务、汇总、直连和混合分组不参与。{view.groups.length === 0 && "当前配置没有符合条件的入口组。"}</p>
      <label className={styles.mode}><input type="checkbox" checked={custom} disabled={busy} onChange={event => {
        setCustom(event.target.checked); change({ order: event.target.checked ? [...nodes] : [] });
      }} />自定义优先级（否则跟随组内排列）</label>
      <ol className={styles.nodes} aria-label="节点优先级">
        {order.map((tag, index) => <li key={tag} draggable={custom && !busy} onDragStart={event => { dragging.current = index; event.dataTransfer.setData("text/plain", String(index)); }} onDragEnd={() => { dragging.current = null; }}
          onDragOver={event => { if (custom && !busy) event.preventDefault(); }} onDrop={event => {
            event.preventDefault(); if (custom && !busy && dragging.current !== null) change({ order: movePriorityNode(order, dragging.current, index) }); dragging.current = null;
          }}><span className={styles.nodeName}>{index === 0 ? "首选" : `备用 ${index}`} · {tag}</span>
          {custom && <div className={styles.actions}>
            <Button size="small" disabled={busy || index === 0} aria-label={`上移 ${tag}`} onClick={() => change({ order: movePriorityNode(order, index, index - 1) })}>↑</Button>
            <Button size="small" disabled={busy || index === order.length - 1} aria-label={`下移 ${tag}`} onClick={() => change({ order: movePriorityNode(order, index, index + 1) })}>↓</Button>
            <Button size="small" disabled={busy} aria-label={`移除 ${tag}`} onClick={() => change({ order: order.filter(item => item !== tag) })}>移除</Button>
          </div>}
        </li>)}
      </ol>
      {custom && nodes.some(tag => !order.includes(tag)) && <Field label="加入备用节点"><Select value="" placeholder="选择要加入的节点" disabled={busy}
        options={nodes.filter(tag => !order.includes(tag)).map(tag => ({ value: tag, label: tag }))} onChange={tag => change({ order: [...order, tag] })} /></Field>}
      <p>可拖动或使用上下按钮排序。全部失败时不会转为直连；手动选节点会暂停自动切换。</p>
      <details><summary>高级参数</summary><div className={styles.grid}>
        {numbers.map(item => <Field key={item.key} label={`${item.label} · ${item.min}–${item.max}`}><input className="input" type="number" min={item.min} max={item.max} step={1} disabled={busy}
          value={Number.isFinite(draft[item.key]) ? draft[item.key] / (item.seconds ? 1000 : 1) : ""}
          onChange={event => change({ [item.key]: event.target.value === "" ? NaN : Number(event.target.value) * (item.seconds ? 1000 : 1) })} /></Field>)}
      </div></details>
      {validation && <p role="alert">{validation}</p>}
      {message && <p role="status">{message}</p>}
      <div className={styles.actions}>
        <Button variant="primary" disabled={busy || !dirty || conflict || !!validation} onClick={() => void save()}>保存配置</Button>
        <Button disabled={busy || dirty || conflict || !view.running} onClick={() => setConfirm(true)}>重载代理应用</Button>
        <Button disabled={busy} onClick={() => void refresh()}>{dirty ? "放弃未保存修改并刷新" : "刷新"}</Button>
      </div>
      <p className={styles.path}>配置文件：{view.path}</p>
    </>}
    {confirm && <Dialog onClose={() => setConfirm(false)}>
      <h2>重载代理？</h2>
      <p>会短暂中断现有连接，应用已保存的策略，并解除手动选择暂停。</p>
      <div className={styles.actions}><Button onClick={() => setConfirm(false)}>取消</Button><Button variant="primary" onClick={() => void apply()}>确认重载</Button></div>
    </Dialog>}
  </section>;
}
