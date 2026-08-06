import Error from "$/frontend/shared-components/error";
import { useSubmitFeedback } from "$/frontend/utils/api/feedback";
import { createFeedback } from "$/validation/feedback";
import {
  Alert,
  Button,
  Drawer,
  Group,
  Input,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useLocation } from "wouter";

const maxLength = createFeedback.shape.text.maxLength!;

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function FeedbackDrawer({ opened, onClose }: Props) {
  const submitFeedback = useSubmitFeedback();
  const [location] = useLocation();

  const form = useForm({
    initialValues: { text: "", submittedOnPage: location },
    validate: schemaResolver(createFeedback, { sync: true }),
  });

  const handleClose = () => {
    form.reset();
    submitFeedback.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit((values) => {
    submitFeedback.mutate(values);
  });

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
          Send Feedback
        </Text>
      }
      position="right"
      size="md"
    >
      {submitFeedback.isSuccess ? (
        <Stack gap="md" pt="xs">
          <Alert color="green">
            Thanks! Someone on the team will take a look.
          </Alert>
          <Group justify="flex-end">
            <Button onClick={handleClose}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md" pt="xs">
            <Text c="dimmed" size="sm">
              Found a bug, have an idea, or just want to tell us something? Let
              us know below.
            </Text>
            <Textarea
              label="Feedback"
              placeholder="What's on your mind?"
              description={
                form.values.text.length > maxLength * 0.75 &&
                `${form.values.text.length}/${maxLength}`
              }
              required
              autosize
              minRows={5}
              {...form.getInputProps("text")}
            />
            <Input
              type="hidden"
              value={location}
              {...form.getInputProps("submittedOnPage")}
            />
            {submitFeedback.isError && (
              <Error message="Couldn't submit your feedback. Please try again." />
            )}
            <Group justify="flex-end" mt="sm">
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={submitFeedback.isPending}>
                Send
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Drawer>
  );
}
