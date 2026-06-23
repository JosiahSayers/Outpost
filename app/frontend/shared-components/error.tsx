import { Alert, type AlertProps } from "@mantine/core";
import { WarningIcon } from "@phosphor-icons/react";

interface Props extends AlertProps {
  message?: string;
}

export default function Error({
  message = "Something went wrong. Please try again.",
  ...props
}: Props) {
  return (
    <Alert icon={<WarningIcon size={16} />} color="red" {...props}>
      {message}
    </Alert>
  );
}
