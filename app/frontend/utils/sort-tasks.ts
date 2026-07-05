/**
 * Returns a new array sorted by completion first (completed tasks at the
 * top), then by due date ascending within each group, with undated tasks
 * appended to the end of their group.
 *
 * The backend does not guarantee any ordering in its responses, so every
 * render path that displays trip tasks must sort with this before rendering.
 */
export function sortTasks<
  T extends { complete: boolean; dueDate: string | null },
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}
