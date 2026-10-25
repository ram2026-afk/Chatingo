"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "@/components/brand";
import { Composer, MessageList } from "@/components/chat-ui";
import { Alert, Loading } from "@/components/loading";
import {
  ChatFrame,
  ConversationItem,
  EmptyThread,
  ThreadHeader,
} from "@/components/messenger";
import { TopBar } from "@/components/top-bar";
import { useChatThread } from "@/components/use-chat-thread";
import { api, isForbidden, isUnauthorized } from "@/lib/http";
import type { JoinResult, SessionInfo, UserChatSummary } from "@/lib/types";

function parsePageSlug(value: string) {
  const text = value.trim();
  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "p" && parts[1]) return parts[1];
  } catch {
    if (text.startsWith("/p/")) return text.slice(3).split("/")[0] || null;
    if (/^[a-z0-9-]+$/i.test(text)) return text;
  }
  return null;
}

export function UserInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedChat = searchParams.get("chat") ?? "";
  const [chats, setChats] = useState<UserChatSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [canManagePages, setCanManagePages] = useState(false);
  const listOnly = useRef(false);
  const requestedChatRef = useRef(requestedChat);
  const activeId = requestedChat || selectedId;

  useEffect(() => {
    requestedChatRef.current = requestedChat;
  }, [requestedChat]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [data, session] = await Promise.all([
          api<{ chats: UserChatSummary[] }>("/api/me/chats"),
          api<SessionInfo>("/api/auth/session"),
        ]);
        if (cancelled) return;
        setChats(data.chats);
        setCanManagePages(session.canManagePages);
        setSelectedId((current) => {
          const fromUrl = requestedChatRef.current;
          if (
            fromUrl &&
            data.chats.some((chat) => chat.conversationId === fromUrl)
          ) {
            return fromUrl;
          }
          if (
            current &&
            data.chats.some((chat) => chat.conversationId === current)
          ) {
            return current;
          }
          if (listOnly.current) return "";
          if (window.matchMedia("(min-width: 768px)").matches) {
            return data.chats[0]?.conversationId ?? "";
          }
          return "";
        });
      } catch (caught) {
        if (cancelled) return;
        if (isUnauthorized(caught)) {
          router.replace("/");
          return;
        }
        if (isForbidden(caught)) {
          router.replace("/pages");
          return;
        }
        setError(
          caught instanceof Error ? caught.message : "Could not load chats.",
        );
        setChats([]);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

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
    sender: "visitor",
    onLiveError: (caught) => {
      if (isUnauthorized(caught)) router.replace("/");
      if (isForbidden(caught)) router.replace("/pages");
    },
  });

  const visibleChats = useMemo(() => {
    const list = chats ?? [];
    const text = query.trim().toLowerCase();
    if (!text) return list;
    return list.filter(
      (chat) =>
        chat.pageName.toLowerCase().includes(text) ||
        chat.lastMessage?.body.toLowerCase().includes(text),
    );
  }, [chats, query]);

  function openConversation(conversationId: string) {
    listOnly.current = false;
    setSendError("");
    setReplyTo(null);
    setSelectedId(conversationId);
    if (conversationId !== activeId) setThread(null);
    router.replace(`/inbox?chat=${conversationId}`);
  }

  async function openLink(event: React.FormEvent) {
    event.preventDefault();
    const slug = parsePageSlug(link);
    if (!slug) {
      setError("Paste a page link or slug, such as /p/northside-studio.");
      return;
    }
    setError("");
    setJoining(true);
    try {
      const result = await api<JoinResult>(`/api/p/${slug}/join`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setLink("");
      openConversation(result.conversationId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not open that page.",
      );
    } finally {
      setJoining(false);
    }
  }

  if (!chats && !error) return <Loading label="Loading chats" />;

  const active =
    chats?.find((chat) => chat.conversationId === activeId) ?? null;

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <TopBar
        variant="canvas"
        leading={
          <Link href="/inbox" className="min-w-0" aria-label="Chat-in-go">
            <Brand size="sm" />
          </Link>
        }
      >
        {canManagePages ? (
          <Link href="/pages" className="btn btn-sm shrink-0">
            Switch to pages view
          </Link>
        ) : null}
      </TopBar>
      <div className="flex min-h-0 min-w-0 flex-1 px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pl-[max(0.75rem,env(safe-area-inset-left))] sm:pr-[max(0.75rem,env(safe-area-inset-right))] sm:pb-3">
        <ChatFrame
          showThread={Boolean(activeId)}
          sidebar={
            <>
              <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
                <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">
                  Chats
                </h1>
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
                <form
                  className="field-chip mt-2.5"
                  onSubmit={(event) => void openLink(event)}
                >
                  <svg
                    className="field-chip-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6.6 9.4a2.8 2.8 0 0 0 4 0l1.5-1.5a2.8 2.8 0 1 0-4-4L7.4 4.6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9.4 6.6a2.8 2.8 0 0 0-4 0L3.9 8.1a2.8 2.8 0 1 0 4 4l.7-.7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    className="field"
                    value={link}
                    placeholder="Paste a page link"
                    onChange={(event) => setLink(event.target.value)}
                    aria-label="Page link"
                  />
                  <button
                    className="btn h-9 shrink-0 rounded-full px-3.5"
                    type="submit"
                    disabled={joining}
                  >
                    {joining ? "Opening" : "Join"}
                  </button>
                </form>
                {error ? (
                  <div className="mt-3">
                    <Alert>{error}</Alert>
                  </div>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2 sm:px-4">
                {visibleChats.length === 0 ? (
                  <p className="px-3 py-6 text-sm leading-6 text-muted">
                    {chats && chats.length === 0
                      ? "Paste a page link or scan a QR code to start messaging."
                      : "No chats match that search."}
                  </p>
                ) : (
                  visibleChats.map((chat) => (
                    <ConversationItem
                      key={chat.conversationId}
                      name={chat.pageName}
                      imageUrl={chat.pageImageUrl}
                      kind="page"
                      preview={
                        chat.lastMessage
                          ? chat.lastMessage.body
                          : "Joined, no message yet"
                      }
                      time={chat.updatedAt}
                      selected={chat.conversationId === activeId}
                      unreadCount={
                        chat.conversationId === activeId ? 0 : chat.unreadCount
                      }
                      onClick={() => openConversation(chat.conversationId)}
                    />
                  ))
                )}
              </div>
            </>
          }
          thread={
            active &&
            thread &&
            thread.conversation.id === active.conversationId ? (
              <>
                <ThreadHeader
                  name={thread.conversation.pageName}
                  imageUrl={thread.conversation.pageImageUrl}
                  kind="page"
                  subtitle={`Joined as ${thread.conversation.visitorName}`}
                  onBack={() => {
                    listOnly.current = true;
                    setSelectedId("");
                    router.replace("/inbox");
                  }}
                />
                <MessageList
                  messages={thread.messages}
                  viewer="visitor"
                  pageName={thread.conversation.pageName}
                  visitorName={thread.conversation.visitorName}
                  pageImageUrl={thread.conversation.pageImageUrl}
                  visitorImageUrl={thread.conversation.visitorImageUrl}
                  pageReadAt={thread.conversation.pageReadAt}
                  visitorReadAt={thread.conversation.visitorReadAt}
                  empty={
                    thread.conversation.welcome ||
                    "You're in. Send a message whenever you're ready."
                  }
                  retention={thread.retention}
                  onReply={setReplyTo}
                  onAct={act}
                />
                {sendError ? (
                  <div className="bg-card px-3 pb-1 sm:px-4">
                    <Alert>{sendError}</Alert>
                  </div>
                ) : null}
                <Composer
                  placeholder={`Message ${thread.conversation.pageName}`}
                  replyTo={replyTo}
                  replyName={
                    replyTo
                      ? replyTo.sender === "visitor"
                        ? "You"
                        : thread.conversation.pageName
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
                body="Pick a conversation on the left, or join a page with its link."
              />
            )
          }
        />
      </div>
    </div>
  );
}
