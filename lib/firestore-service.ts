import { addDoc, collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { entryId, nextScheduledDate } from "./date";
import type { GeneratedPost, UserConfig } from "./types";

export async function saveJournalEntry(uid: string, text: string) {
  const ref = doc(db, "journal_entries", entryId(uid));
  await setDoc(
    ref,
    {
      uid,
      text,
      createdAt: serverTimestamp(),
      processed: false
    },
    { merge: true }
  );
}

export async function createDraftPost(uid: string, text: string, preferredTime?: string) {
  return addDoc(collection(db, "posts"), {
    uid,
    text,
    media_prompt: "",
    scheduled_at: nextScheduledDate(preferredTime),
    status: "pending_review",
    notified_30min: false,
    createdAt: serverTimestamp()
  });
}

export async function getUserConfig(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserConfig) : null;
}

export async function saveUserConfig(uid: string, config: Partial<UserConfig>) {
  await setDoc(doc(db, "users", uid), { ...config }, { merge: true });
}

export async function approvePost(postId: string) {
  await updateDoc(doc(db, "posts", postId), { status: "approved" });
}

export async function updatePost(postId: string, payload: Partial<GeneratedPost>) {
  await updateDoc(doc(db, "posts", postId), payload);
}

export function subscribeUserPosts(uid: string, callback: (posts: Array<GeneratedPost & { id: string }>) => void, onError?: (error: Error) => void) {
  const q = query(collection(db, "posts"), where("uid", "==", uid), limit(20));
  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as GeneratedPost) }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

      callback(posts);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export function subscribePost(postId: string, callback: (post: (GeneratedPost & { id: string }) | null) => void) {
  return onSnapshot(doc(db, "posts", postId), (snapshot) => {
    callback(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as GeneratedPost) }) : null);
  });
}
