"use client";

import Link from "next/link";
import { ArrowLeft, Check, Send, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGate } from "./auth-gate";
import { approvePost, subscribePost, updatePost } from "@/lib/firestore-service";
import type { GeneratedPost } from "@/lib/types";

export function PostEditor({ postId }: { postId: string }) {
  return <AuthGate>{() => <PostEditorContent postId={postId} />}</AuthGate>;
}

function PostEditorContent({ postId }: { postId: string }) {
  const [post, setPost] = useState<(GeneratedPost & { id: string }) | null>(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return subscribePost(postId, (loaded) => {
      setPost(loaded);
      setText(loaded?.text ?? "");
    });
  }, [postId]);

  async function save() {
    await updatePost(postId, { text });
    setMessage("Post mis a jour.");
  }

  async function approve() {
    await save();
    await approvePost(postId);
    setMessage("Post approuve. La fonction planifiee publiera a l'heure H.");
  }

  async function publishNow() {
    await save();
    const response = await fetch("/api/facebook/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId })
    });
    setMessage(response.ok ? "Publication Facebook demandee." : "Publication impossible. Verifie token/page Facebook.");
  }

  if (!post) {
    return <main className="shell" style={{ padding: 24 }}>Chargement du post...</main>;
  }

  return (
    <main className="shell" style={{ padding: "4px 0 54px" }}>
      <Link className="btn" href="/dashboard"><ArrowLeft size={16} /> Dashboard</Link>
      <section className="glass" style={{ marginTop: 18, borderRadius: 32, padding: 24 }}>
        <span className="badge">Statut: {post.status}</span>
        <h1>Apercu & edition</h1>
        <textarea className="textarea" value={text} onChange={(event) => setText(event.target.value)} style={{ minHeight: 360 }} />
        {post.media_prompt && (
          <p className="muted" style={{ lineHeight: 1.55 }}><strong>Prompt media:</strong> {post.media_prompt}</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <button className="btn" onClick={save}><Save size={16} /> Enregistrer</button>
          <button className="btn primary" onClick={approve}><Check size={16} /> Approuver</button>
          <button className="btn" onClick={publishNow}><Send size={16} /> Publier maintenant</button>
        </div>
        {message && <p className="muted">{message}</p>}
      </section>
    </main>
  );
}
