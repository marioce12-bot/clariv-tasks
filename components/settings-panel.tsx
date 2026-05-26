"use client";

import { BellRing, Facebook, PauseCircle, PlayCircle, Save } from "lucide-react";
import { useState } from "react";
import type { UserConfig } from "@/lib/types";
import { registerPushNotifications } from "@/lib/notifications";

export function SettingsPanel({ uid, config, onUpdate }: { uid: string; config: UserConfig; onUpdate: (config: Partial<UserConfig>) => void }) {
  const [draft, setDraft] = useState<UserConfig>(config);
  const [message, setMessage] = useState("");

  function update<K extends keyof UserConfig>(key: K, value: UserConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function connectFacebook() {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/api/facebook/callback`;
    if (!appId) {
      setMessage("Configure NEXT_PUBLIC_FACEBOOK_APP_ID pour activer OAuth Facebook.");
      return;
    }

    const scope = ["pages_manage_posts", "pages_read_engagement", "pages_show_list", "read_insights"].join(",");
    window.location.href = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${uid}`;
  }

  async function enablePush() {
    const token = await registerPushNotifications(uid);
    setMessage(token ? "Notifications FCM activees." : "Notifications non activees sur ce navigateur.");
  }

  return (
    <aside className="glass" style={{ borderRadius: 30, padding: 22, position: "sticky", top: 16 }}>
      <span className="badge">Parametres</span>
      <h2 style={{ marginBottom: 12 }}>Publication automatique</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span>Pseudo</span>
          <input className="input" value={draft.pseudo ?? ""} onChange={(event) => update("pseudo", event.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span>Heure de publication preferee</span>
          <input className="input" type="time" value={draft.preferred_posting_time ?? "18:30"} onChange={(event) => update("preferred_posting_time", event.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span>Fuseau horaire</span>
          <input className="input" value={draft.timezone ?? ""} onChange={(event) => update("timezone", event.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span>ID Page Facebook</span>
          <input className="input" value={draft.fb_page_id ?? ""} onChange={(event) => update("fb_page_id", event.target.value)} placeholder="123456789" />
        </label>

        <button className="btn primary" onClick={() => onUpdate(draft)}><Save size={16} /> Enregistrer</button>
        <button className="btn" onClick={connectFacebook}><Facebook size={16} /> Connecter Facebook</button>
        <button className="btn" onClick={enablePush}><BellRing size={16} /> Activer FCM</button>
        <button className={draft.paused ? "btn primary" : "btn danger"} onClick={() => onUpdate({ paused: !draft.paused })}>
          {draft.paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />} {draft.paused ? "Reprendre" : "Pause publications"}
        </button>
      </div>

      {message && <p className="muted" style={{ lineHeight: 1.55 }}>{message}</p>}
    </aside>
  );
}
