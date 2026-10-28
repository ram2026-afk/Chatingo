"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageAvatar } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { Alert } from "@/components/loading";
import { compressImage } from "@/lib/compress-image";
import { LIMITS } from "@/lib/constants";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import type { SessionInfo } from "@/lib/types";

export function NewPageForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((session) => {
        if (!cancelled && session.role !== "admin") router.replace("/pages");
      })
      .catch((caught) => {
        if (cancelled) return;
        if (isUnauthorized(caught)) router.replace("/login");
        else router.replace("/pages");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setError("");
      setImage(compressed);
    } catch {
      setError("Could not read that image.");
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("Page name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("welcome", welcome);
      if (image) form.set("image", image);
      const data = await api<{ page: { id: string } }>("/api/pages", {
        method: "POST",
        body: form,
      });
      router.replace(`/pages/${data.page.id}`);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      if (isForbidden(caught)) {
        router.replace("/pages");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not create the page.");
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-3 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-3 flex items-center gap-2 lg:mb-0">
          <BackButton href="/pages" label="Back to pages" className="lg:hidden" />
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">New page</h1>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          Give the page a name people will recognize. After you create it, you
          get a link and a QR code.
        </p>
        <form
          className="card mt-5 flex flex-col gap-4 p-5 sm:mt-6 sm:p-7"
          onSubmit={(event) => void onSubmit(event)}
        >
          <div>
            <p className="label">Profile image</p>
            <div className="page-photo">
              <button
                type="button"
                className="page-photo-btn"
                aria-label={preview ? "Change profile image" : "Add profile image"}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <PageAvatar
                    name={name}
                    imageUrl={preview}
                    size="xl"
                    kind="page"
                  />
                ) : (
                  <PageAvatar name={name} size="xl" kind="page" />
                )}
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    {preview ? "Change photo" : "Add photo"}
                  </button>
                  {preview ? (
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => setImage(null)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Optional. Shown on the page, link, and inbox.
                </p>
              </div>
            </div>
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onImage}
            />
          </div>
          <div>
            <label className="label" htmlFor="page-name">
              Page name
            </label>
            <input
              id="page-name"
              className="field"
              value={name}
              maxLength={LIMITS.pageName}
              placeholder="Northside Studio"
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="welcome">
              Welcome message
            </label>
            <textarea
              id="welcome"
              className="field-area"
              value={welcome}
              maxLength={LIMITS.welcome}
              placeholder="Ask us about hours, orders, or anything else."
              onChange={(event) => setWelcome(event.target.value)}
            />
            <p className="mt-2 text-xs text-muted">
              Shown when someone opens the page. Optional.
            </p>
          </div>
          <Alert>{error}</Alert>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Link href="/pages" className="btn btn-text w-full sm:w-auto">
              Cancel
            </Link>
            <button className="btn w-full sm:w-auto" type="submit" disabled={saving}>
              {saving ? "Creating" : "Create page"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
