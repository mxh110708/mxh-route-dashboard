import { useEffect, useState } from "react";
import { useLocalDesktopHost, type DesktopHost, type DesktopProxyPorts, type DesktopProxyPortState } from "../app/desktop";
import { useI18n } from "../app/i18n";
import { showError } from "../app/errorStore";
import { Button, Spinner, Switch } from "../components/ui";
import { SettingsPageHeader } from "./SettingsView";
import settingsStyles from "./SettingsView.module.css";
import styles from "./ProxyPortSettingsView.module.css";

type PortType = "mixed" | "socks" | "http";
type Draft = Record<PortType, string> & { socksEnabled: boolean; httpEnabled: boolean };

function draftFromPorts(ports: DesktopProxyPorts): Draft {
  return { mixed: String(ports.mixed.port), socks: String(ports.socks.port), http: String(ports.http.port),
    socksEnabled: ports.socks.enabled, httpEnabled: ports.http.enabled };
}

function settingsFromDraft(draft: Draft, saved: DesktopProxyPorts): DesktopProxyPorts | null {
  const result = {} as DesktopProxyPorts;
  const used = new Set<number>();
  for (const type of ["mixed", "socks", "http"] as const) {
    const enabled = type === "mixed" || (type === "socks" ? draft.socksEnabled : draft.httpEnabled);
    const value = enabled ? Number(draft[type]) : saved[type].port;
    if (enabled && (!/^\d+$/.test(draft[type]) || !Number.isSafeInteger(value) || value < 1 || value > 65535 || used.has(value))) return null;
    if (enabled) used.add(value);
    if (type === "mixed") result.mixed = { enabled: true, port: value };
    else result[type] = { enabled, port: value };
  }
  return result;
}

export function ProxyPortSettingsView() {
  const host = useLocalDesktopHost();
  const { t } = useI18n();
  return (
    <div className="page">
      <SettingsPageHeader title={t("Port Settings")} />
      <div className="settings-stack">
        {host?.profiles.proxyPortState && host.profiles.proxyPortSave ? <ProxyPortSettingsPanel host={host} /> : null}
      </div>
    </div>
  );
}

export function ProxyPortSettingsPanel({ host }: { host: DesktopHost }) {
  const { t } = useI18n();
  const [state, setState] = useState<DesktopProxyPortState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let stale = false;
    host.profiles.proxyPortState!().then((next) => {
      if (stale) return;
      setState(next);
      setDraft(next.ports ? draftFromPorts(next.ports) : null);
      setSaved(false);
      setLoadFailed(false);
    }).catch((error) => {
      if (!stale) { setState(null); setDraft(null); setLoadFailed(true); showError(error); }
    }).finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [host, refresh]);

  const ports = draft && state?.ports ? settingsFromDraft(draft, state.ports) : null;
  const changed = state?.ports && ports ? JSON.stringify(ports) !== JSON.stringify(state.ports) : false;
  const disabled = loading || saving || !!state?.busy;
  const save = () => {
    if (!ports || !state?.profileId || disabled) return;
    setSaving(true);
    host.profiles.proxyPortSave!(ports, state.revision, state.profileId, state.running).then((next) => {
      setState(next);
      setDraft(next.ports ? draftFromPorts(next.ports) : null);
      setSaved(true);
    }).catch(showError).finally(() => setSaving(false));
  };

  if (loading && state === null) return <Spinner />;
  return (
    <>
      {state?.ports && draft ? (
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className={settingsStyles.settingsList}>
            {(["mixed", "socks", "http"] as const).map((type) => {
              const enabled = type === "mixed" || (type === "socks" ? draft.socksEnabled : draft.httpEnabled);
              const label = t(type === "mixed" ? "Mixed Proxy Port" : type === "socks" ? "SOCKS Proxy Port" : "HTTP Proxy Port");
              return (
                <div className="settings-row" key={type}>
                  <div className={settingsStyles.rowText}>
                    <span className="settings-row-label">{label}</span>
                    {type === "mixed" && <span className="hint">{t("Supports HTTP and SOCKS; used by the system proxy.")}</span>}
                  </div>
                  <div className={styles.controls}>
                    <input type="number" className={`input ${styles.portInput}`} min={1} max={65535} step={1} inputMode="numeric"
                      aria-label={label} disabled={disabled || !enabled} value={draft[type]}
                      onChange={(event) => { setDraft({ ...draft, [type]: event.target.value }); setSaved(false); }} />
                    <Switch label={`${label} ${t("Enabled")}`} value={enabled} disabled={disabled || type === "mixed"}
                      onChange={(value) => { setDraft({ ...draft, [type === "socks" ? "socksEnabled" : "httpEnabled"]: value }); setSaved(false); }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="hint">{t("Ports are saved in the current profile: {name}", { name: state.profileName ?? "" })}</p>
          <p className="hint" role="status">{saved ? t("Port settings saved.") : state.running ?
            t("Saving will briefly reload the proxy. If it fails, the previous configuration is restored.") :
            t("Saved ports will take effect when the proxy starts.")}</p>
          {ports === null && <p className={settingsStyles.fieldError}>{t("Use distinct integer ports between 1 and 65535.")}</p>}
          <div className="row-actions">
            <Button disabled={disabled} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>{t("Refresh")}</Button>
            <Button type="submit" variant="primary" disabled={disabled || ports === null || !changed}>
              {saving ? <Spinner /> : state.running ? t("Save and Reload") : t("Save")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="hint">{t(loadFailed ? "Unable to load port settings. Please refresh." : "Select a profile before changing proxy ports.")}</p>
          <div className="row-actions"><Button onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>{t("Refresh")}</Button></div>
        </>
      )}
    </>
  );
}
