"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { PageAvatar } from "@/components/brand";
import { REACT_EMOJIS, chatSnippet } from "@/lib/chat-media";
import { compressImage } from "@/lib/compress-image";
import type {
  ChatAction,
  ChatActor,
  ChatMessage,
  ChatSend,
  RetentionNotice,
} from "@/lib/types";
import { formatDayLabel, formatTime, sameDay } from "@/lib/time";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩", "🤔",
  "😴", "😭", "😡", "🤯", "😅", "😇", "🙃", "😢", "😮", "🤗",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🔥", "❤️", "✨", "🎉",
  "💯", "👀", "👋", "🤝", "👌", "🤞", "💜", "💙", "💚", "🖤",
  "☀️", "🌙", "⭐", "🌸", "🍕", "☕", "🎂", "🎁", "✅", "📌",
];

function isMine(
  viewer: ChatActor,
  sender: ChatMessage["sender"],
) {
  return (
    (viewer === "visitor" && sender === "visitor") ||
    (viewer === "page" && sender === "page")
  );
}

function lastSeenOutgoingId(
  messages: ChatMessage[],
  viewer: ChatActor,
  otherReadAt?: string | null,
) {
  const otherReadMs = otherReadAt ? Date.parse(otherReadAt) : Number.NaN;
  if (Number.isNaN(otherReadMs)) return "";
  let seenId = "";
  for (const message of messages) {
    if (
      isMine(viewer, message.sender) &&
      !message.pending &&
      Date.parse(message.createdAt) <= otherReadMs
    ) {
      seenId = message.id;
    }
  }
  return seenId;
}

function senderLabel(
  sender: ChatMessage["sender"],
  viewer: ChatActor,
  pageName: string,
  visitorName: string,
) {
  if (isMine(viewer, sender)) return "You";
  return sender === "page" ? pageName : visitorName;
}

function ImageSentMark() {
  return (
    <span className="image-sent">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3.5"
          y="5.5"
          width="17"
          height="13"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M3.8 16.2 8 12.2l3.2 3 4.1-5 5 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="9" r="1.2" fill="currentColor" />
      </svg>
      Image sent
    </span>
  );
}

export function MessageList({
  messages,
  viewer,
  pageName,
  visitorName,
  pageImageUrl,
  visitorImageUrl,
  pageReadAt,
  visitorReadAt,
  empty,
  retention,
  referredBy,
  onReply,
  onAct,
}: {
  messages: ChatMessage[];
  viewer: ChatActor;
  pageName: string;
  visitorName: string;
  pageImageUrl?: string | null;
  visitorImageUrl?: string | null;
  pageReadAt?: string | null;
  visitorReadAt?: string | null;
  empty: string;
  retention?: RetentionNotice | null;
  referredBy?: string | null;
  onReply?: (message: ChatMessage) => void;
  onAct?: (message: ChatMessage, action: ChatAction) => Promise<void> | void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [sheetId, setSheetId] = useState("");
  const [busy, setBusy] = useState(false);

  function onScroll() {
    const element = scroller.current;
    if (!element) return;
    stick.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 96;
  }

  useEffect(() => {
    const element = scroller.current;
    if (!element || !stick.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!sheetId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetId("");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetId]);

  const seenMessageId = lastSeenOutgoingId(
    messages,
    viewer,
    viewer === "page" ? visitorReadAt : pageReadAt,
  );
  const seenName = viewer === "page" ? visitorName : pageName;
  const seenImage = viewer === "page" ? visitorImageUrl : pageImageUrl;
  const seenKind = viewer === "page" ? "person" : "page";
  const pinned = messages.find((item) => item.pinned && !item.deleted);
  const sheetMessage = messages.find((item) => item.id === sheetId) ?? null;

  function jumpTo(id: string) {
    const node = scroller.current?.querySelector(`[data-msg="${id}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function runAction(message: ChatMessage, action: ChatAction) {
    if (!onAct || busy || message.pending) return;
    setBusy(true);
    setSheetId("");
    try {
      await onAct(message, action);
    } finally {
      setBusy(false);
    }
  }

  function openSheet(message: ChatMessage) {
    if (message.pending || message.deleted || !onAct) return;
    setSheetId(message.id);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-soft px-3 py-4 sm:px-6 sm:py-5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {viewer === "page" && referredBy ? (
          <p className="referral-banner" role="status">
            Referred by {referredBy}
          </p>
        ) : null}
        {retention ? (
          <p className="retention-notice" role="status">
            {retention.text}
          </p>
        ) : null}
        {messages.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-sm text-muted">
            {empty}
          </p>
        ) : (
          <div className="mx-auto mt-auto flex w-full max-w-3xl flex-col pb-2">
            {pinned ? (
              <button
                type="button"
                className="pin-banner"
                onClick={() => jumpTo(pinned.id)}
              >
                <span aria-hidden="true">📌</span>
                <span className="min-w-0 truncate">{chatSnippet(pinned)}</span>
              </button>
            ) : null}
            {messages.map((message, index) => {
              const mine = isMine(viewer, message.sender);
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const newDay =
                !previous || !sameDay(previous.createdAt, message.createdAt);
              const grouped =
                !newDay &&
                previous?.sender === message.sender &&
                Date.parse(message.createdAt) - Date.parse(previous.createdAt) <
                  1000 * 60 * 5;
              const lastInGroup =
                !next ||
                next.sender !== message.sender ||
                !sameDay(message.createdAt, next.createdAt) ||
                Date.parse(next.createdAt) - Date.parse(message.createdAt) >=
                  1000 * 60 * 5;
              const dayLabel = newDay
                ? formatDayLabel(message.createdAt)
                : "";
              const senderName =
                message.sender === "page" ? pageName : visitorName;
              const senderImage =
                message.sender === "page" ? pageImageUrl : visitorImageUrl;
              const avatar = mine ? null : lastInGroup ? (
                <PageAvatar
                  name={senderName}
                  imageUrl={senderImage}
                  size="xs"
                  kind={message.sender === "page" ? "page" : "person"}
                />
              ) : (
                <span className="avatar-xs invisible" aria-hidden="true" />
              );
              const reactions = message.reactions ?? [];
              const showPhoto =
                Boolean(message.imageUrl) &&
                !message.deleted &&
                viewer === "page";
              const showImageSent =
                Boolean(message.imageUrl) &&
                !message.deleted &&
                viewer !== "page";
              return (
                <Fragment key={message.id}>
                  {dayLabel ? (
                    <p className="day-divider" role="separator">
                      {dayLabel}
                    </p>
                  ) : null}
                  <div
                    data-msg={message.id}
                    className={`flex flex-col ${
                      mine ? "items-end" : "items-start"
                    } ${
                      reactions.length > 0 && !message.deleted
                        ? "mt-3"
                        : grouped || newDay
                          ? "mt-1"
                          : "mt-4"
                    }`}
                  >
                    <div
                      className={`flex max-w-[86%] items-end gap-1.5 sm:max-w-[78%] ${
                        mine ? "flex-row-reverse" : ""
                      } ${message.pending ? "opacity-60" : ""}`}
                    >
                      {avatar}
                      <div
                        className={`relative min-w-0 ${
                          reactions.length > 0 && !message.deleted
                            ? "pt-3.5"
                            : ""
                        }`}
                      >
                      <div
                        className={`text-[15px] leading-6 ${
                          mine ? "bubble-own" : "bubble-other"
                        } ${
                          showPhoto ? "bubble-media" : "px-3.5 py-2"
                        } ${
                          mine
                            ? lastInGroup
                              ? "rounded-[20px] rounded-br-md"
                              : "rounded-[20px]"
                            : lastInGroup
                              ? "rounded-[20px] rounded-bl-md"
                              : "rounded-[20px]"
                        } ${
                          message.deleted || message.pending || !onAct
                            ? ""
                            : "bubble-hit"
                        }`}
                        role={
                          message.deleted || message.pending || !onAct
                            ? undefined
                            : "button"
                        }
                        tabIndex={
                          message.deleted || message.pending || !onAct
                            ? undefined
                            : 0
                        }
                        aria-haspopup={
                          message.deleted || message.pending || !onAct
                            ? undefined
                            : "dialog"
                        }
                        aria-label={
                          message.deleted || message.pending || !onAct
                            ? undefined
                            : "Message actions"
                        }
                        onClick={() => openSheet(message)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSheet(message);
                          }
                        }}
                      >
                        {message.pinned && !message.deleted ? (
                          <p className="pin-label">Pinned</p>
                        ) : null}
                        {message.replyTo ? (
                          <div className="reply-quote">
                            <p className="reply-quote-name">
                              {senderLabel(
                                message.replyTo.sender,
                                viewer,
                                pageName,
                                visitorName,
                              )}
                            </p>
                            <p className="reply-quote-text">
                              {chatSnippet(message.replyTo)}
                            </p>
                          </div>
                        ) : null}
                        {message.deleted ? (
                          <p className="message-deleted">
                            This message was deleted
                          </p>
                        ) : (
                          <>
                            {showPhoto ? (
                              <img
                                src={message.imageUrl}
                                alt={message.body || "Photo"}
                                className="chat-image"
                              />
                            ) : null}
                            {showImageSent ? <ImageSentMark /> : null}
                            {message.body ? (
                              <p
                                className={`whitespace-pre-wrap break-words ${
                                  showPhoto ? "chat-caption" : ""
                                }`}
                              >
                                {message.body}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                      {reactions.length > 0 && !message.deleted ? (
                        <div
                          className={`absolute top-0 z-[2] flex max-w-full flex-wrap gap-0.5 ${
                            mine
                              ? "left-0.5"
                              : "right-0.5 justify-end"
                          }`}
                        >
                          {reactions.map((item) => (
                            <button
                              key={item.emoji}
                              type="button"
                              className={`reaction-pill ${
                                item.actors.includes(viewer)
                                  ? "reaction-pill-on"
                                  : ""
                              }`}
                              aria-label={`React ${item.emoji}`}
                              aria-pressed={item.actors.includes(viewer)}
                              onClick={(event) => {
                                event.stopPropagation();
                                void runAction(message, { reaction: item.emoji });
                              }}
                            >
                              <span>{item.emoji}</span>
                              {item.actors.length > 1 ? (
                                <span>{item.actors.length}</span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      </div>
                    </div>
                    {lastInGroup || message.id === seenMessageId ? (
                      <div
                        className={`message-meta ${
                          mine ? "message-meta-own" : "message-meta-other"
                        }`}
                      >
                        <span>
                          {message.pending
                            ? "Sending"
                            : formatTime(message.createdAt)}
                        </span>
                        {message.id === seenMessageId ? (
                          <span
                            className="seen-receipt"
                            aria-label="Seen"
                            title="Seen"
                          >
                            <svg
                              className="seen-eye"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2.5 12s3.4-7 9.5-7 9.5 7 9.5 7-3.4 7-9.5 7-9.5-7-9.5-7Z"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                              <circle
                                cx="12"
                                cy="12"
                                r="2.6"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              />
                            </svg>
                            <PageAvatar
                              name={seenName}
                              imageUrl={seenImage}
                              size="xs"
                              kind={seenKind}
                            />
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
      {sheetMessage ? (
        <div
          className="msg-sheet-backdrop"
          onClick={() => setSheetId("")}
        >
          <div
            className="msg-sheet"
            role="dialog"
            aria-label="Message actions"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="msg-sheet-emojis" role="listbox" aria-label="React">
              {REACT_EMOJIS.map((emoji) => {
                const selected = (sheetMessage.reactions ?? []).some(
                  (item) =>
                    item.emoji === emoji && item.actors.includes(viewer),
                );
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={`msg-sheet-emoji ${
                      selected ? "msg-sheet-emoji-on" : ""
                    }`}
                    aria-label={`React ${emoji}`}
                    aria-pressed={selected}
                    disabled={busy}
                    onClick={() =>
                      void runAction(sheetMessage, { reaction: emoji })
                    }
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="msg-sheet-item"
              disabled={busy}
              onClick={() => {
                onReply?.(sheetMessage);
                setSheetId("");
              }}
            >
              Reply
            </button>
            <button
              type="button"
              className="msg-sheet-item"
              disabled={busy}
              onClick={() =>
                void runAction(sheetMessage, { pin: !sheetMessage.pinned })
              }
            >
              {sheetMessage.pinned ? "Unpin" : "Pin"}
            </button>
            {viewer === "page" || isMine(viewer, sheetMessage.sender) ? (
              <button
                type="button"
                className="msg-sheet-item msg-sheet-item-danger"
                disabled={busy}
                onClick={() => void runAction(sheetMessage, { remove: true })}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Composer({
  onSend,
  onError,
  placeholder,
  replyTo,
  replyName,
  onCancelReply,
}: {
  onSend: (payload: ChatSend) => Promise<void>;
  onError: (message: string) => void;
  placeholder: string;
  replyTo?: ChatMessage | null;
  replyName?: string;
  onCancelReply?: () => void;
}) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!replyTo) return;
    inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onPointer(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setEmojiOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null);
    setPreviewUrl("");
  }

  async function chooseImage(file: File) {
    if (!file.type.startsWith("image/")) {
      onError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    try {
      const ready = file.type === "image/gif" ? file : await compressImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImage(ready);
      setPreviewUrl(URL.createObjectURL(ready));
      setEmojiOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not add that image.");
    }
  }

  function insertEmoji(emoji: string) {
    const field = inputRef.current;
    const start = field?.selectionStart ?? body.length;
    const end = field?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      field?.focus();
      const at = start + emoji.length;
      field?.setSelectionRange(at, at);
    });
  }

  async function submit() {
    const text = body.trim();
    if ((!text && !image) || sending) return;
    setSending(true);
    try {
      await onSend({
        body: text,
        image,
        replyToId: replyTo?.id ?? null,
      });
      setBody("");
      clearImage();
      setEmojiOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {replyTo ? (
        <div className="composer-reply">
          <div className="min-w-0 flex-1">
            <p className="composer-reply-name">{replyName || "Reply"}</p>
            <p className="composer-reply-text">{chatSnippet(replyTo)}</p>
          </div>
          <button
            className="composer-preview-remove"
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
          >
            ×
          </button>
        </div>
      ) : null}
      {previewUrl ? (
        <div className="composer-preview">
          <img src={previewUrl} alt="Selected" />
          <button
            className="composer-preview-remove"
            type="button"
            aria-label="Remove photo"
            onClick={clearImage}
          >
            ×
          </button>
        </div>
      ) : null}
      <div ref={pickerRef}>
        {emojiOpen ? (
          <div className="emoji-popover" role="listbox" aria-label="Emoji">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-btn"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        <div className="composer-row">
        <button
          className="composer-icon"
          type="button"
          aria-label="Emoji"
          aria-expanded={emojiOpen}
          onClick={() => setEmojiOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M8.4 14.2c.9 1.3 2.2 2 3.6 2s2.7-.7 3.6-2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="9" cy="10" r="1.1" fill="currentColor" />
            <circle cx="15" cy="10" r="1.1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="composer-icon"
          type="button"
          aria-label="Send photo"
          onClick={() => fileRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="3.5"
              y="5.5"
              width="17"
              height="13"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M3.8 16.2 8 12.2l3.2 3 4.1-5 5 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="9" r="1.2" fill="currentColor" />
          </svg>
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void chooseImage(file);
          }}
        />
        <label className="sr-only" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          ref={inputRef}
          className="field composer-input min-w-0 flex-1"
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          value={body}
          autoFocus
          onChange={(event) => setBody(event.target.value)}
          onPaste={(event) => {
            const file = [...event.clipboardData.files].find((item) =>
              item.type.startsWith("image/"),
            );
            if (!file) return;
            event.preventDefault();
            void chooseImage(file);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <button
          className="btn h-11 shrink-0 rounded-full px-4"
          type="submit"
          disabled={sending || (!body.trim() && !image)}
        >
          Send
        </button>
        </div>
      </div>
    </form>
  );
}
