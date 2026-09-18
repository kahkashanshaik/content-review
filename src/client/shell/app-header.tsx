"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/register" || pathname.startsWith("/review") || pathname.startsWith("/invite")) {
    return null;
  }

  async function onLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/projects" className="text-lg font-bold tracking-tight text-slate-900">
          Content Review
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <Link
                href="/projects"
                className={
                  pathname.startsWith("/projects")
                    ? "font-semibold text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }
              >
                Projects
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="text-slate-600 hover:text-slate-900"
              >
                Log out
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
