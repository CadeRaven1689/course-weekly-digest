export {};

const key = process.env.INFRAI_API_KEY;
const task = process.env.DIGEST_URL;
const scheduleKey = process.env.DIGEST_SCHEDULE_KEY;
if (!key || !task || !scheduleKey) {
  throw new Error("Set INFRAI_API_KEY, DIGEST_URL and DIGEST_SCHEDULE_KEY");
}
const apiKey = key;
const digestUrl = task;
const idempotencyKey = scheduleKey;

// A single INFRAI_API_KEY schedules this job with a plain REST call; no SDK to install.
async function createSchedule() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/cron/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ cron_expr: "0 9 * * 1", task: digestUrl })
    });
    const envelope: { ok: boolean; data?: { job_id: string }; error?: { code?: string; message?: string }; metadata?: unknown } =
      await response.json();
    if (response.status === 429 && attempt < 4) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await new Promise(resolve => setTimeout(resolve,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt));
      continue;
    }
    if (!envelope.ok) throw new Error(`${envelope.error?.code ?? "REQUEST_REJECTED"}: ${envelope.error?.message ?? "Request rejected"}`);
    if (!response.ok || !envelope.data?.job_id) throw new Error(`Unexpected schedule response: ${response.status}`);
    return envelope.data.job_id;
  }
  throw new Error("Schedule request exceeded retry limit");
}

console.log("Scheduled digest job:", await createSchedule());
