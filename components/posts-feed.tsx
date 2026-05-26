"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ExternalLink, FileText } from "lucide-react";
import type { GeneratedPost } from "@/lib/types";

const statusLabels: Record<GeneratedPost["status"], string> = {
  pending_review: "A valider",
  approved: "Approuve",
  published: "Publie",
  failed: "Echec"
};

export function PostsFeed({ posts }: { posts: Array<GeneratedPost & { id: string }> }) {
  return (
    <section className="glass" style={{ borderRadius: 30, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <span className="badge"><FileText size={14} /> Feed posts</span>
          <h2 style={{ marginBottom: 4 }}>Apercus et publications</h2>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="muted" style={{ lineHeight: 1.6 }}>Aucun post pour le moment. Raconte ta journee puis genere un brouillon.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {posts.map((post) => (
            <article key={post.id} style={{ border: "1px solid var(--border)", borderRadius: 22, padding: 16, background: "rgba(4, 7, 22, 0.34)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <span className="badge"><CheckCircle2 size={13} /> {statusLabels[post.status]}</span>
                <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <CalendarClock size={14} /> {post.scheduled_at?.toDate?.().toLocaleString("fr-FR") ?? "Non planifie"}
                </span>
              </div>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{post.text.slice(0, 420)}{post.text.length > 420 ? "..." : ""}</p>
              {post.error && <p style={{ color: "#fecdd3" }}>{post.error}</p>}
              <Link className="btn" href={`/post/${post.id}`}>
                Modifier / approuver <ExternalLink size={15} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
