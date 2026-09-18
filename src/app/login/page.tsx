import Link from "next/link";

import { AuthForm } from "@/client/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#d7ecff] p-12 lg:flex lg:flex-col lg:justify-center">
        <h1 className="max-w-md text-3xl font-semibold text-slate-900">Review and save website copy in context.</h1>
        <p className="mt-4 max-w-md text-slate-700">
          Create a project from your live URL, add more pages on the same domain, and edit text without running source
          scripts.
        </p>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-xl font-bold tracking-tight text-slate-900">Content Review</p>
          <h2 className="mt-8 text-2xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-600">Log in to your account.</p>
          <div className="mt-6">
            <AuthForm mode="login" />
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[#5b4dff] underline">
              Sign up now
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
