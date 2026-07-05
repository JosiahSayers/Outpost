import PackingList from "$/frontend/trip/packing-lists/packing-list";
import { placeholderPackingLists } from "$/frontend/trip/placeholder-data";
import { Button, Stack, Title } from "@mantine/core";

{
  /* Future State: Accordion element that expands to show a slimmed-down view of the packing list page.
      This view will be very similar to how the non-editable packing list page looks, except it will have
      checkboxes next to each item that allow the user to mark which items are packed and which are not. */
}
export default function PackingListSection() {
  return (
    <Stack gap="sm">
      <Title order={3}>Packing Lists</Title>
      <Stack gap="sm">
        {placeholderPackingLists.map((list) => (
          <PackingList list={list} key={list.id} />
        ))}
        <Button variant="subtle" size="sm" style={{ alignSelf: "flex-start" }}>
          Assign a packing list
        </Button>
      </Stack>
    </Stack>
  );
}
