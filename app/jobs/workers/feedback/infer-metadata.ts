import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import type { jobLogger } from "$/utils/logger";
import {
  feedbackClassificationPrompt,
  feedbackInference,
} from "$/validation/feedback";
import type { Job } from "bullmq";

export const FEEDBACK__INFER_METADATA = "feedback__infer_metadata";

const MODEL = "deepseek-4-flash";

interface InferMetadataJobData {
  feedbackId: string;
}

interface ParserOutput {
  validJson: boolean;
  passedValidation: boolean;
  parsedResponse: {
    inferredTopic: string[];
    inferredSubject: string[];
  };
}

export function parseResponse(
  response: any,
  logger: typeof jobLogger,
): ParserOutput {
  let validJson = false;
  let parsedResponse;

  try {
    parsedResponse = JSON.parse(response.choices[0].message.content);
    validJson = true;
  } catch (e) {
    logger.error("Failed to parse LLM response", {
      err: e,
      llmResponse: response.choices[0].message.content,
    });
  }

  const validationResult =
    parsedResponse && validJson && feedbackInference.safeParse(parsedResponse);

  if (validationResult?.error) {
    logger.error("Failed to validated parsed LLM response", {
      err: validationResult.error,
    });
  }

  return {
    validJson,
    passedValidation: Boolean(validationResult?.success),
    parsedResponse,
  };
}

export async function inferMetadata(job: Job<InferMetadataJobData>) {
  const logger = getLogger(job);

  const feedback = await db.feedback.findUnique({
    where: { id: job.data.feedbackId },
  });
  if (!feedback) {
    logger.error("Unable to find feedback");
    throw new Error("Unable to find feedback");
  }

  const url = "https://inference.do-ai.run/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${Bun.env.MODEL_ACCESS_KEY}`,
  };
  const data = {
    model: MODEL,
    messages: [
      {
        role: "system",
        content: feedbackClassificationPrompt,
      },
      {
        role: "user",
        content: feedback.text,
      },
    ],
    max_tokens: 2000,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  }).then((response) => response.json());

  const validationResult = parseResponse(response, logger);

  if (!validationResult.validJson) {
    throw new Error("Failed to parse LLM response");
  }

  await db.feedback.update({
    where: { id: job.data.feedbackId },
    data: {
      inferredTopic: validationResult.parsedResponse.inferredTopic,
      inferredSubject: validationResult.parsedResponse.inferredSubject,
    },
  });

  return validationResult;
}

const inferMetadataJob = defineJob<InferMetadataJobData>({
  name: FEEDBACK__INFER_METADATA,
  processor: inferMetadata,
  defaultJobOptions,
});

export const { queue: inferMetadataQueue, worker: inferMetadataWorker } =
  inferMetadataJob;

export default inferMetadataJob;
