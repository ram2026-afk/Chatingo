"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DefaultAvatarIcon } from "@/components/brand";
import { Alert } from "@/components/loading";
import { compressImage } from "@/lib/compress-image";
import { api } from "@/lib/http";
import type { SessionInfo } from "@/lib/types";

export function ProfileMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((next) => {
        if (!cancelled) setSession(next);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  async function onImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const form = new FormData();
      form.set("image", await compressImage(file));
      const data = await api<{ imageUrl: string }>("/api/me/profile", {
        method: "POST",
        body: form,
      });
      setSession((current) =>
        current ? { ...current, imageUrl: data.imageUrl } : current,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the photo.");
    } finally {
      setSaving(false);
    }
  }

  const name = session?.name || "Profile";
  const canAddPhoto = session?.role === "user";

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-btn"
        aria-label="Profile"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setError("");
        }}
      >
        {session?.imageUrl ? (
          <img src={session.imageUrl} alt="" />
        ) : (
          <DefaultAvatarIcon />
        )}
      </button>
      {open ? (
        <div className="profile-panel" role="menu">
          <p className="truncate text-[15px] font-semibold">{name}</p>
          {session?.email ? (
            <p className="mt-0.5 truncate text-xs text-muted">{session.email}</p>
          ) : null}
          {canAddPhoto ? (
            <>
              <input
                ref={fileRef}
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => void onImage(event)}
              />
              <button
                type="button"
                className="btn mt-3 w-full"
                disabled={saving}
                onClick={() => fileRef.current?.click()}
              >
                {saving
                  ? "Saving"
                  : session?.imageUrl
                    ? "Change photo"
                    : "Add photo"}
              </button>
            </>
          ) : null}
          <div className="mt-2">
            <Alert>{error}</Alert>
          </div>
          <button
            type="button"
            className="btn btn-text mt-1 w-full"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
