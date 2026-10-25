import type { ChatActor, ChatReaction } from "@/lib/types";

const IMAGE_MARK = "\u200bIMG\u200b";
const MSG_MARK = "\u200bMSG\u200b";

export type MessageFields = {
  body: string;
  imageUrl: string | null;
  replyToId: string | null;
  deleted: boolean;
  pinned: boolean;
  reactions: ChatReaction[];
};

export const REACT_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👍",
  "🙏",
  "🔥",
  "🎉",
  "💯",
  "😍",
  "👏",
  "👀",
  "✨",
  "👋",
];

function blank(body = ""): MessageFields {
  return {
    body,
    imageUrl: null,
    replyToId: null,
    deleted: false,
    pinned: false,
    reactions: [],
  };
}

export function decodeChatBody(raw: string): MessageFields {
  if (raw.startsWith(MSG_MARK)) {
    const rest = raw.slice(MSG_MARK.length);
    const breakAt = rest.indexOf("\n");
    const json = breakAt < 0 ? rest : rest.slice(0, breakAt);
    const body = breakAt < 0 ? "" : rest.slice(breakAt + 1);
    try {
      const data = JSON.parse(json) as {
        i?: string;
        r?: string;
        d?: number;
        p?: number;
        x?: [string, ChatActor[]][];
      };
      return {
        body,
        imageUrl: data.i ?? null,
        replyToId: data.r ?? null,
        deleted: data.d === 1,
        pinned: data.p === 1,
        reactions: (data.x ?? [])
          .filter((item) => Array.isArray(item) && item[0])
          .map(([emoji, actors]) => ({
            emoji,
            actors: (actors ?? []).filter(
              (actor) => actor === "page" || actor === "visitor",
            ),
          }))
          .filter((item) => item.actors.length > 0),
      };
    } catch {
      return blank(body);
    }
  }
  if (raw.startsWith(IMAGE_MARK)) {
    const rest = raw.slice(IMAGE_MARK.length);
    const breakAt = rest.indexOf("\n");
    if (breakAt < 0) return { ...blank(""), imageUrl: rest || null };
    return {
      ...blank(rest.slice(breakAt + 1)),
      imageUrl: rest.slice(0, breakAt) || null,
    };
  }
  return blank(raw);
}

function encodeChatBody(body: string, imageUrl: string) {
  return `${IMAGE_MARK}${imageUrl}\n${body}`;
}

export function encodeChatPayload(fields: MessageFields) {
  const hasMeta =
    Boolean(fields.replyToId) ||
    fields.deleted ||
    fields.pinned ||
    fields.reactions.length > 0;
  if (!hasMeta) {
    if (fields.imageUrl) return encodeChatBody(fields.body, fields.imageUrl);
    return fields.body;
  }
  const data: Record<string, unknown> = {};
  if (fields.imageUrl) data.i = fields.imageUrl;
  if (fields.replyToId) data.r = fields.replyToId;
  if (fields.deleted) data.d = 1;
  if (fields.pinned) data.p = 1;
  if (fields.reactions.length) {
    data.x = fields.reactions.map((item) => [item.emoji, item.actors]);
  }
  return `${MSG_MARK}${JSON.stringify(data)}\n${fields.body}`;
}

export function toggleReaction(
  reactions: ChatReaction[],
  emoji: string,
  actor: ChatActor,
) {
  const next = reactions.map((item) => ({
    emoji: item.emoji,
    actors: [...item.actors],
  }));
  const found = next.find((item) => item.emoji === emoji);
  if (!found) return [...next, { emoji, actors: [actor] }];
  if (found.actors.includes(actor)) {
    found.actors = found.actors.filter((item) => item !== actor);
    return next.filter((item) => item.actors.length > 0);
  }
  found.actors.push(actor);
  return next;
}

export function chatSnippet(message: {
  body?: string;
  imageUrl?: string | null;
  deleted?: boolean;
}) {
  if (message.deleted) return "Deleted a message";
  if (message.body) return message.body;
  if (message.imageUrl) return "Photo";
  return "Message";
}

export function messagePreview(message: {
  body: string;
  image_url?: string | null;
}) {
  const parsed = decodeChatBody(message.body);
  if (parsed.deleted) return "Deleted a message";
  if (parsed.body) return parsed.body;
  if (message.image_url || parsed.imageUrl) return "Photo";
  return message.body;
}
