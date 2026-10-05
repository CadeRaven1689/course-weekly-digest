import { test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { digestRequest, prepareDigest } from "../src/digest_decision.js";

test("only published courses due this week reach learners and educator totals", () => {
  const input = digestRequest.parse({
    weekStart: "2026-09-21T00:00:00Z",
    educatorEmail: "teacher@example.org",
    learners: [{ email: "reader@example.org", courses: [
      { title: "Editing lab", published: true, deadline: "2026-09-23T10:00:00Z" },
      { title: "Draft lesson", published: false, deadline: "2026-09-24T10:00:00Z" },
      { title: "Later workshop", published: true, deadline: "2026-09-28T00:00:00Z" }
    ] }]
  });
  deepStrictEqual(prepareDigest(input), {
    deliveries: [{ to: "reader@example.org", due: [{ title: "Editing lab", deadline: "2026-09-23T10:00:00Z" }] }],
    report: { to: "teacher@example.org", learnersWithDeadlines: 1, deadlines: 1 }
  });
});
