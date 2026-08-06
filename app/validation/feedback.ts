import z from "zod";

export const createFeedback = z.strictObject({
  text: z.string().min(15).max(750),
});

// Single source of truth for the topic/subject taxonomy: each key becomes a
// valid enum value, and its description is reused in the LLM classification
// prompt so the two can't drift apart.
const feedbackTopicDescriptions = {
  bug_report: "something is broken, erroring, or not behaving as designed",
  feature_request: "a request for new functionality that doesn't exist today",
  usability_feedback:
    "existing functionality works but is confusing, awkward, or hard to find",
  performance_issue: "something is slow, hangs, or times out",
  question:
    "the user is asking for help or clarification, not reporting an issue",
  praise: "positive feedback with no actionable request",
  other: "doesn't fit any of the above",
} as const;

const feedbackSubjectDescriptions = {
  dashboard: "the main dashboard/home view",
  trip_planning: "the trip page (itinerary, trip details, trip status)",
  packing_list: "packing lists and gear assignment within a list",
  gear_inventory: "the user's personal gear inventory",
  notifications: "in-app or email notifications",
  account_settings: "profile, account settings, preferences",
  authentication: "sign-in, registration, password reset",
  admin_console: "the admin console (/console) — internal/staff tooling",
  marketing_site: "the public landing/marketing page",
  other: "doesn't fit any of the above, or the area is unclear/unspecified",
} as const;

type FeedbackTopicValue = keyof typeof feedbackTopicDescriptions;
type FeedbackSubjectValue = keyof typeof feedbackSubjectDescriptions;

export const feedbackTopic = z.enum(
  Object.keys(feedbackTopicDescriptions) as [
    FeedbackTopicValue,
    ...FeedbackTopicValue[],
  ],
);

export const feedbackSubject = z.enum(
  Object.keys(feedbackSubjectDescriptions) as [
    FeedbackSubjectValue,
    ...FeedbackSubjectValue[],
  ],
);

export const feedbackInference = z.strictObject({
  inferredTopic: z.array(feedbackTopic).min(1),
  inferredSubject: z.array(feedbackSubject).min(1),
});

function describeOptions(descriptions: Record<string, string>) {
  return Object.entries(descriptions)
    .map(([value, description]) => `- ${value} — ${description}`)
    .join("\n");
}

export const feedbackClassificationPrompt = `You are a classifier for user feedback submitted on Outpost, a trip-planning and gear-management app.

For each piece of feedback, identify:
1. TOPIC(s) — the nature of the feedback
2. SUBJECT(s) — the area of the app it concerns

Select every value that genuinely applies. Most feedback needs exactly one topic and one subject; select more than one only when the text clearly spans multiple, distinct topics or areas. Never invent values outside the lists below. If nothing fits, use "other".

## Topics
${describeOptions(feedbackTopicDescriptions)}

## Subjects
${describeOptions(feedbackSubjectDescriptions)}

## Output format
Respond with ONLY a single JSON object, and nothing else — no markdown code fences, no explanation, no leading or trailing text. It must match this exact shape:

{"inferredTopic": string[], "inferredSubject": string[]}

Both arrays must contain one or more values drawn only from the lists above (using the exact keys shown, e.g. "bug_report", not "Bug Report").`;
