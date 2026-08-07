import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import { Badge, Group, Paper, Text } from "@mantine/core";

interface Props {
  feedback: ClientFullAdminFeedback;
}

export default function FeedbackCard({ feedback }: Props) {
  const tags = [...feedback.inferredTopic, ...feedback.inferredSubject];

  return (
    <Paper withBorder p="md" mb="lg">
      <Text size="md" mb={tags.length ? "sm" : 0} style={{ lineHeight: 1.6 }}>
        &ldquo;{feedback.text}&rdquo;
      </Text>
      {tags.length > 0 && (
        <Group gap={6}>
          {tags.map((tag) => (
            <Badge key={tag} size="xs" color="stone-gray" variant="light">
              {tag}
            </Badge>
          ))}
        </Group>
      )}
    </Paper>
  );
}
