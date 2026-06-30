import type { Response } from "express";

export function getHighestSort(sortObjects: Array<{ sortPosition: number }>) {
  return Math.max(...sortObjects.map((s) => s.sortPosition), 0) ?? 0;
}

export function newPositionIsNotLastPosition(
  currentHighestSort: number,
  newSortPosition: number | undefined,
): newSortPosition is number {
  return newSortPosition != undefined && newSortPosition <= currentHighestSort;
}

export function sendOutOfOrderResponse(
  res: Response,
  currentHighestSort: number,
  newSortPosition: number,
) {
  return res.status(400).json({
    error: `"sortPosition" should be higher than the current highest sort position. You provided: ${newSortPosition}, currentHighest: ${currentHighestSort}`,
  });
}
