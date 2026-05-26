"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { GeneratedPost, UserConfig } from "@/lib/types";
import { AuthGate } from "./auth-gate";
import { JournalPanel } from "./journal-panel";
import { OnboardingBrand } from "./onboarding-brand";
import { PostsFeed } from "./posts-feed";
import { SettingsPanel } from "./settings-panel";
import { getUserConfig, saveUserConfig, subscribeUserPosts } from "@/lib/firestore-service";

export function DashboardApp() {
  return <AuthGate>{(user) => <DashboardContent user={user} />}</AuthGate>;
}

function DashboardContent({ user }: { user: User }) {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [posts, setPosts] = useState<Array<GeneratedPost & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState("");

  function defaultConfig(): UserConfig {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferred_posting_time: "18:30"
    };
  }

  useEffect(() => {
    let mounted = true;

    void withTimeout(getUserConfig(user.uid), 8000)
      .then((loaded) => {
        if (!mounted) return;
        setConfig(loaded ?? defaultConfig());
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Unable to load user config", error);
        setConfig(defaultConfig());
        setFirestoreError("Firestore ne répond pas encore. Vérifie que la base Firestore est créée et que les règles sont déployées.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = subscribeUserPosts(
      user.uid,
      setPosts,
      (error) => {
        console.error("Unable to subscribe to posts", error);
        setFirestoreError("Lecture des posts impossible pour le moment. Vérifie Firestore, les règles et les index.");
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user.uid]);

  async function handleConfigUpdate(next: Partial<UserConfig>) {
    const merged = { ...(config ?? {}), ...next };
    setConfig(merged);
    await saveUserConfig(user.uid, merged);
  }

  if (loading) {
    return <main className="shell" style={{ padding: 24 }}>Chargement du dashboard...</main>;
  }

  if (!config?.pseudo) {
    return (
      <main className="shell" style={{ padding: "12px 0 48px" }}>
        {firestoreError && <ErrorBanner message={firestoreError} />}
        <OnboardingBrand uid={user.uid} onComplete={(next) => void handleConfigUpdate(next)} />
      </main>
    );
  }

  return (
    <main className="shell" style={{ padding: "4px 0 54px" }}>
      {firestoreError && <ErrorBanner message={firestoreError} />}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(320px, 0.7fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <JournalPanel uid={user.uid} config={config} />
          <PostsFeed posts={posts} />
        </div>
        <SettingsPanel uid={user.uid} config={config} onUpdate={(next) => void handleConfigUpdate(next)} />
      </section>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ marginBottom: 16, border: "1px solid rgba(251, 113, 133, 0.38)", borderRadius: 18, padding: 14, background: "rgba(251, 113, 133, 0.12)", color: "#fecdd3" }}>
      {message}
    </div>
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Firestore request timed out")), timeoutMs);
    })
  ]);
}
