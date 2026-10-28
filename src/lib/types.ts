export type ChatActor = "visitor" | "page";

export type PublicPage = {
  name: string;
  slug: string;
  welcome: string;
  imageUrl: string | null;
};

export type PageSummary = PublicPage & {
  id: string;
  createdAt: string;
  conversationCount: number;
  lastActivityAt: string | null;
  lastPreview: string | null;
  unreadCount: number;
};

export type ConversationSummary = {
  id: string;
  visitorName: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    body: string;
    sender: ChatActor;
    createdAt: string;
  } | null;
};

export type PageDetail = {
  page: PublicPage & { id: string; createdAt: string };
  conversations: ConversationSummary[];
};

export type ChatReaction = {
  emoji: string;
  actors: ChatActor[];
};

export type ChatReplyPreview = {
  id: string;
  sender: ChatActor;
  body: string;
  imageUrl?: string | null;
  deleted?: boolean;
};

export type ChatMessage = {
  id: string;
  sender: ChatActor;
  body: string;
  imageUrl?: string | null;
  replyToId?: string | null;
  replyTo?: ChatReplyPreview | null;
  deleted?: boolean;
  pinned?: boolean;
  reactions?: ChatReaction[];
  createdAt: string;
  pending?: boolean;
};

export type ChatSend = {
  body: string;
  image?: File | null;
  replyToId?: string | null;
};

export type ChatAction = {
  reaction?: string;
  pin?: boolean;
  remove?: boolean;
};

export type RetentionNotice = {
  from: string;
  to: string;
  deleteOn: string;
  text: string;
};

export type Thread = {
  conversation: {
    id: string;
    visitorName: string;
    pageName: string;
    pageSlug: string;
    pageImageUrl: string | null;
    visitorImageUrl: string | null;
    pageReadAt: string | null;
    visitorReadAt: string | null;
    welcome: string;
    referredByName: string | null;
  };
  messages: ChatMessage[];
  retention?: RetentionNotice | null;
};

export type JoinResult = {
  conversationId: string;
};

export type SessionInfo = {
  role: "admin" | "user";
  email: string;
  name: string;
  canManagePages: boolean;
  imageUrl: string | null;
};

export type PageActor = {
  role: SessionInfo["role"];
  accountId: string | null;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type UserChatSummary = {
  conversationId: string;
  pageName: string;
  pageSlug: string;
  pageImageUrl: string | null;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    body: string;
    sender: ChatActor;
    createdAt: string;
  } | null;
};
