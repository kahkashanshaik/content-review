import { AcceptInvitePage } from "./accept-invite-page";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#d7ecff] p-12 lg:flex lg:flex-col lg:justify-center">
        <h1 className="max-w-md text-3xl font-semibold text-slate-900">You were invited to a review project.</h1>
        <p className="mt-4 max-w-md text-slate-700">
          Set your password, then you can add pages, edit copy, and approve changes. You cannot delete the project you
          were invited to.
        </p>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-xl font-bold tracking-tight text-slate-900">Content Review</p>
          <div className="mt-8">
            <AcceptInvitePage token={token} />
          </div>
        </div>
      </section>
    </div>
  );
}
