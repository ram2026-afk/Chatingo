import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { connection } from "next/server";
import { LIMITS, SESSION_SECONDS, type AccountRole } from "@/lib/constants";
import { HttpError } from "@/lib/errors";
import { adminCredentials, supabaseAdmin, supabaseAuthClient } from "@/lib/supabase";
import {
  decodeChatBody,
  encodeChatPayload,
  messagePreview,
  toggleReaction,
  type MessageFields,
} from "@/lib/chat-media";
import {
  messageInRetention,
  retainedFrom,
  retentionNotice,
  zonedDayKey,
} from "@/lib/retention";
import type {
  ChatAction,
  ChatActor,
  ChatMessage,
  PageActor,
  PublicPage,
  SessionInfo,
  StaffMember,
} from "@/lib/types";

export { HttpError, errorResponse } from "@/lib/errors";

type PageRow = {
  id: string;
  name: string;
  slug: string;
  welcome: string;
  image_url?: string | null;
  created_at: string;
};

type ImageUpload = {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type ConversationRow = {
  id: string;
  page_id: string;
  visitor_name: string;
  visitor_token: string;
  user_id: string | null;
  admin_read_at: string | null;
  user_read_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender: ChatActor;
  body: string;
  image_url?: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  image_url: string | null;
  created_at: string;
};

export type Session = {
  token: string;
  role: AccountRole;
  accountId: string | null;
  expiresAt: string;
};

function db() {
  return supabaseAdmin();
}

function tokensMatch(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function sameSecret(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function throwIf(error: { message?: string; code?: string } | null) {
  if (!error) return;
  console.error(error);
  if (error.code === "PGRST205" || error.message?.includes("schema cache")) {
    throw new HttpError(
      503,
      "Database tables are missing. Run supabase/schema.sql in the Supabase SQL editor.",
    );
  }
  throw new HttpError(500, "Something went wrong.");
}

let purgedForDay = "";

export async function purgeDueMessages(now = new Date()) {
  const key = zonedDayKey(now);
  if (purgedForDay === key) return;
  const { error } = await db()
    .from("messages")
    .delete()
    .lt("created_at", retainedFrom(now).toISOString());
  throwIf(error);
  purgedForDay = key;
}

function cleanText(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${label} is required.`);
  }
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < min || text.length > max) {
    throw new HttpError(400, `${label} must be ${min}–${max} characters.`);
  }
  return text;
}

function cleanWelcome(value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") {
    throw new HttpError(400, "Welcome message is invalid.");
  }
  const text = value.trim();
  if (text.length > LIMITS.welcome) {
    throw new HttpError(
      400,
      `Welcome message must be ${LIMITS.welcome} characters or fewer.`,
    );
  }
  return text;
}

function cleanEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new HttpError(400, "Email is required.");
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  return email;
}

function cleanMessage(value: unknown, allowEmpty = false) {
  if (value == null || value === "") {
    if (allowEmpty) return "";
    throw new HttpError(400, "Message is required.");
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "Message is required.");
  }
  const text = value.trim();
  if (!text) {
    if (allowEmpty) return "";
    throw new HttpError(400, `Message must be 1–${LIMITS.message} characters.`);
  }
  if (text.length > LIMITS.message) {
    throw new HttpError(400, `Message must be 1–${LIMITS.message} characters.`);
  }
  return text;
}

function slugify(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "page";
  return `${base}-${randomBytes(2).toString("hex")}`;
}

function publicPage(page: PageRow, imageUrl: string | null = null): PublicPage {
  return {
    name: page.name,
    slug: page.slug,
    welcome: page.welcome,
    imageUrl: page.image_url ?? imageUrl,
  };
}

async function publicPageWithImage(page: PageRow, images?: Map<string, string>) {
  if (page.image_url) return publicPage(page);
  const stored = images ?? (await pageImageMap());
  return publicPage(page, stored.get(page.id) ?? null);
}

function profileDto(profile: ProfileRow): StaffMember {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    createdAt: profile.created_at,
  };
}

function fieldsFromRow(message: MessageRow): MessageFields {
  const parsed = decodeChatBody(message.body);
  if (message.image_url && !parsed.imageUrl) parsed.imageUrl = message.image_url;
  return parsed;
}

function messageDto(message: MessageRow): ChatMessage {
  const parsed = fieldsFromRow(message);
  return {
    id: message.id,
    sender: message.sender,
    body: parsed.deleted ? "" : parsed.body,
    imageUrl: parsed.deleted ? null : parsed.imageUrl,
    replyToId: parsed.replyToId,
    deleted: parsed.deleted,
    pinned: parsed.pinned,
    reactions: parsed.reactions,
    createdAt: message.created_at,
  };
}

function hydrateReplies(messages: ChatMessage[]) {
  const byId = new Map(messages.map((item) => [item.id, item]));
  return messages.map((item) => {
    if (!item.replyToId) return item;
    const parent = byId.get(item.replyToId);
    if (!parent) return item;
    return {
      ...item,
      replyTo: {
        id: parent.id,
        sender: parent.sender,
        body: parent.body,
        imageUrl: parent.imageUrl,
        deleted: parent.deleted,
      },
    };
  });
}

function lastMessageDto(message: MessageRow) {
  return {
    body: messagePreview(message),
    sender: message.sender,
    createdAt: message.created_at,
  };
}

function missingImageColumn(error: { message?: string; code?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    text.includes("image_url") ||
    text.includes("pgrst204") ||
    text.includes("schema cache")
  );
}

function imageExt(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

async function requirePage(id: string) {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIf(error);
  if (!data) throw new HttpError(404, "Page not found.");
  return data as PageRow;
}

async function requirePageBySlug(slug: string) {
  const { data, error } = await db()
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  throwIf(error);
  if (!data) throw new HttpError(404, "This page does not exist.");
  return data as PageRow;
}

async function userHasPage(userId: string | null, pageId: string) {
  if (!userId) return false;
  const { data, error } = await db()
    .from("page_access")
    .select("page_id")
    .eq("page_id", pageId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIf(error);
  return Boolean(data);
}

async function assertCanManagePage(actor: PageActor, pageId: string) {
  if (actor.role === "admin") return;
  if (actor.role === "user" && (await userHasPage(actor.accountId, pageId))) {
    return;
  }
  throw new HttpError(403, "You do not have access to this page.");
}

function profileName(
  metadata: Record<string, unknown> | undefined,
  email: string,
) {
  for (const key of ["name", "full_name", "given_name"] as const) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return email.split("@")[0] || "User";
}

function profileImage(metadata: Record<string, unknown> | undefined) {
  for (const key of ["avatar_url", "picture"] as const) {
    const value = metadata?.[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  return null;
}

async function getProfile(id: string) {
  const { data, error } = await db()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIf(error);
  return (data as ProfileRow | null) ?? null;
}

async function resolveProfileImage(profile: ProfileRow) {
  if (profile.image_url) return profile.image_url;
  const { data } = await db().auth.admin.getUserById(profile.id);
  const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
  const fromMeta = profileImage(meta);
  if (fromMeta) return fromMeta;
  const { data: files } = await db().storage.from("avatars").list(profile.id);
  const file = files?.find((item) => item.name.startsWith("avatar."));
  if (!file) return null;
  const { data: published } = db()
    .storage.from("avatars")
    .getPublicUrl(`${profile.id}/${file.name}`);
  return `${published.publicUrl}?v=${file.updated_at ?? Date.now()}`;
}

async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const existing = await getProfile(user.id);
  if (existing) return existing;
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) throw new HttpError(500, "Something went wrong.");
  const name = profileName(user.user_metadata, email);
  const { data, error } = await db()
    .from("profiles")
    .upsert({ id: user.id, email, name }, { onConflict: "id" })
    .select("*")
    .single();
  throwIf(error);
  const created = data as ProfileRow;
  const imageUrl = profileImage(user.user_metadata);
  if (!imageUrl || created.image_url) return created;
  const { data: withImage } = await db()
    .from("profiles")
    .update({ image_url: imageUrl })
    .eq("id", user.id)
    .select("*")
    .single();
  return (withImage as ProfileRow | null) ?? created;
}

async function conversationResult(page: PageRow, conversation: ConversationRow) {
  return {
    conversationId: conversation.id,
    token: conversation.visitor_token,
    visitorName: conversation.visitor_name,
    page: await publicPageWithImage(page),
  };
}

async function lastMessages(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map<string, MessageRow>();
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });
  throwIf(error);
  const last = new Map<string, MessageRow>();
  for (const message of (data ?? []) as MessageRow[]) {
    last.set(message.conversation_id, message);
  }
  return last;
}

async function unreadVisitorCount(conversation: ConversationRow) {
  let query = db()
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("sender", "visitor");
  if (conversation.admin_read_at) {
    query = query.gt("created_at", conversation.admin_read_at);
  }
  const { count, error } = await query;
  throwIf(error);
  return count ?? 0;
}

async function unreadPageCount(conversation: ConversationRow) {
  let query = db()
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .eq("sender", "page");
  if (conversation.user_read_at) {
    query = query.gt("created_at", conversation.user_read_at);
  }
  const { count, error } = await query;
  throwIf(error);
  return count ?? 0;
}

async function pruneSessions() {
  await db().from("sessions").delete().lt("expires_at", new Date().toISOString());
}

function readPassword(value: unknown, minimum = 6) {
  if (typeof value !== "string" || !value) {
    throw new HttpError(400, "Password is required.");
  }
  if (value.length < minimum || value.length > LIMITS.password) {
    throw new HttpError(
      400,
      `Password must be ${minimum}–${LIMITS.password} characters.`,
    );
  }
  return value;
}

export async function signUpUser(input: {
  name: unknown;
  email: unknown;
  password: unknown;
}) {
  await connection();
  const name = cleanText(input.name, "Name", 2, LIMITS.staffName);
  const email = cleanEmail(input.email);
  const password = readPassword(input.password);
  try {
    if (email === adminCredentials().email) {
      throw new HttpError(400, "That email is not available.");
    }
  } catch (error) {
    if (error instanceof HttpError && error.status !== 503) throw error;
  }
  const { data, error } = await db().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    if (error?.message.toLowerCase().includes("already")) {
      throw new HttpError(400, "An account with that email already exists.");
    }
    throw new HttpError(400, error?.message || "Could not create an account.");
  }
  await ensureProfile({
    id: data.user.id,
    email,
    user_metadata: { name },
  });
  return createSession("user", data.user.id);
}

export async function loginUser(emailInput: unknown, passwordInput: unknown) {
  await connection();
  const email = cleanEmail(emailInput);
  const password = readPassword(passwordInput, 1);
  try {
    if (email === adminCredentials().email) {
      throw new HttpError(403, "Use the admin sign-in page.");
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) throw error;
  }
  const { data, error } = await supabaseAuthClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  await ensureProfile(data.user);
  return createSession("user", data.user.id);
}

export async function loginWithGoogle(accessToken: unknown) {
  await connection();
  if (typeof accessToken !== "string" || !accessToken) {
    throw new HttpError(400, "Google sign-in did not finish.");
  }
  const { data, error } = await supabaseAuthClient().auth.getUser(accessToken);
  if (error || !data.user) {
    throw new HttpError(401, "Google sign-in did not finish.");
  }
  const email = (data.user.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new HttpError(400, "Google did not share an email address.");
  }
  try {
    if (email === adminCredentials().email) {
      throw new HttpError(403, "Use the admin sign-in page.");
    }
  } catch (caught) {
    if (caught instanceof HttpError && caught.status === 403) throw caught;
  }
  await ensureProfile({
    id: data.user.id,
    email,
    user_metadata: data.user.user_metadata,
  });
  return createSession("user", data.user.id);
}

export async function loginAdmin(emailInput: unknown, passwordInput: unknown) {
  await connection();
  const email = cleanEmail(emailInput);
  const password = readPassword(passwordInput, 1);
  const admin = adminCredentials();
  if (!sameSecret(email, admin.email) || !sameSecret(password, admin.password)) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  return createSession("admin", null);
}

export async function sessionInfo(session: Session): Promise<SessionInfo> {
  await connection();
  if (session.role === "admin") {
    const email = process.env.ADMIN_EMAIL?.trim() || "Admin";
    return {
      role: "admin",
      email,
      name: "Admin",
      canManagePages: true,
      imageUrl: null,
    };
  }
  if (!session.accountId) throw new HttpError(401, "Sign in required.");
  const profile = await getProfile(session.accountId);
  if (!profile) throw new HttpError(401, "Sign in required.");
  const { count, error } = await db()
    .from("page_access")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id);
  throwIf(error);
  return {
    role: "user",
    email: profile.email,
    name: profile.name,
    canManagePages: (count ?? 0) > 0,
    imageUrl: await resolveProfileImage(profile),
  };
}

async function ensureAvatarBucket() {
  const options = {
    public: true,
    fileSizeLimit: LIMITS.avatarBytes,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  };
  const { data } = await db().storage.getBucket("avatars");
  if (!data) {
    const { error } = await db().storage.createBucket("avatars", options);
    if (error && !error.message.toLowerCase().includes("already")) throwIf(error);
    return;
  }
  if ((data.file_size_limit ?? 0) < LIMITS.avatarBytes) {
    const { error } = await db().storage.updateBucket("avatars", {
      public: true,
      fileSizeLimit: LIMITS.avatarBytes,
    });
    if (error && !error.message.toLowerCase().includes("already")) throwIf(error);
  }
}

function assertImageFile(file: ImageUpload) {
  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (!allowed.includes(file.type)) {
    throw new HttpError(400, "Use a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size < 1) {
    throw new HttpError(400, "Choose an image to upload.");
  }
  if (file.size > LIMITS.avatarBytes) {
    throw new HttpError(400, "Could not process that image.");
  }
}

async function uploadPublicImage(path: string, file: ImageUpload) {
  assertImageFile(file);
  await ensureAvatarBucket();
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await db().storage.from("avatars").upload(path, body, {
    contentType: file.type,
    upsert: true,
  });
  throwIf(error);
  const { data } = db().storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function pageImageMap() {
  const { data, error } = await db().storage.from("avatars").list("pages");
  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const file of data) {
    const { data: published } = db()
      .storage.from("avatars")
      .getPublicUrl(`pages/${file.name}`);
    map.set(file.name, `${published.publicUrl}?v=${file.updated_at ?? Date.now()}`);
  }
  return map;
}

export async function updateProfileImage(
  userId: string,
  file: { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
) {
  await connection();
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const imageUrl = await uploadPublicImage(`${userId}/avatar.${ext}`, file);
  const { error } = await db()
    .from("profiles")
    .update({ image_url: imageUrl })
    .eq("id", userId);
  if (error && !error.message.includes("image_url")) throwIf(error);
  const { error: metaError } = await db().auth.admin.updateUserById(userId, {
    user_metadata: { avatar_url: imageUrl },
  });
  throwIf(metaError);
  return imageUrl;
}

export async function createSession(
  role: AccountRole,
  accountId: string | null = null,
) {
  await connection();
  await pruneSessions();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const { error } = await db().from("sessions").insert({
    token,
    role,
    account_id: accountId,
    expires_at: expiresAt,
  });
  throwIf(error);
  return { token, role, accountId, expiresAt };
}

export async function getSession(token: string | undefined) {
  if (!token) return null;
  await connection();
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  throwIf(error);
  if (!data || Date.parse(data.expires_at) <= Date.now()) return null;
  if (data.role !== "admin" && data.role !== "user") return null;
  const session: Session = {
    token: data.token,
    role: data.role,
    accountId: data.account_id ?? null,
    expiresAt: data.expires_at,
  };
  if (session.role === "user") {
    if (!session.accountId) return null;
    const profile = await getProfile(session.accountId);
    if (!profile) return null;
  }
  return session;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await connection();
  await db().from("sessions").delete().eq("token", token);
}

export async function listPageStaff(pageId: string) {
  await connection();
  await requirePage(pageId);
  const { data, error } = await db()
    .from("page_access")
    .select("created_at, profiles!user_id (id, email, name, created_at)")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false });
  throwIf(error);
  return (data ?? []).flatMap((row) => {
    const profile = row.profiles as ProfileRow | ProfileRow[] | null;
    const person = Array.isArray(profile) ? profile[0] : profile;
    return person ? [profileDto(person)] : [];
  });
}

export async function grantPageAccess(pageId: string, input: { email: unknown }) {
  await connection();
  const email = cleanEmail(input.email);
  try {
    if (email === adminCredentials().email) {
      throw new HttpError(400, "Admin already has access to every page.");
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 400) throw error;
  }
  await requirePage(pageId);
  const { data: profile, error: profileError } = await db()
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  throwIf(profileError);
  if (!profile) {
    throw new HttpError(404, "No user with that email. They need to sign in first.");
  }
  const person = profile as ProfileRow;
  const { data: existing, error: accessError } = await db()
    .from("page_access")
    .select("page_id")
    .eq("page_id", pageId)
    .eq("user_id", person.id)
    .maybeSingle();
  throwIf(accessError);
  if (existing) {
    throw new HttpError(400, "That person already has access to this page.");
  }
  const { error } = await db().from("page_access").insert({
    page_id: pageId,
    user_id: person.id,
  });
  throwIf(error);
  return profileDto(person);
}

export async function revokePageAccess(pageId: string, userId: string) {
  await connection();
  await requirePage(pageId);
  const { data, error } = await db()
    .from("page_access")
    .delete()
    .eq("page_id", pageId)
    .eq("user_id", userId)
    .select("user_id");
  throwIf(error);
  if (!data?.length) throw new HttpError(404, "That person was not found.");
}

export async function createPage(input: {
  name: unknown;
  welcome: unknown;
  image?: ImageUpload | null;
}) {
  await connection();
  const name = cleanText(input.name, "Page name", 2, LIMITS.pageName);
  const welcome = cleanWelcome(input.welcome);
  if (input.image) assertImageFile(input.image);
  let page: PageRow | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await db()
      .from("pages")
      .insert({ name, slug: slugify(name), welcome })
      .select("*")
      .single();
    if (!error && data) {
      page = data as PageRow;
      break;
    }
    if (error?.code !== "23505") throwIf(error);
  }
  if (!page) throw new HttpError(500, "Could not create the page.");
  if (!input.image) return page;
  const imageUrl = await uploadPublicImage(`pages/${page.id}`, input.image);
  const { error } = await db()
    .from("pages")
    .update({ image_url: imageUrl })
    .eq("id", page.id);
  if (error && !error.message.includes("image_url")) throwIf(error);
  return { ...page, image_url: imageUrl };
}

export async function listPages(actor: PageActor) {
  await connection();
  await purgeDueMessages();
  let pages: PageRow[] = [];
  if (actor.role === "admin") {
    const { data, error } = await db()
      .from("pages")
      .select("*")
      .order("created_at", { ascending: false });
    throwIf(error);
    pages = (data ?? []) as PageRow[];
  } else if (actor.accountId) {
    const { data: access, error: accessError } = await db()
      .from("page_access")
      .select("page_id")
      .eq("user_id", actor.accountId);
    throwIf(accessError);
    const ids = (access ?? []).map((row) => row.page_id);
    if (ids.length === 0) return [];
    const { data, error } = await db()
      .from("pages")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    throwIf(error);
    pages = (data ?? []) as PageRow[];
  }
  const images = await pageImageMap();
  return Promise.all(
    pages.map(async (page) => {
      const { data: conversations, error } = await db()
        .from("conversations")
        .select("*")
        .eq("page_id", page.id);
      throwIf(error);
      const list = (conversations ?? []) as ConversationRow[];
      const last = await lastMessages(list.map((item) => item.id));
      const unreadCounts = await Promise.all(list.map(unreadVisitorCount));
      const lastActivityAt = list.reduce<string | null>(
        (latest, conversation) =>
          !latest || conversation.updated_at > latest
            ? conversation.updated_at
            : latest,
        null,
      );
      const latestMessage = list
        .map((conversation) => last.get(conversation.id))
        .filter((message): message is MessageRow => Boolean(message))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .at(-1);
      return {
        ...(await publicPageWithImage(page, images)),
        id: page.id,
        createdAt: page.created_at,
        conversationCount: list.length,
        lastActivityAt,
        lastPreview: latestMessage ? messagePreview(latestMessage) : null,
        unreadCount: unreadCounts.reduce((total, count) => total + count, 0),
      };
    }),
  );
}

export async function getPageDetail(id: string, actor: PageActor) {
  await connection();
  await purgeDueMessages();
  const page = await requirePage(id);
  await assertCanManagePage(actor, page.id);
  const { data: conversations, error } = await db()
    .from("conversations")
    .select("*")
    .eq("page_id", page.id)
    .order("updated_at", { ascending: false });
  throwIf(error);
  const list = (conversations ?? []) as ConversationRow[];
  const last = await lastMessages(list.map((item) => item.id));
  const details = await Promise.all(
    list.map(async (conversation) => {
      const message = last.get(conversation.id);
      return {
        id: conversation.id,
        visitorName: conversation.visitor_name,
        updatedAt: conversation.updated_at,
        unreadCount: await unreadVisitorCount(conversation),
        lastMessage: message ? lastMessageDto(message) : null,
      };
    }),
  );
  return {
    page: {
      ...(await publicPageWithImage(page)),
      id: page.id,
      createdAt: page.created_at,
    },
    conversations: details,
  };
}

export async function updatePageImage(id: string, file: ImageUpload | null) {
  await connection();
  const page = await requirePage(id);
  if (!file) {
    await db().storage.from("avatars").remove([`pages/${id}`]);
    const { error } = await db()
      .from("pages")
      .update({ image_url: null })
      .eq("id", id);
    if (error && !error.message.includes("image_url")) throwIf(error);
    return {
      ...publicPage({ ...page, image_url: null }),
      id: page.id,
      createdAt: page.created_at,
    };
  }
  const imageUrl = await uploadPublicImage(`pages/${id}`, file);
  const { error } = await db()
    .from("pages")
    .update({ image_url: imageUrl })
    .eq("id", id);
  if (error && !error.message.includes("image_url")) throwIf(error);
  return {
    ...publicPage({ ...page, image_url: imageUrl }),
    id: page.id,
    createdAt: page.created_at,
  };
}

export async function deletePage(id: string) {
  await connection();
  await requirePage(id);
  const { error } = await db().from("pages").delete().eq("id", id);
  throwIf(error);
  await db().storage.from("avatars").remove([`pages/${id}`]);
}

export async function getPublicPage(slug: string) {
  await connection();
  return publicPageWithImage(await requirePageBySlug(slug));
}

export async function userManagesSlug(slug: string, userId: string | null) {
  await connection();
  if (!userId) return false;
  const { data: page, error } = await db()
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  throwIf(error);
  if (!page) return false;
  return userHasPage(userId, page.id);
}

export async function joinPage(slug: string, nameInput: unknown) {
  await connection();
  const visitorName = cleanText(nameInput, "Name", 1, LIMITS.visitorName);
  const page = await requirePageBySlug(slug);
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("conversations")
    .insert({
      page_id: page.id,
      visitor_name: visitorName,
      visitor_token: randomBytes(32).toString("hex"),
      user_id: null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  throwIf(error);
  return conversationResult(page, data as ConversationRow);
}

export async function joinPageAsUser(slug: string, userId: string) {
  await connection();
  const page = await requirePageBySlug(slug);
  const profile = await getProfile(userId);
  if (!profile) throw new HttpError(401, "Sign in required.");
  const { data: existing, error: existingError } = await db()
    .from("conversations")
    .select("*")
    .eq("page_id", page.id)
    .eq("user_id", userId)
    .maybeSingle();
  throwIf(existingError);
  if (existing) return conversationResult(page, existing as ConversationRow);
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("conversations")
    .insert({
      page_id: page.id,
      visitor_name: profile.name,
      visitor_token: randomBytes(32).toString("hex"),
      user_id: userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: again, error: againError } = await db()
      .from("conversations")
      .select("*")
      .eq("page_id", page.id)
      .eq("user_id", userId)
      .maybeSingle();
    throwIf(againError);
    if (again) return conversationResult(page, again as ConversationRow);
  }
  throwIf(error);
  return conversationResult(page, data as ConversationRow);
}

export async function listUserChats(userId: string) {
  await connection();
  await purgeDueMessages();
  const { data: conversations, error } = await db()
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  throwIf(error);
  const list = (conversations ?? []) as ConversationRow[];
  const last = await lastMessages(list.map((item) => item.id));
  const images = await pageImageMap();
  const chats = await Promise.all(
    list.map(async (conversation) => {
      const { data: page, error: pageError } = await db()
        .from("pages")
        .select("*")
        .eq("id", conversation.page_id)
        .maybeSingle();
      throwIf(pageError);
      if (!page) return [];
      const message = last.get(conversation.id);
      const row = page as PageRow;
      return [
        {
          conversationId: conversation.id,
          pageName: row.name,
          pageSlug: row.slug,
          pageImageUrl: (await publicPageWithImage(row, images)).imageUrl,
          updatedAt: conversation.updated_at,
          unreadCount: await unreadPageCount(conversation),
          lastMessage: message ? lastMessageDto(message) : null,
        },
      ];
    }),
  );
  return chats.flat();
}

async function toThread(conversation: ConversationRow) {
  await purgeDueMessages();
  const page = await requirePage(conversation.page_id);
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });
  throwIf(error);
  const publicInfo = await publicPageWithImage(page);
  let visitorImageUrl: string | null = null;
  if (conversation.user_id) {
    const profile = await getProfile(conversation.user_id);
    if (profile) visitorImageUrl = await resolveProfileImage(profile);
  }
  const messages = hydrateReplies(((data ?? []) as MessageRow[]).map(messageDto));
  const notice = retentionNotice();
  const retention =
    notice && messages.some((item) => messageInRetention(item.createdAt, notice))
      ? notice
      : null;
  return {
    conversation: {
      id: conversation.id,
      visitorName: conversation.visitor_name,
      pageName: page.name,
      pageSlug: page.slug,
      pageImageUrl: publicInfo.imageUrl,
      visitorImageUrl,
      pageReadAt: conversation.admin_read_at,
      visitorReadAt: conversation.user_read_at,
      welcome: page.welcome,
    },
    messages,
    retention,
  };
}

async function requireConversation(id: string) {
  const { data, error } = await db()
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIf(error);
  if (!data) throw new HttpError(404, "Conversation not found.");
  return data as ConversationRow;
}

async function markPageRead(conversation: ConversationRow) {
  if ((await unreadVisitorCount(conversation)) === 0) return;
  const { data: lastVisitor } = await db()
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversation.id)
    .eq("sender", "visitor")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const readAt = lastVisitor?.created_at ?? new Date().toISOString();
  await db()
    .from("conversations")
    .update({ admin_read_at: readAt })
    .eq("id", conversation.id);
  conversation.admin_read_at = readAt;
}

async function markVisitorRead(conversation: ConversationRow) {
  if ((await unreadPageCount(conversation)) === 0) return;
  const { data: lastPage } = await db()
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversation.id)
    .eq("sender", "page")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const readAt = lastPage?.created_at ?? new Date().toISOString();
  await db()
    .from("conversations")
    .update({ user_read_at: readAt })
    .eq("id", conversation.id);
  conversation.user_read_at = readAt;
}

export async function getThreadForAdmin(conversationId: string, actor: PageActor) {
  await connection();
  const conversation = await requireConversation(conversationId);
  await assertCanManagePage(actor, conversation.page_id);
  await markPageRead(conversation);
  return toThread(conversation);
}

export async function getThreadForVisitor(conversationId: string, token: string) {
  await connection();
  const conversation = await requireConversation(conversationId);
  if (!tokensMatch(conversation.visitor_token, token)) {
    throw new HttpError(401, "Join this page again to continue.");
  }
  await markVisitorRead(conversation);
  return toThread(conversation);
}

export async function getThreadForUser(conversationId: string, userId: string) {
  await connection();
  const conversation = await requireConversation(conversationId);
  if (conversation.user_id !== userId) {
    throw new HttpError(403, "This conversation is not yours.");
  }
  await markVisitorRead(conversation);
  return toThread(conversation);
}

function readReplyToId(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "Reply is invalid.");
  }
  const id = value.trim();
  if (!/^[0-9a-f-]{16,}$/i.test(id)) {
    throw new HttpError(400, "Reply is invalid.");
  }
  return id;
}

async function appendMessage(
  conversation: ConversationRow,
  sender: ChatActor,
  body: string,
  image?: ImageUpload | null,
  replyToId?: string | null,
) {
  const now = new Date().toISOString();
  let imageUrl: string | null = null;
  if (image) {
    imageUrl = await uploadPublicImage(
      `chats/${conversation.id}/${randomBytes(12).toString("hex")}.${imageExt(image.type)}`,
      image,
    );
  }
  if (!body && !imageUrl) {
    throw new HttpError(400, "Message is required.");
  }
  let parentRow: MessageRow | null = null;
  if (replyToId) {
    const { data: parent, error } = await db()
      .from("messages")
      .select("*")
      .eq("id", replyToId)
      .eq("conversation_id", conversation.id)
      .maybeSingle();
    throwIf(error);
    if (!parent) throw new HttpError(404, "That message is gone.");
    parentRow = parent as MessageRow;
  }

  const encoded = encodeChatPayload({
    body,
    imageUrl,
    replyToId: replyToId ?? null,
    deleted: false,
    pinned: false,
    reactions: [],
  });
  const base = {
    conversation_id: conversation.id,
    sender,
    created_at: now,
    body: encoded,
  };
  let { data, error } = await db()
    .from("messages")
    .insert({
      ...base,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    } as typeof base)
    .select("*")
    .single();
  if (error && imageUrl && missingImageColumn(error)) {
    const fallback = await db().from("messages").insert(base).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }
  throwIf(error);
  await db()
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversation.id);
  const dto = messageDto(data as MessageRow);
  if (!parentRow) return dto;
  const parent = messageDto(parentRow);
  dto.replyTo = {
    id: parent.id,
    sender: parent.sender,
    body: parent.body,
    imageUrl: parent.imageUrl,
    deleted: parent.deleted,
  };
  return dto;
}

export async function addVisitorMessage(
  conversationId: string,
  token: string,
  bodyInput: unknown,
  image?: ImageUpload | null,
  replyToId?: unknown,
) {
  await connection();
  const body = cleanMessage(bodyInput, Boolean(image));
  const conversation = await requireConversation(conversationId);
  if (!tokensMatch(conversation.visitor_token, token)) {
    throw new HttpError(401, "Join this page again to send a message.");
  }
  return appendMessage(
    conversation,
    "visitor",
    body,
    image,
    readReplyToId(replyToId),
  );
}

export async function addUserMessage(
  conversationId: string,
  userId: string,
  bodyInput: unknown,
  image?: ImageUpload | null,
  replyToId?: unknown,
) {
  await connection();
  const body = cleanMessage(bodyInput, Boolean(image));
  const conversation = await requireConversation(conversationId);
  if (conversation.user_id !== userId) {
    throw new HttpError(403, "This conversation is not yours.");
  }
  return appendMessage(
    conversation,
    "visitor",
    body,
    image,
    readReplyToId(replyToId),
  );
}

export async function addPageMessage(
  conversationId: string,
  bodyInput: unknown,
  actor: PageActor,
  image?: ImageUpload | null,
  replyToId?: unknown,
) {
  await connection();
  const body = cleanMessage(bodyInput, Boolean(image));
  const conversation = await requireConversation(conversationId);
  await assertCanManagePage(actor, conversation.page_id);
  return appendMessage(
    conversation,
    "page",
    body,
    image,
    readReplyToId(replyToId),
  );
}

async function requireMessage(conversationId: string, messageId: string) {
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  throwIf(error);
  if (!data) throw new HttpError(404, "Message not found.");
  return data as MessageRow;
}

async function saveFields(row: MessageRow, fields: MessageFields) {
  const body = encodeChatPayload(fields);
  const { data, error } = await db()
    .from("messages")
    .update({ body })
    .eq("id", row.id)
    .select("*")
    .single();
  throwIf(error);
  return messageDto(data as MessageRow);
}

async function unpinOthers(conversationId: string, keepId: string) {
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId);
  throwIf(error);
  for (const row of (data ?? []) as MessageRow[]) {
    if (row.id === keepId) continue;
    const fields = fieldsFromRow(row);
    if (!fields.pinned) continue;
    fields.pinned = false;
    const { error: updateError } = await db()
      .from("messages")
      .update({ body: encodeChatPayload(fields) })
      .eq("id", row.id);
    throwIf(updateError);
  }
}

async function applyMessageAction(
  conversation: ConversationRow,
  actor: ChatActor,
  messageId: string,
  action: ChatAction,
) {
  const row = await requireMessage(conversation.id, messageId);
  const fields = fieldsFromRow(row);
  if (action.remove) {
    if (actor === "visitor" && row.sender !== "visitor") {
      throw new HttpError(403, "You can only delete your messages.");
    }
    fields.body = "";
    fields.imageUrl = null;
    fields.deleted = true;
    fields.pinned = false;
    fields.reactions = [];
    return saveFields(row, fields);
  }
  if (fields.deleted) {
    throw new HttpError(400, "That message was deleted.");
  }
  if (typeof action.pin === "boolean") {
    if (action.pin) await unpinOthers(conversation.id, row.id);
    fields.pinned = action.pin;
    return saveFields(row, fields);
  }
  if (action.reaction) {
    const emoji = action.reaction.trim();
    if (!emoji || emoji.length > 8) {
      throw new HttpError(400, "Choose an emoji.");
    }
    fields.reactions = toggleReaction(fields.reactions, emoji, actor);
    return saveFields(row, fields);
  }
  throw new HttpError(400, "Choose an action.");
}

export async function actOnVisitorMessage(
  conversationId: string,
  token: string,
  messageId: string,
  action: ChatAction,
) {
  await connection();
  const conversation = await requireConversation(conversationId);
  if (!tokensMatch(conversation.visitor_token, token)) {
    throw new HttpError(401, "Join this page again to continue.");
  }
  return applyMessageAction(conversation, "visitor", messageId, action);
}

export async function actOnUserMessage(
  conversationId: string,
  userId: string,
  messageId: string,
  action: ChatAction,
) {
  await connection();
  const conversation = await requireConversation(conversationId);
  if (conversation.user_id !== userId) {
    throw new HttpError(403, "This conversation is not yours.");
  }
  return applyMessageAction(conversation, "visitor", messageId, action);
}

export async function actOnPageMessage(
  conversationId: string,
  actor: PageActor,
  messageId: string,
  action: ChatAction,
) {
  await connection();
  const conversation = await requireConversation(conversationId);
  await assertCanManagePage(actor, conversation.page_id);
  return applyMessageAction(conversation, "page", messageId, action);
}
