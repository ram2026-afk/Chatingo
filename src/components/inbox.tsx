"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageAccessPanel } from "@/components/page-access";
import { BackButton } from "@/components/back-button";
import { PageAvatar } from "@/components/brand";
import { Composer, MessageList } from "@/components/chat-ui";
import { Alert, Loading } from "@/components/loading";
import { compressImage } from "@/lib/compress-image";
import {
  ChatFrame,
  ConversationItem,
  EmptyThread,
  ThreadHeader,
} from "@/components/messenger";
import { QrCode } from "@/components/qr-code";
import { useOrigin } from "@/components/use-origin";
import { useChatThread } from "@/components/use-chat-thread";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import type { PageDetail, SessionInfo } from "@/lib/types";

export function Inbox() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return <Loading compact label="Loading page" />;
  return <InboxView key={id} id={id} />;
}

function InboxView({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<PageDetail | null>(null);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [error, setError] = useState("");
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listOnly = useRef(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api<SessionInfo>("/api/auth/session")
      .then((session) => {
        if (!cancelled) setIsAdmin(session.role === "admin");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function closeSettings() {
      setSettingsOpen(false);
      setDeleteOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) {
        closeSettings();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSettings();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await api<PageDetail>(`/api/pages/${id}`);
        if (cancelled) return;
        setDetail(next);
        setFailed(false);
        setActiveId((current) => {
          if (
            current &&
            next.conversations.some((item) => item.id === current)
          ) {
            return current;
          }
          if (listOnly.current) return "";
          if (window.matchMedia("(min-width: 768px)").matches) {
            return next.conversations[0]?.id ?? "";
          }
          return "";
        });
      } catch (caught) {
        if (cancelled) return;
        if (isUnauthorized(caught)) {
          router.replace("/login");
          return;
        }
        if (isForbidden(caught)) {
          router.replace("/pages");
          return;
        }
        setFailed(true);
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load this page.",
        );
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, router]);

  const {
    thread,
    setThread,
    replyTo,
    setReplyTo,
    sendError,
    setSendError,
    send,
    act,
  } = useChatThread({
    conversationId: activeId,
    sender: "page",
    onLiveError: (caught) => {
      if (isUnauthorized(caught)) router.replace("/login");
      if (isForbidden(caught)) router.replace("/pages");
    },
  });

  const conversations = useMemo(() => {
    const list = detail?.conversations ?? [];
    const text = query.trim().toLowerCase();
    if (!text) return list;
    return list.filter(
      (conversation) =>
        conversation.visitorName.toLowerCase().includes(text) ||
        conversation.lastMessage?.body.toLowerCase().includes(text),
    );
  }, [detail, query]);

  function openConversation(conversationId: string) {
    listOnly.current = false;
    setSendError("");
    setReplyTo(null);
    setActiveId(conversationId);
    if (conversationId !== activeId) setThread(null);
  }

  function applyPageImage(imageUrl: string | null) {
    setDetail((current) =>
      current ? { ...current, page: { ...current.page, imageUrl } } : current,
    );
    setThread((current) =>
      current
        ? {
            ...current,
            conversation: { ...current.conversation, pageImageUrl: imageUrl },
          }
        : current,
    );
  }

  async function onPagePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !detail) return;
    if (!file.type.startsWith("image/")) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    setError("");
    setPhotoSaving(true);
    try {
      const form = new FormData();
      form.set("image", await compressImage(file));
      const data = await api<{ page: { imageUrl: string | null } }>(
        `/api/pages/${detail.page.id}`,
        { method: "PATCH", body: form },
      );
      applyPageImage(data.page.imageUrl);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Could not save the photo.",
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  async function removePagePhoto() {
    if (!detail) return;
    setError("");
    setPhotoSaving(true);
    try {
      const data = await api<{ page: { imageUrl: string | null } }>(
        `/api/pages/${detail.page.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ image: null }),
        },
      );
      applyPageImage(data.page.imageUrl);
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Could not remove the photo.",
      );
    } finally {
      setPhotoSaving(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link.");
    }
  }

  async function removePage() {
    if (!detail) return;
    setError("");
    setDeleting(true);
    try {
      await api(`/api/pages/${detail.page.id}`, { method: "DELETE" });
      router.replace("/pages");
      router.refresh();
    } catch (caught) {
      if (isUnauthorized(caught)) {
        router.replace("/login");
        return;
      }
      if (isForbidden(caught)) {
        router.replace("/pages");
        return;
      }
      setError(
        caught instanceof Error ? caught.message : "Could not delete the page.",
      );
      setDeleting(false);
    }
  }

  if (!detail && !failed) return <Loading compact label="Loading page" />;

  if (!detail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4">
        <Alert>{error || "Page not found."}</Alert>
        <button
          type="button"
          className="btn"
          onClick={() => router.push("/pages")}
        >
          All pages
        </button>
      </div>
    );
  }

  const url = origin ? `${origin}/p/${detail.page.slug}` : "";
  const active =
    detail.conversations.find((item) => item.id === activeId) ?? null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatFrame
        showThread={Boolean(activeId)}
        sidebar={
          <>
            <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
              <div className="flex items-start gap-2">
                <BackButton
                  href="/pages"
                  label="Back to pages"
                  className="mt-0.5 lg:hidden"
                />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <PageAvatar
                    name={detail.page.name}
                    imageUrl={detail.page.imageUrl}
                    size="lg"
                    kind="page"
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="relative flex min-w-0 items-center gap-1.5"
                      ref={settingsRef}
                    >
                      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight sm:text-[22px]">
                        {detail.page.name}
                      </h1>
                      {isAdmin ? (
                        <button
                          type="button"
                          className="settings-btn"
                          aria-label="Page settings"
                          aria-haspopup="menu"
                          aria-expanded={settingsOpen}
                          onClick={() => {
                            setSettingsOpen((open) => !open);
                            setShareOpen(false);
                            setAccessOpen(false);
                            setDeleteOpen(false);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                        </button>
                      ) : null}
                      {isAdmin && settingsOpen ? (
                        <div className="profile-panel" role="menu">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 text-[15px] font-semibold">
                              Page photo
                            </p>
                            <button
                              type="button"
                              className="settings-btn"
                              aria-label="Close"
                              onClick={() => {
                                setSettingsOpen(false);
                                setDeleteOpen(false);
                              }}
                            >
                              <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">
                            Shown on the page, link, and inbox.
                          </p>
                          <input
                            ref={photoRef}
                            className="hidden"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(event) => void onPagePhoto(event)}
                          />
                          <button
                            type="button"
                            className="btn mt-3 w-full"
                            disabled={photoSaving}
                            onClick={() => photoRef.current?.click()}
                          >
                            {photoSaving
                              ? "Saving"
                              : detail.page.imageUrl
                                ? "Change photo"
                                : "Add photo"}
                          </button>
                          {detail.page.imageUrl ? (
                            <button
                              type="button"
                              className="btn btn-text mt-1 w-full"
                              disabled={photoSaving}
                              onClick={() => void removePagePhoto()}
                            >
                              Remove
                            </button>
                          ) : null}
                          {deleteOpen ? (
                            <div className="mt-3">
                              <p className="text-sm font-semibold">
                                Delete this page?
                              </p>
                              <p className="mt-1 text-xs leading-5 text-muted">
                                {detail.page.name} and its conversations will
                                be removed. This cannot be undone.
                              </p>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  className="btn btn-secondary w-full"
                                  disabled={deleting}
                                  onClick={() => setDeleteOpen(false)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger w-full"
                                  disabled={deleting}
                                  onClick={() => void removePage()}
                                >
                                  {deleting ? "Deleting" : "Delete"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger mt-3 w-full"
                              disabled={photoSaving}
                              onClick={() => setDeleteOpen(true)}
                            >
                              Delete page
                            </button>
                          )}
                          <div className="mt-2">
                            <Alert>{error}</Alert>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {detail.conversations.length === 0
                        ? "No conversations yet"
                        : `${detail.conversations.length} conversation${
                            detail.conversations.length === 1 ? "" : "s"
                          }`}
                    </p>
                  </div>
                </div>
              </div>
              <label className="field-chip mt-3">
                <svg
                  className="field-chip-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="4.25"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m10.2 10.2 3.3 3.3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  className="field"
                  value={query}
                  placeholder="Search chats"
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search chats"
                />
              </label>
              <div
                className={`mt-3 grid gap-2 ${isAdmin ? "grid-cols-2" : ""}`}
              >
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => {
                    setShareOpen((open) => !open);
                    setAccessOpen(false);
                    setSettingsOpen(false);
                    setDeleteOpen(false);
                  }}
                >
                  {shareOpen ? "Hide share" : "Share page"}
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => {
                      setAccessOpen((open) => !open);
                      setShareOpen(false);
                      setSettingsOpen(false);
                      setDeleteOpen(false);
                    }}
                  >
                    {accessOpen ? "Hide access" : "Access"}
                  </button>
                ) : null}
              </div>
              {shareOpen ? (
                <div className="mt-3 rounded-2xl bg-soft p-3">
                  <p className="break-all text-xs leading-5 text-muted">
                    {url || "Preparing link"}
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className="btn w-full sm:w-auto"
                      onClick={() => void copyLink(url)}
                      disabled={!url}
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    {url ? (
                      <a
                        className="btn btn-secondary w-full sm:w-auto"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 flex justify-center">
                    {url ? (
                      <QrCode
                        value={url}
                        label={`QR code for ${detail.page.name}`}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
              {isAdmin && accessOpen ? (
                <PageAccessPanel pageId={detail.page.id} />
              ) : null}
              {error ? (
                <div className="mt-3">
                  <Alert>{error}</Alert>
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 sm:px-4">
              {conversations.length === 0 ? (
                <p className="px-3 py-6 text-sm leading-6 text-muted">
                  {detail.conversations.length === 0
                    ? "No one has joined yet. Share the page to start chatting."
                    : "No chats match that search."}
                </p>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    name={conversation.visitorName}
                    preview={
                      conversation.lastMessage
                        ? conversation.lastMessage.body
                        : "Joined, no message yet"
                    }
                    time={conversation.updatedAt}
                    selected={conversation.id === activeId}
                    unreadCount={
                      conversation.id === activeId
                        ? 0
                        : conversation.unreadCount
                    }
                    onClick={() => openConversation(conversation.id)}
                  />
                ))
              )}
            </div>
          </>
        }
        thread={
          active && thread && thread.conversation.id === active.id ? (
            <>
              <ThreadHeader
                name={thread.conversation.visitorName}
                subtitle={`Messaging ${thread.conversation.pageName}`}
                onBack={() => {
                  listOnly.current = true;
                  setActiveId("");
                }}
              />
              <MessageList
                messages={thread.messages}
                viewer="page"
                pageName={thread.conversation.pageName}
                visitorName={thread.conversation.visitorName}
                pageImageUrl={thread.conversation.pageImageUrl}
                visitorImageUrl={thread.conversation.visitorImageUrl}
                pageReadAt={thread.conversation.pageReadAt}
                visitorReadAt={thread.conversation.visitorReadAt}
                empty="No messages yet. Reply when they write in."
                retention={thread.retention}
                referredBy={thread.conversation.referredByName}
                onReply={setReplyTo}
                onAct={act}
              />
              {sendError ? (
                <div className="bg-card px-3 pb-1 sm:px-4">
                  <Alert>{sendError}</Alert>
                </div>
              ) : null}
              <Composer
                placeholder={`Message ${thread.conversation.visitorName}`}
                replyTo={replyTo}
                replyName={
                  replyTo
                    ? replyTo.sender === "page"
                      ? "You"
                      : thread.conversation.visitorName
                    : undefined
                }
                onCancelReply={() => setReplyTo(null)}
                onError={setSendError}
                onSend={async (payload) => {
                  setSendError("");
                  await send(payload);
                }}
              />
            </>
          ) : (
            <EmptyThread
              title={activeId ? "Loading conversation" : "Select a chat"}
              body="Choose someone from the sidebar to see the message history."
              name={detail.page.name}
              imageUrl={detail.page.imageUrl}
              kind="page"
            />
          )
        }
      />
    </div>
  );
}
