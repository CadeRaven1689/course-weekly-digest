import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { digestRequest, prepareDigest } from "./digest_decision.js";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/digest") {
    response.writeHead(404).end();
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString();
    const source = body || await readFile(process.env.DIGEST_INPUT_FILE ?? "data/weekly-courses.json", "utf8");
    const parsed = digestRequest.safeParse(JSON.parse(source));
    if (!parsed.success) {
      response.writeHead(400, { "Content-Type": "application/json" })
        .end(JSON.stringify({ errors: parsed.error.flatten() }));
      return;
    }
    const digest = prepareDigest(parsed.data);
    for (const learner of digest.deliveries) {
      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: learner.to,
        subject: "Your course deadlines this week",
        text: learner.due.map(course => `${course.title}: ${course.deadline}`).join("\n")
      });
    }
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: digest.report.to,
      subject: "Weekly educator deadline report",
      text: `${digest.report.learnersWithDeadlines} learners have ${digest.report.deadlines} deadlines this week.`
    });
    response.writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify(digest.report));
  } catch (error) {
    console.error(error);
    response.writeHead(500).end();
  }
}).listen(Number(process.env.PORT ?? 3000));
