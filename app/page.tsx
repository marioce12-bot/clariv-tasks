import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, PenLine, Sparkles } from "lucide-react";

const features = [
  { icon: PenLine, title: "Journal quotidien", text: "Raconte ta journée, même hors ligne. La synchronisation reprend au retour réseau." },
  { icon: Sparkles, title: "Post généré par IA", text: "Hook, corps, CTA, hashtags et signature pseudo à partir de ton style." },
  { icon: BellRing, title: "Publication pilotée", text: "Notification H-30, approbation rapide, publication automatique sur Page Facebook." },
  { icon: BarChart3, title: "Adaptation hebdo", text: "Les Insights Facebook alimentent les recommandations de la semaine suivante." }
];

export default function HomePage() {
  return (
    <main className="shell" style={{ padding: "48px 0" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <strong style={{ fontSize: 20 }}>Clariv-Tasks</strong>
        <Link className="btn" href="/dashboard">Ouvrir l&apos;app</Link>
      </nav>

      <section className="glass" style={{ marginTop: 52, borderRadius: 36, padding: "56px min(7vw, 72px)" }}>
        <span className="badge">PWA installable pour manager ta Page Facebook</span>
        <h1 style={{ maxWidth: 780, fontSize: "clamp(42px, 8vw, 84px)", lineHeight: 0.95, letterSpacing: -3, margin: "22px 0" }}>
          Transforme ton journal en publications Facebook régulières.
        </h1>
        <p className="muted" style={{ maxWidth: 650, fontSize: 19, lineHeight: 1.7 }}>
          Clariv-Tasks analyse ton quotidien, génère un post complet, programme la publication, apprend des statistiques et conserve ton identité de marque.
        </p>
        <Link className="btn primary" href="/dashboard" style={{ marginTop: 24 }}>
          Commencer <ArrowRight size={18} />
        </Link>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 18 }}>
        {features.map((feature) => (
          <article className="glass" key={feature.title} style={{ borderRadius: 26, padding: 22 }}>
            <feature.icon color="#67e8f9" />
            <h2 style={{ marginBottom: 8 }}>{feature.title}</h2>
            <p className="muted" style={{ lineHeight: 1.6 }}>{feature.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
