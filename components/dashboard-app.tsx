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

  useEffect(() => {
    void getUserConfig(user.uid).then((loaded) => {
      setConfig(loaded ?? { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, preferred_posting_time: "18:30" });
      setLoading(false);
    });

    return subscribeUserPosts(user.uid, setPosts);
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
        <OnboardingBrand uid={user.uid} onComplete={(next) => void handleConfigUpdate(next)} />
      </main>
    );
  }

  return (
    <main className="shell" style={{ padding: "4px 0 54px" }}>
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
