import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import { createTask, editTask, taskParams } from "$/validation/trip/task";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripTaskRouter = Router({ mergeParams: true });

tripTaskRouter.post(
  "/",
  validate({ params: idParam, body: createTask }),
  async (req, res) => {
    const existingTasksInPhase = await db.tripTask.findMany({
      where: {
        tripId: req.params.id,
        phase: req.body.phase,
      },
    });

    if (existingTasksInPhase.find((task) => task.name === req.body.name)) {
      return res.status(400).json({
        error: `"${req.body.name}" is already a task in this trip phase`,
      });
    }

    const newTask = await db.tripTask.create({
      data: {
        tripId: req.params.id,
        name: req.body.name,
        complete: req.body.complete,
        phase: req.body.phase,
        dueDate: req.body.dueDate,
      },
    });

    return res.status(201).json({ task: transformers.tripTask(newTask) });
  },
);

tripTaskRouter.delete(
  "/:taskId",
  validate({ params: taskParams }),
  async (req, res) => {
    const task = await db.tripTask.findUnique({
      where: {
        id: req.params.taskId,
        tripId: req.params.id,
      },
    });

    if (!task) {
      return res.sendStatus(404);
    }

    await db.tripTask.delete({
      where: { id: req.params.taskId },
    });

    return res.sendStatus(200);
  },
);

tripTaskRouter.patch(
  "/:taskId",
  validate({ params: taskParams, body: editTask }),
  async (req, res) => {
    const task = await db.tripTask.findUnique({
      where: {
        id: req.params.taskId,
        tripId: req.params.id,
      },
    });

    if (!task) {
      return res.sendStatus(404);
    }

    const updatedTask = await db.tripTask.update({
      where: {
        id: req.params.taskId,
      },
      data: {
        name: req.body.name,
        complete: req.body.complete,
        phase: req.body.phase,
        dueDate: req.body.dueDate,
      },
    });

    return res.json({ task: transformers.tripTask(updatedTask) });
  },
);
