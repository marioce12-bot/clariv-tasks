"use client";

import { Loader2, PenLine, WandSparkles } from "lucide-react";
import { useState } from "react";
import { saveJournalEntry } from "@/lib/firestore-service";
import type { UserConfig } from "@/lib/types";

export function JournalPanel({ uid, config }: { uid: string; config: UserConfig }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function saveOnly() {
    setSaving(true);
    await saveJournalEntry(uid, text);
    setSaving(false);
    setMessage("Journal sauvegardé. La persistance Firestore gère l'offline quand disponible.");
  }

  async function saveAndGenerate() {
    setGenerating(true);
    try {
      await saveJournalEntry(uid, text);
      setMessage("Journal sauvegarde. La Cloud Function generera le post en pending_review.");
      setText("");
    } catch {
      setMessage("Sauvegarde impossible. Verifie la configuration Firebase et la connexion.");
    }
    setGenerating(false);
  }

  return (
    <section className="glass" style={{ borderRadius: 30, padding: 24 }}>
      <span className="badge"><PenLine size={14} /> Journal quotidien</span>
      <h1 style={{ marginBottom: 8 }}>Raconte ta journée</h1>
      <p className="muted" style={{ lineHeight: 1.6 }}>
        Le texte est sauvegardé dans Firestore avec un identifiant composé de ton utilisateur et de la date, puis transmis au générateur de post.
      </p>
      <textarea className="textarea" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ce que j'ai vécu, appris, observé, ressenti aujourd'hui..." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        <button className="btn" disabled={!text.trim() || saving || generating} onClick={saveOnly}>
          {saving ? <Loader2 size={16} /> : null} Sauvegarder
        </button>
        <button className="btn primary" disabled={!text.trim() || generating} onClick={saveAndGenerate}>
          <WandSparkles size={16} /> Générer le post
        </button>
      </div>
      {message && <p className="muted" style={{ marginBottom: 0 }}>{message}</p>}
    </section>
  );
}
