import test from "node:test";
import assert from "node:assert/strict";
import { converse } from "../../src/lib/ai/conversation";
import type { checkedCall } from "../../src/lib/ai/checked-content";
import type { DecodeContext } from "../../src/lib/ai/decode";
const context = {
  child: { name: "Synthetic", age: { years: 11, months: 0, stage: "middle-childhood" }, household: [], homeLanguages: [] },
  memories: [{ kind: "preference", content: "Private confirmed fixture" }],
  recentLogs: [], pastDecodes: [], continuation: [{ scenario: "Earlier chosen turn", sayThis: "Earlier reply" }],
} as unknown as DecodeContext;
test("chat is short checked content, carries only deliberate context and is marked as AI conversation", async () => {
  const generate = (async (opts: { user: string; system: string }) => {
    const input = JSON.parse(opts.user);
    assert.equal(input.profile.age.years, 11);
    assert.equal(input.earlierTurnsChosenByParent.length, 1);
    assert(opts.system.includes("not a therapist"));
    return { reply: "What has felt hardest today?", practiceReply: "Must not appear", feedback: ["Must not appear"] };
  }) as typeof checkedCall;
  const result = await converse("I would like to talk", context, "talk", undefined, undefined, generate);
  assert.equal(result.conversation?.practiceReply, "");
  assert.deepEqual(result.conversation?.feedback, []);
  assert.equal(result.sayThis, "What has felt hardest today?");
});
test("fictional practice excludes memories and keeps its fiction label in continuation", async () => {
  const generate = (async (opts: { user: string; system: string }) => {
    const input = JSON.parse(opts.user);
    assert.deepEqual(input.confirmedContext, []);
    assert.equal(input.handbook.title, "Before the first phone or game chat");
    assert(opts.system.includes("not a simulation of their real child"));
    return { reply: "Try your opening.", practiceReply: "But my friends have phones.", feedback: [] };
  }) as typeof checkedCall;
  const result = await converse("Let me practise", context, "rehearse", "digital-phone", undefined, generate);
  assert(result.sayThis.includes("Fictional practice reply:"));
  assert.equal(result.conversation?.cardId, "digital-phone");
});
test("failed content check never produces a chat reply", async () => {
  await assert.rejects(converse("Hello", context, "talk", undefined, undefined, (async () => { throw Error("unsafe"); }) as typeof checkedCall), /unsafe/);
});
