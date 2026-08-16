import { capHeightCenterOffset } from "../packing-list-generator";
import type {
  TripTask,
  TripTaskPhase,
} from "../../../../generated/prisma/client";
import {
  contentWidth,
  currentFontMetrics,
  drawSectionHeading,
  ensureSpace,
  withContinuationHeader,
} from "./shared";

export type TaskSectionInput = Pick<TripTask, "name" | "complete" | "phase">;

const PHASE_ORDER: TripTaskPhase[] = ["before", "during", "after"];
const PHASE_LABEL: Record<TripTaskPhase, string> = {
  before: "Before",
  during: "During",
  after: "After",
};

const CHECKBOX_SIZE = 8;
const CHECKBOX_GAP = 8;
const ITEM_ROW_HEIGHT = 14;
const PHASE_LABEL_HEIGHT = 20;

function drawPhaseLabel(
  document: PDFKit.PDFDocument,
  phase: TripTaskPhase,
  continued: boolean,
) {
  ensureSpace(document, PHASE_LABEL_HEIGHT);
  const label =
    PHASE_LABEL[phase].toUpperCase() + (continued ? " (CONTINUED)" : "");
  document
    .font("Source Sans 3 SemiBold")
    .fontSize(9)
    .fillColor([100, 100, 100])
    .text(label, document.page.margins.left, document.y, {
      characterSpacing: 0.3,
      width: contentWidth(document),
    })
    // fillColor is document-global and persists past this call — left gray,
    // it leaks into the first task row's checkbox fill if that task is
    // checked. The rule below already resets strokeColor the same way.
    .fillColor("black");

  const ruleY = document.y + 2;
  document
    .moveTo(document.page.margins.left, ruleY)
    .lineTo(document.page.width - document.page.margins.right, ruleY)
    .lineWidth(0.5)
    .strokeColor([200, 200, 200])
    .stroke()
    .strokeColor("black");
  document.y = ruleY + 6;
}

function drawTaskRow(
  document: PDFKit.PDFDocument,
  task: TaskSectionInput,
  blank: boolean,
) {
  ensureSpace(document, ITEM_ROW_HEIGHT);
  const rowY = document.y;
  const checked = !blank && task.complete;

  document
    .rect(document.page.margins.left, rowY, CHECKBOX_SIZE, CHECKBOX_SIZE)
    .stroke();
  if (checked) {
    document
      .rect(document.page.margins.left, rowY, CHECKBOX_SIZE, CHECKBOX_SIZE)
      .fill();
  }

  document.font("Source Sans 3").fontSize(9).fillColor("black");
  document.text(
    task.name,
    document.page.margins.left + CHECKBOX_SIZE + CHECKBOX_GAP,
    rowY + capHeightCenterOffset(CHECKBOX_SIZE, currentFontMetrics(document)),
    { width: contentWidth(document) - CHECKBOX_SIZE - CHECKBOX_GAP },
  );

  document.y = rowY + ITEM_ROW_HEIGHT;
}

export function drawTasksSection(
  document: PDFKit.PDFDocument,
  tasks: TaskSectionInput[],
  options: { blank: boolean },
): void {
  if (tasks.length === 0) return;

  drawSectionHeading(document, "Tasks");

  let currentPhase: TripTaskPhase | null = null;
  withContinuationHeader(
    document,
    () => {
      drawSectionHeading(document, "Tasks (continued)");
      if (currentPhase) drawPhaseLabel(document, currentPhase, true);
    },
    () => {
      for (const phase of PHASE_ORDER) {
        const phaseTasks = tasks.filter((task) => task.phase === phase);
        if (phaseTasks.length === 0) continue;

        currentPhase = phase;
        drawPhaseLabel(document, phase, false);
        for (const task of phaseTasks) {
          drawTaskRow(document, task, options.blank);
        }
      }
    },
  );
}
