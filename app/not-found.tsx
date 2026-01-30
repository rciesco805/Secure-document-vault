import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | BF Fund",
  description: "The page you're looking for could not be found.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col pb-12 pt-16 bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              404 error
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-gray-100 sm:text-5xl">
              Page not found.
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
              Sorry, we couldn&apos;t find the page you&apos;re looking for.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="text-base font-medium text-emerald-600 hover:text-emerald-500"
              >
                Go back home <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
