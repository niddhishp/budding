import { CONVERSATION_MESSAGE_LIMIT } from "./plans";

export type ConversationLink = { id: string; continuation_of: string | null };

/**
 * Number of saved messages in the conversation ending at `lastId`, counted by following
 * continuation links. An unknown or cyclic link is treated as a full conversation, so an
 * incomplete history can never make a turn free.
 */
export function conversationLength(rows: ConversationLink[], lastId: string, limit = CONVERSATION_MESSAGE_LIMIT) {
  const parent = new Map(rows.map(row => [row.id, row.continuation_of]));
  const seen = new Set<string>();
  let id: string | null = lastId, length = 0;
  while (id) {
    if (!parent.has(id) || seen.has(id) || length >= limit) return limit;
    seen.add(id);
    length++;
    id = parent.get(id) ?? null;
  }
  return length;
}

/** Whether the next message in a conversation of this length is included in its starting turn. */
export function nextMessageIncluded(length: number, limit = CONVERSATION_MESSAGE_LIMIT) {
  return length + 1 <= limit;
}
