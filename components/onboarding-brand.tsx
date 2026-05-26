"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { UserConfig } from "@/lib/types";

const questions = [
  ["domain", "Ton domaine / ce que tu partages"],
  ["perception", "Comment tu veux être perçu"],
  ["descriptors", "3 mots qui te décrivent"],
  ["style", "Ton style"],
  ["inspiration", "Un influenceur que tu admires"]
] as const;

export function OnboardingBrand({ uid, onComplete }: { uid: string; onComplete: (config: Partial<UserConfig>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<Array<{ pseudo: string; reason: string }>>([]);
  const [loading, setLoading] = useState(false);

  async function generatePseudos() {
    setLoading(true);
    const response = await fetch("/api/brand/pseudos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, answers })
    });
    const data = (await response.json()) as { proposals?: Array<{ pseudo: string; reason: string }> };
    setProposals(data.proposals ?? []);
    setLoading(false);
  }

  function choose(pseudo: string) {
    onComplete({
      pseudo,
      brand_voice: answers.perception,
      style_tone: answers.style,
      brand_identity: { ...answers, pseudo }
    });
  }

  return (
    <section className="glass" style={{ borderRadius: 34, padding: "32px min(6vw, 48px)" }}>
      <span className="badge"><Sparkles size={14} /> Identité de marque</span>
      <h1 style={{ fontSize: "clamp(32px, 6vw, 58px)", lineHeight: 1, marginBottom: 10 }}>Créons ton pseudo public.</h1>
      <p className="muted" style={{ lineHeight: 1.7, maxWidth: 700 }}>
        Ces réponses alimentent les prompts IA et la signature de chaque publication.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 24 }}>
        {questions.map(([key, label]) => (
          <label key={key} style={{ display: "grid", gap: 8 }}>
            <span>{label}</span>
            <input className="input" value={answers[key] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [key]: event.target.value }))} />
          </label>
        ))}
      </div>

      <button className="btn primary" disabled={loading || questions.some(([key]) => !answers[key])} onClick={generatePseudos} style={{ marginTop: 18 }}>
        Générer 5 propositions
      </button>

      {proposals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 22 }}>
          {proposals.map((item) => (
            <article className="glass" key={item.pseudo} style={{ borderRadius: 22, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>{item.pseudo}</h3>
              <p className="muted" style={{ minHeight: 68, lineHeight: 1.55 }}>{item.reason}</p>
              <button className="btn primary" onClick={() => choose(item.pseudo)}>Choisir</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
