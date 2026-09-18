import { ReviewWorkspace } from "./review-workspace";

type ReviewPageProps = {
  params: Promise<{ pageId: string }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { pageId } = await params;

  return (
    <main id="main" className="h-dvh overflow-hidden">
      <ReviewWorkspace pageId={pageId} />
    </main>
  );
}
