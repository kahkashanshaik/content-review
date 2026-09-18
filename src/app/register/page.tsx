import Link from "next/link";

import { AuthForm } from "@/client/auth/auth-form";

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#d7ecff] p-12 lg:flex lg:flex-col lg:justify-center">
        <h1 className="max-w-md text-3xl font-semibold text-slate-900">One website per project.</h1>
        <p className="mt-4 max-w-md text-slate-700">
          Enter the main URL once. Every extra page must stay on that same domain.
        </p>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-xl font-bold tracking-tight text-slate-900">Content Review</p>
          <h2 className="mt-8 text-2xl font-semibold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-600">Use email and a password of at least 8 characters.</p>
          <div className="mt-6">
            <AuthForm mode="register" />
          </div>
          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#5b4dff] underline">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
