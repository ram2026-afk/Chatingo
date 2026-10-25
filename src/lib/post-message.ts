import { toggleReaction } from "@/lib/chat-media";
import { api } from "@/lib/http";
import type {
  ChatAction,
  ChatMessage,
  ChatReplyPreview,
  ChatSend,
  Thread,
} from "@/lib/types";

function replyPreview(message: ChatMessage): ChatReplyPreview {
  return {
    id: message.id,
    sender: message.sender,
    body: message.body,
    imageUrl: message.imageUrl,
    deleted: message.deleted,
  };
}

export async function postChatMessage(
  conversationId: string,
  payload: ChatSend,
  headers?: HeadersInit,
) {
  if (payload.image) {
    const form = new FormData();
    form.append("body", payload.body);
    form.append("image", payload.image);
    if (payload.replyToId) form.append("replyToId", payload.replyToId);
    return api<ChatMessage>(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers,
      body: form,
    });
  }
  return api<ChatMessage>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: payload.body,
      replyToId: payload.replyToId ?? null,
    }),
  });
}

export async function patchChatMessage(
  conversationId: string,
  messageId: string,
  action: ChatAction,
  headers?: HeadersInit,
) {
  return api<ChatMessage>(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(action),
    },
  );
}

export function pendingChatMessage(
  sender: ChatMessage["sender"],
  payload: ChatSend,
  parent?: ChatMessage | null,
): ChatMessage {
  return {
    id: `temp-${crypto.randomUUID()}`,
    sender,
    body: payload.body,
    imageUrl: payload.image ? URL.createObjectURL(payload.image) : null,
    replyToId: payload.replyToId ?? null,
    replyTo: parent ? replyPreview(parent) : null,
    createdAt: new Date().toISOString(),
    pending: true,
  };
}

export function mapThreadMessages(
  current: Thread | null,
  update: (messages: ChatMessage[]) => ChatMessage[],
) {
  return current ? { ...current, messages: update(current.messages) } : current;
}

function applyChatAction(
  message: ChatMessage,
  action: ChatAction,
  actor: ChatMessage["sender"],
): ChatMessage {
  if (action.remove) {
    return {
      ...message,
      body: "",
      imageUrl: null,
      deleted: true,
      pinned: false,
      reactions: [],
    };
  }
  if (typeof action.pin === "boolean") {
    return { ...message, pinned: action.pin };
  }
  if (action.reaction) {
    return {
      ...message,
      reactions: toggleReaction(message.reactions ?? [], action.reaction, actor),
    };
  }
  return message;
}

export function mergeSavedMessage(messages: ChatMessage[], saved: ChatMessage) {
  const parent = saved.replyToId
    ? messages.find((item) => item.id === saved.replyToId)
    : null;
  const next: ChatMessage = {
    ...saved,
    replyTo: parent ? replyPreview(parent) : saved.replyTo,
  };
  return messages.map((item) => {
    if (item.id === next.id) return next;
    if (next.pinned && item.pinned) return { ...item, pinned: false };
    if (item.replyToId === next.id) {
      return { ...item, replyTo: replyPreview(next) };
    }
    return item;
  });
}

export function withChatAction(
  messages: ChatMessage[],
  message: ChatMessage,
  action: ChatAction,
  actor: ChatMessage["sender"],
) {
  return mergeSavedMessage(messages, applyChatAction(message, action, actor));
}

export function settlePendingMessage(
  messages: ChatMessage[],
  tempId: string,
  saved: ChatMessage,
) {
  return mergeSavedMessage(
    messages.map((message) => (message.id === tempId ? saved : message)),
    saved,
  );
}
