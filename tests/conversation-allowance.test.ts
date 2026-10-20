import test from "node:test";
import assert from "node:assert/strict";
import { conversationLength, nextMessageIncluded } from "../src/lib/conversation-allowance";
import { CONVERSATION_MESSAGE_LIMIT } from "../src/lib/plans";

const chain = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, continuation_of: i ? `m${i}` : null }));

test("a conversation is counted by following its continuation links", () => {
  assert.equal(conversationLength(chain(1), "m1"), 1);
  assert.equal(conversationLength(chain(4), "m4"), 4);
  assert.equal(conversationLength(chain(4), "m2"), 2);
  assert(nextMessageIncluded(CONVERSATION_MESSAGE_LIMIT - 1));
  assert(!nextMessageIncluded(CONVERSATION_MESSAGE_LIMIT));
});

test("messages beyond the limit start a new conversation and incomplete history is never free", () => {
  assert.equal(conversationLength(chain(10), "m10"), 10);
  assert.equal(conversationLength(chain(25), "m25"), CONVERSATION_MESSAGE_LIMIT);
  // The oldest message was not loaded: treat the conversation as full rather than guessing.
  assert.equal(conversationLength(chain(5).slice(1), "m5"), CONVERSATION_MESSAGE_LIMIT);
  assert.equal(conversationLength(chain(3), "unknown"), CONVERSATION_MESSAGE_LIMIT);
  assert.equal(conversationLength([{ id: "a", continuation_of: "b" }, { id: "b", continuation_of: "a" }], "a"), CONVERSATION_MESSAGE_LIMIT);
});
