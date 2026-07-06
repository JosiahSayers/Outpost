import { notifications } from "@mantine/notifications";

export const notifyError = (title: string) => (error: Error) =>
  notifications.show({ color: "red", title, message: error.message });
