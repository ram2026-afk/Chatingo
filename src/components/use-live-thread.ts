"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/http";
import { mergeMessages } from "@/lib/time";
import type { Thread } from "@/lib/types";

export function mergeLiveThread(current: Thread | null, next: Thread): Thread {
  if (!current || current.conversation.id !== next.conversation.id) return next;
  return {
    conversation: next.conversation,
    messages: mergeMessages(current.messages, next.messages),
    retention: next.retention,
  };
}

const POLL_MS = 1000;

export function useLiveThread({
  conversationId,
  onThread,
  onError,
}: {
  conversationId?: string;
  onThread: (thread: Thread) => void;
  onError?: (error: unknown) => void;
}) {
  const onThreadRef = useRef(onThread);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onThreadRef.current = onThread;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    async function load() {
      if (document.visibilityState === "hidden") return;
      try {
        const next = await api<Thread>(
          `/api/conversations/${conversationId}?t=${Date.now()}`,
        );
        if (!cancelled) onThreadRef.current(next);
      } catch (error) {
        if (!cancelled) onErrorRef.current?.(error);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [conversationId]);
}
