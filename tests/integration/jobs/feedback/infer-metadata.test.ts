import {
  FEEDBACK__INFER_METADATA,
  inferMetadata,
  parseResponse,
} from "$/jobs/workers/feedback/infer-metadata";
import { jobLogger } from "$/utils/logger";
import { db } from "$/utils/db";
import { make } from "../../../helpers/test-data/make";
import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { Feedback } from "../../../../generated/prisma/client";

let fetchSpy: ReturnType<typeof spyOn>;

function chatCompletion(content: string) {
  return { choices: [{ message: { content } }] };
}

function validInferenceContent(
  overrides: Partial<{
    inferredTopic: string[];
    inferredSubject: string[];
  }> = {},
) {
  return JSON.stringify({
    inferredTopic: ["bug_report"],
    inferredSubject: ["dashboard"],
    ...overrides,
  });
}

function mockFetchOnce(body: unknown) {
  fetchSpy.mockImplementationOnce(
    (async () => new Response(JSON.stringify(body))) as any,
  );
}

function makeJob(feedbackId: string) {
  return {
    id: "test-job-id",
    name: FEEDBACK__INFER_METADATA,
    data: { feedbackId },
  } as unknown as Job<{ feedbackId: string }>;
}

async function createFeedback(overrides: Partial<Feedback> = {}) {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  return db.feedback.create({
    data: make("Feedback", { userId: user.id, ...overrides }),
  });
}

beforeEach(() => {
  // The job shells out to a real inference endpoint; stub the global `fetch`
  // so tests never hit the network.
  fetchSpy = spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("inferMetadata", () => {
  it("throws when the feedback does not exist", async () => {
    const job = makeJob("does-not-exist");

    await expect(inferMetadata(job)).rejects.toThrow("Unable to find feedback");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("updates the feedback with the inferred topic and subject", async () => {
    const feedback = await createFeedback({ text: "The dashboard is broken" });
    mockFetchOnce(
      chatCompletion(
        validInferenceContent({
          inferredTopic: ["bug_report"],
          inferredSubject: ["dashboard"],
        }),
      ),
    );

    await inferMetadata(makeJob(feedback.id));

    const updated = await db.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
    });
    expect(updated.inferredTopic).toEqual(["bug_report"]);
    expect(updated.inferredSubject).toEqual(["dashboard"]);
  });

  it("sends the feedback text to the inference endpoint", async () => {
    const feedback = await createFeedback({
      text: "Packing lists don't sort correctly",
    });
    mockFetchOnce(chatCompletion(validInferenceContent()));

    await inferMetadata(makeJob(feedback.id));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://inference.do-ai.run/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "Packing lists don't sort correctly",
    });
  });

  it("throws and leaves the feedback unchanged when the LLM response is not valid JSON", async () => {
    const feedback = await createFeedback();
    mockFetchOnce(chatCompletion("not valid json"));

    await expect(inferMetadata(makeJob(feedback.id))).rejects.toThrow(
      "Failed to parse LLM response",
    );

    const unchanged = await db.feedback.findUniqueOrThrow({
      where: { id: feedback.id },
    });
    expect(unchanged.inferredTopic).toEqual([]);
    expect(unchanged.inferredSubject).toEqual([]);
  });

  it("returns the parsed validation result", async () => {
    const feedback = await createFeedback();
    mockFetchOnce(
      chatCompletion(
        validInferenceContent({
          inferredTopic: ["feature_request"],
          inferredSubject: ["packing_list"],
        }),
      ),
    );

    const result = await inferMetadata(makeJob(feedback.id));

    expect(result).toMatchObject({
      validJson: true,
      passedValidation: true,
      parsedResponse: {
        inferredTopic: ["feature_request"],
        inferredSubject: ["packing_list"],
      },
    });
  });
});

describe("parseResponse", () => {
  it("returns validJson and passedValidation true for a well-formed, schema-valid response", () => {
    const result = parseResponse(
      chatCompletion(
        validInferenceContent({
          inferredTopic: ["question"],
          inferredSubject: ["authentication"],
        }),
      ),
      jobLogger,
    );

    expect(result).toEqual({
      validJson: true,
      passedValidation: true,
      parsedResponse: {
        inferredTopic: ["question"],
        inferredSubject: ["authentication"],
      },
    });
  });

  it("returns validJson false and passedValidation false when the response content is not valid JSON", () => {
    const result = parseResponse(chatCompletion("not valid json"), jobLogger);

    expect(result).toEqual({
      validJson: false,
      passedValidation: false,
      parsedResponse: undefined,
    });
  });

  it("returns passedValidation false when the JSON doesn't match the inference schema", () => {
    const result = parseResponse(
      chatCompletion(JSON.stringify({ inferredTopic: ["not_a_real_topic"] })),
      jobLogger,
    );

    expect(result.validJson).toBe(true);
    expect(result.passedValidation).toBe(false);
  });
});
