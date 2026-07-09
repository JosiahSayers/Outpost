import { MEAL_LABEL } from "$/frontend/trip/meal-plan/helpers";
import { TextInput } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { MealName } from "../../../../../generated/prisma/enums";

interface Props {
  meal: MealName;
  onAdd: (name: string) => void;
}

export default function QuickAddInput({ meal, onAdd }: Props) {
  const [name, setName] = useState("");

  return (
    <TextInput
      size="xs"
      mt={4}
      value={name}
      aria-label={`Add to ${MEAL_LABEL[meal]}`}
      placeholder={`Add to ${MEAL_LABEL[meal].toLowerCase()}…`}
      leftSection={<PlusIcon size={12} />}
      onChange={(e) => setName(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setName("");
      }}
    />
  );
}
