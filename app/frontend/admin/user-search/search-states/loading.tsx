import { Flex, Loader } from "@mantine/core";

export default function LoadingState() {
  return (
    <Flex justify="center" py="xl">
      <Loader size="sm" />
    </Flex>
  );
}
