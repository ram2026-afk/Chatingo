"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageAvatar } from "@/components/brand";
import { Alert } from "@/components/loading";
import { api, isUnauthorized } from "@/lib/http";
import type { StaffMember } from "@/lib/types";

export function PageAccessPanel({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ staff: StaffMember[] }>(
          `/api/pages/${pageId}/staff`,
        );
        if (!cancelled) {
          setStaff(data.staff);
          setError("");
        }
      } catch (caught) {
        if (cancelled) return;
        if (isUnauthorized(caught)) {
          router.replace("/login");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not load access.");
        setStaff([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pageId, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await api<{ staff: StaffMember }>(`/api/pages/${pageId}/staff`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStaff((current) => [
        data.staff,
        ...(current ?? []).filter((item) => item.id !== data.staff.id),
      ]);
      setEmail("");
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not give access.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/pages/${pageId}/staff/${id}`, { method: "DELETE" });
      setStaff((current) => (current ?? []).filter((item) => item.id !== id));
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not remove access.");
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-soft p-3">
      <p className="text-sm font-semibold">Access</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Enter the email of someone who already signed in. If they are found,
        they can reply on this page. They cannot add pages.
      </p>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(event) => void onSubmit(event)}
      >
        <div>
          <label className="label" htmlFor={`staff-email-${pageId}`}>
            Email
          </label>
          <input
            id={`staff-email-${pageId}`}
            className="field"
            type="email"
            value={email}
            autoComplete="off"
            placeholder="name@gmail.com"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Alert>{error}</Alert>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Saving" : "Give access"}
        </button>
      </form>
      <div className="mt-3 space-y-2">
        {staff === null ? (
          <p className="px-1 py-2 text-xs leading-5 text-muted">Loading</p>
        ) : staff.length === 0 ? (
          <p className="px-1 py-2 text-xs leading-5 text-muted">
            Only you can reply on this page right now.
          </p>
        ) : (
          staff.map((person) => (
            <div key={person.id} className="page-card">
              <PageAvatar name={person.name} kind="person" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {person.name}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {person.email}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-text shrink-0"
                onClick={() => void remove(person.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
