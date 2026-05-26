import { PostEditor } from "@/components/post-editor";

export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostEditor postId={params.postId} />;
}
