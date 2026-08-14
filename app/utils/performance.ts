export const timer = async <Return = any>(
  task: () => Return,
): Promise<{ time: number; value: Awaited<Return> }> => {
  const start = new Date();
  const value = await task();
  const end = new Date();
  return {
    time: end.getTime() - start.getTime(),
    value,
  };
};
