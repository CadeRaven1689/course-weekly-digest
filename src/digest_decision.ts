import { z } from "zod";

export const digestRequest = z.object({
  weekStart: z.iso.datetime({ offset: true }),
  educatorEmail: z.email(),
  learners: z.array(z.object({
    email: z.email(),
    courses: z.array(z.object({
      title: z.string().min(1),
      published: z.boolean(),
      deadline: z.iso.datetime({ offset: true })
    }))
  }))
});

export type DigestRequest = z.infer<typeof digestRequest>;

export function prepareDigest(input: DigestRequest) {
  const start = Date.parse(input.weekStart);
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const deliveries = input.learners.map(learner => ({
    to: learner.email,
    due: learner.courses.filter(course => course.published &&
      Date.parse(course.deadline) >= start && Date.parse(course.deadline) < end)
      .map(course => ({ title: course.title, deadline: course.deadline }))
  })).filter(learner => learner.due.length > 0);

  return {
    deliveries,
    report: {
      to: input.educatorEmail,
      learnersWithDeadlines: deliveries.length,
      deadlines: deliveries.reduce((total, learner) => total + learner.due.length, 0)
    }
  };
}
