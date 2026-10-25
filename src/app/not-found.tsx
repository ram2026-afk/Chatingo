import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-md p-7">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          That address does not match a page.
        </p>
        <Link href="/" className="btn mt-5">
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
