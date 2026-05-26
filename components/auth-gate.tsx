"use client";

import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, enableOfflinePersistence, googleProvider } from "@/lib/firebase";

export function AuthGate({ children }: { children: (user: User) => React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void enableOfflinePersistence();
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <main className="shell" style={{ padding: 32 }}>Chargement...</main>;
  }

  if (!user) {
    return (
      <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <section className="glass" style={{ width: "min(560px, 100%)", borderRadius: 34, padding: 34 }}>
          <span className="badge">Connexion requise</span>
          <h1 style={{ fontSize: 42, lineHeight: 1, marginBottom: 12 }}>Pilote tes publications Facebook depuis ton journal.</h1>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Connecte-toi avec Google pour activer Firestore, l&apos;onboarding pseudo, les brouillons IA, les notifications et la planification.
          </p>
          <button className="btn primary" onClick={() => signInWithPopup(auth, googleProvider)} style={{ marginTop: 18 }}>
            <LogIn size={18} /> Connexion Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <header className="shell" style={{ padding: "20px 0", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
        <strong>Clariv-Tasks</strong>
        <button className="btn" onClick={() => signOut(auth)}>
          <LogOut size={16} /> <span className="desktop-only">Déconnexion</span>
        </button>
      </header>
      {children(user)}
    </>
  );
}
