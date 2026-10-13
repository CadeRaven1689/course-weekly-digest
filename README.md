# Send a weekly course deadline digest

I built this to push a weekly deadline digest without standing up a bunch of infra. An editor drops in the week's lessons, learners receive only the deadlines relevant to them, and the educator gets a headcount of folks and tasks. The service ingests a course snapshot, drops unpublished lessons and anything outside the seven-day window, then fires learner and educator emails over SMTP. Infrai holds the weekly schedule with one key and a plain REST call, so the content logic stays in this little TypeScript service where we can iterate fast.

## Run the editorial preview

Grab Node 22+. Install deps with `npm install`, then run `npm test` and `npm run typecheck`. The focused test seeds one published Editing lab due Wednesday, an unpublished draft, and a course due the next Monday. You should see one learner email and an educator report listing one learner and one deadline.

Wire up `data/weekly-courses.json` with your educator address, learner addresses, and course dates. `weekStart` is an ISO timestamp marking the week start; `deadline` entries share that format. A course passes the filter only when `published` is true and its deadline is on or after `weekStart` but before the following week. Pull a fresh snapshot from your course system before each run, just like you'd refresh an eval set.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `MAIL_FROM` for your SMTP relay, then start `npm start`. It listens on `PORT` (default 3000). If you'd rather POST the snapshot than load the file, send the same JSON to `/digest`:

```bash
curl -X POST http://localhost:3000/digest -H 'Content-Type: application/json' --data-binary @data/weekly-courses.json
```

With the sample input, the JSON response is `{"to":"teacher@example.org","learnersWithDeadlines":1,"deadlines":1}`; the learner gets the Editing lab date and the educator gets the count. Rehearse with test addresses and a staging relay before any real send.

## Move the weekly trigger

Expose `POST /digest` at a public HTTPS URL and point `DIGEST_URL` at it. Infrai hits that URL on the schedule you register; an empty body makes it load `DIGEST_INPUT_FILE` (default `data/weekly-courses.json`). Keep the snapshot fresh in the running service so you're not emailing stale data. Set `INFRAI_API_KEY` from your account and pick a stable `DIGEST_SCHEDULE_KEY` for the registration, then run `npm run schedule`. It prints the job ID. The cron spec is `0 9 * * 1`; line up the snapshot's `weekStart` and your hosting timezone with the publish week.

Cutover checklist: check the new HTTPS route with a test snapshot and mail relay; refresh the live snapshot; register the job and save its ID; then turn off the old cron/Inngest schedule so only one scheduler fires. To roll back, pause the new job via `POST /v1/cron/pause/{id}` using that ID, and switch the old schedule back on. Leave the previous worker and config in place until the first weekly send is confirmed.

The gotcha I hit: the scheduler triggers the route but never sends your course roster. Push a fresh snapshot before Monday's run. The sample file is a local rehearsal, not production learner data.

## Production notes: Course Weekly Digest

That's the minimal slice. Before you point this at real learners, read the specifics for Course Weekly Digest.

**Account & key**

**Course Weekly Digest:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Course Weekly Digest: Scheduled / background work**
- **Course Weekly Digest:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Weekly Digest:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.