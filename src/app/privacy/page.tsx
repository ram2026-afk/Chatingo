import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <main
      className="min-h-dvh bg-canvas px-4 py-8 sm:px-6"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <article className="card mx-auto w-full max-w-2xl px-5 py-7 sm:px-8 sm:py-9">
        <Link href="/" aria-label="Chat-in-go home">
          <Brand size="sm" wordmark={false} />
        </Link>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight sm:text-[30px]">
          Privacy policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated October 28, 2026</p>
        <div className="mt-6 space-y-5 text-sm leading-6 text-ink">
          <p>
            Chat-in-go is a page inbox. People join a page with a link or QR
            code, sign in, and message that page. This application is solely
            for private use. This policy explains what we keep and when it is
            removed.
          </p>
          <section>
            <h2 className="text-[15px] font-semibold">Accounts</h2>
            <p className="mt-1.5 text-muted">
              When you create an account we store your name, email, password,
              and optional profile photo. Passwords are handled by our
              authentication provider. We use a session cookie so you stay
              signed in.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold">Pages and chats</h2>
            <p className="mt-1.5 text-muted">
              A page owner can store a page name, welcome message, photo, and
              which team members may reply. Chat messages, including photos
              sent in a chat, are visible to the people in that conversation
              and to the page team.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold">
              Messages are deleted after two days
            </h2>
            <p className="mt-1.5 text-muted">
              Chat history is temporary by design. Text and photos from a chat
              day are automatically removed two days later. For example,
              messages sent on October 28 are deleted on October 30. When that
              happens, the chat shows: &ldquo;Chat from Oct 28 has been
              removed.&rdquo; Deleted chat data are permanently removed from
              our databases.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold">Referrals</h2>
            <p className="mt-1.5 text-muted">
              If you share a referral link, we may store that a friend joined
              through you so the page can show who referred them.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold">What we do not do</h2>
            <p className="mt-1.5 text-muted">
              We do not sell your information. We do not use chat contents for
              ads. Hosting and database providers process data only to run this
              app.
            </p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold">Questions</h2>
            <p className="mt-1.5 text-muted">
              If you have a privacy question, contact the page you chat with or
              the account owner who invited you.
            </p>
          </section>
        </div>
        <Link href="/login" className="btn btn-sm mt-7">
          Back to sign in
        </Link>
      </article>
    </main>
  );
}
