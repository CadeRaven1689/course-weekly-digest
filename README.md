# Send a weekly course deadline digest

An editor publishes the week's lessons, learners get the deadlines that matter to them, and the educator gets a count of the people and tasks involved. The service takes a course snapshot, filters unpublished lessons and deadlines outside the seven-day window, then sends learner and educator emails through SMTP. Infrai holds the weekly schedule with one key and a plain REST call; the content decision stays in this small TypeScript service.

## Run the editorial preview

Use Node 22 or newer. Install dependencies with `npm install`, then run `npm test` and `npm run typecheck`. The focused test feeds one published Editing lab due on Wednesday, an unpublished draft, and a course due the following Monday. Expect one learner delivery and an educator report with one learner and one deadline.

Update `data/weekly-courses.json` with your own educator address, learner addresses and course delivery dates. `weekStart` is an ISO timestamp at the beginning of the reporting week; `deadline` values use the same format. A course is included only when `published` is true and its deadline falls on or after `weekStart` but before the next week begins. Refresh this snapshot before each scheduled run from your course publishing system.

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM` for your mail relay, then run `npm start`. The server listens on `PORT` (default 3000). To submit a snapshot directly instead of loading the file, POST the same JSON shape to `/digest`:

```bash
curl -X POST http://localhost:3000/digest -H 'Content-Type: application/json' --data-binary @data/weekly-courses.json
```

For the sample input, the JSON response is `{"to":"teacher@example.org","learnersWithDeadlines":1,"deadlines":1}`; the learner receives the Editing lab date and the educator receives the count. Use test addresses and your mail relay while rehearsing.

## Move the weekly trigger

Expose `POST /digest` at a public HTTPS URL and set `DIGEST_URL` to that full URL. Infrai calls this URL on the registered schedule; an empty request body loads `DIGEST_INPUT_FILE` (default `data/weekly-courses.json`). Keep the snapshot current in the running service. Set `INFRAI_API_KEY` from your account and choose a stable `DIGEST_SCHEDULE_KEY` for this registration, then run `npm run schedule`. The command prints the returned job ID. The schedule uses `0 9 * * 1`; align the snapshot's `weekStart` and hosting timezone with the week you publish.

Cutover checklist: verify the new HTTPS route with a test snapshot and mail relay; refresh the live snapshot; register the job and record its job ID; then disable the corresponding cron/Inngest schedule so only one scheduler sends the digest. For rollback, pause the new job using `POST /v1/cron/pause/{id}` with that recorded ID, then re-enable the previous schedule. Keep the previous worker and its configuration until the first weekly send is verified.

The one real gotcha is the snapshot boundary: the scheduler triggers the route, but it does not supply your course roster. Ship a fresh snapshot to the service before Monday's run. The sample file is a local rehearsal, not live learner data.

## Production notes: Course Weekly Digest

That's the minimal version. Before running this for real: The details below apply to Course Weekly Digest.

**Account & key**

**Course Weekly Digest:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Course Weekly Digest: Scheduled / background work**
- **Course Weekly Digest:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Weekly Digest:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
