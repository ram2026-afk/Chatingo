"use client";

import { useCallback, useState } from "react";
import { mergeLiveThread, useLiveThread } from "@/components/use-live-thread";
import {
  mapThreadMessages,
  mergeSavedMessage,
  patchChatMessage,
  pendingChatMessage,
  postChatMessage,
  settlePendingMessage,
  withChatAction,
} from "@/lib/post-message";
import type { ChatAction, ChatMessage, ChatSend, Thread } from "@/lib/types";

export function useChatThread({
  conversationId,
  sender,
  onLiveError,
}: {
  conversationId?: string;
  sender: ChatMessage["sender"];
  onLiveError?: (error: unknown) => void;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sendError, setSendError] = useState("");
  const [activeId, setActiveId] = useState(conversationId);

  if (activeId !== conversationId) {
    setActiveId(conversationId);
    setReplyTo(null);
    if (activeId) {
      setThread(null);
      setSendError("");
    }
  }

  useLiveThread({
    conversationId,
    onThread: (next) => setThread((current) => mergeLiveThread(current, next)),
    onError: onLiveError,
  });

  const send = useCallback(
    async (payload: ChatSend) => {
      if (!conversationId) return;
      const parent = payload.replyToId
        ? thread?.messages.find((item) => item.id === payload.replyToId)
        : null;
      const pending = pendingChatMessage(sender, payload, parent);
      setThread((current) =>
        mapThreadMessages(current, (messages) => [...messages, pending]),
      );
      setReplyTo(null);
      try {
        const saved = await postChatMessage(conversationId, payload);
        setThread((current) =>
          mapThreadMessages(current, (messages) =>
            settlePendingMessage(messages, pending.id, saved),
          ),
        );
      } catch (caught) {
        setThread((current) =>
          mapThreadMessages(current, (messages) =>
            messages.filter((message) => message.id !== pending.id),
          ),
        );
        throw caught;
      }
    },
    [conversationId, sender, thread],
  );

  const act = useCallback(
    async (message: ChatMessage, action: ChatAction) => {
      if (!conversationId) return;
      setSendError("");
      setThread((current) =>
        mapThreadMessages(current, (messages) =>
          withChatAction(messages, message, action, sender),
        ),
      );
      if (action.remove && replyTo?.id === message.id) setReplyTo(null);
      try {
        const saved = await patchChatMessage(conversationId, message.id, action);
        setThread((current) =>
          mapThreadMessages(current, (messages) =>
            mergeSavedMessage(messages, saved),
          ),
        );
      } catch (caught) {
        setSendError(
          caught instanceof Error
            ? caught.message
            : "Could not update that message.",
        );
      }
    },
    [conversationId, replyTo, sender],
  );

  return {
    thread,
    setThread,
    replyTo,
    setReplyTo,
    sendError,
    setSendError,
    send,
    act,
  };
}
