import FeedbackCard from "$/frontend/admin/feedback-detail/feedback-card";
import MetaSidebar from "$/frontend/admin/feedback-detail/meta-sidebar";
import NoteComposer from "$/frontend/admin/feedback-detail/note-composer";
import StatusControl from "$/frontend/admin/feedback-detail/status-control";
import Timeline from "$/frontend/admin/feedback-detail/timeline";
import { useAdminFeedbackDetail } from "$/frontend/utils/api/admin-feedback";
import { ApiError } from "$/frontend/utils/api/client";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import {
  Anchor,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useLocation } from "wouter";

interface Props {
  feedbackId: string;
}

export default function FeedbackDetail({ feedbackId }: Props) {
  const [, navigate] = useLocation();
  const { data, isPending, isError, error } =
    useAdminFeedbackDetail(feedbackId);
  const { isLoading, showSpinner } = useDelayedLoading(isPending);
  const notFound = error instanceof ApiError && error.status === 404;

  function goBackToList() {
    // Prefer a real back-navigation so the list page restores the status
    // filter and page it had before — falls back to a fresh navigation if
    // this page was opened directly (no history to pop).
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/console/feedback");
    }
  }

  return (
    <Stack gap="lg" py="lg" px={{ base: "md", sm: "xl" }}>
      <Anchor
        component="button"
        type="button"
        onClick={goBackToList}
        underline="never"
        c="dimmed"
        fw={600}
        fz="sm"
        display="inline-flex"
        style={{ alignItems: "center", gap: 6 }}
      >
        <ArrowLeftIcon size={14} />
        Back to feedback
      </Anchor>

      {isLoading &&
        (showSpinner ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : null)}

      {!isLoading && (isError || !data) && (
        <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
          <Text ta="center" fw={700}>
            {notFound
              ? "This feedback no longer exists"
              : "Couldn't load this feedback"}
          </Text>
          <Text ta="center" c="dimmed" size="sm" mt={4}>
            {notFound
              ? "It may have been merged as a duplicate, or the link may be out of date."
              : "Try refreshing the page."}
          </Text>
        </Paper>
      )}

      {!isLoading && data && (
        <>
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Title
              order={6}
              c="dimmed"
              tt="uppercase"
              fz="xs"
              style={{ letterSpacing: "0.06em" }}
            >
              Feedback{" "}
              <Text component="span" ff="monospace" tt="none" fw={400}>
                #{data.feedback.id.slice(0, 8)}
              </Text>
            </Title>
            <StatusControl
              feedbackId={data.feedback.id}
              status={data.feedback.status}
            />
          </Group>

          <Group align="flex-start" wrap="wrap" gap="lg">
            <div style={{ flex: "1 1 480px", minWidth: 0 }}>
              <FeedbackCard feedback={data.feedback} />

              <Title order={5} mb="sm">
                Activity
              </Title>
              <NoteComposer feedbackId={data.feedback.id} />
              <Timeline feedback={data.feedback} />
            </div>

            <div style={{ flex: "0 1 260px", minWidth: 240 }}>
              <MetaSidebar feedback={data.feedback} />
            </div>
          </Group>
        </>
      )}
    </Stack>
  );
}
