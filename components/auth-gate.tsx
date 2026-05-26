"use client";

import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { LogIn, LogOut } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { auth, enableOfflinePersistence, googleProvider } from "@/lib/firebase";

export function AuthGate({ children }: { children: (user: User) => React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setAuthError("");
      setSubmitting(true);

      try {
        if (authMode === "signup") {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (error) {
        setAuthError(getAuthErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <section className="glass" style={{ width: "min(560px, 100%)", borderRadius: 34, padding: 34 }}>
          <span className="badge">Connexion requise</span>
          <h1 style={{ fontSize: 42, lineHeight: 1, marginBottom: 12 }}>Pilote tes publications Facebook depuis ton journal.</h1>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Connecte-toi avec email ou Google pour activer Firestore, l&apos;onboarding pseudo, les brouillons IA, les notifications et la planification.
          </p>

          <form onSubmit={handleEmailAuth} style={{ display: "grid", gap: 12, marginTop: 18 }}>
            <label style={{ display: "grid", gap: 8 }}>
              <span>Email</span>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Mot de passe</span>
              <input
                className="input"
                type="password"
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError && <p style={{ color: "#fecdd3", textAlign: "left", margin: 0 }}>{authError}</p>}

            <button className="btn primary" type="submit" disabled={submitting}>
              <LogIn size={18} /> {authMode === "signup" ? "Créer un compte" : "Connexion email"}
            </button>
          </form>

          <button className="btn" type="button" onClick={() => setAuthMode((current) => (current === "signin" ? "signup" : "signin"))} style={{ marginTop: 10, width: "100%" }}>
            {authMode === "signup" ? "J'ai déjà un compte" : "Créer un compte email"}
          </button>

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

function getAuthErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "Authentification impossible. Réessaie dans quelques instants.";
  }

  switch ((error as { code?: string }).code) {
    case "auth/email-already-in-use":
      return "Cet email possède déjà un compte. Utilise la connexion email.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email ou mot de passe incorrect.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessaie plus tard.";
    default:
      return "Authentification impossible. Vérifie tes informations.";
  }
}
