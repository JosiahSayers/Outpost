import { Heading, Section, Text } from "@react-email/components";
import EmailButton from "./components/button";
import EmailLayout from "./components/layout";
import { emailColors, emailFonts } from "./theme";

type MealPlanReminderEmailProps = {
  userName?: string | null;
  tripName: string;
  // Pre-formatted (e.g. "Saturday, September 5") rather than a raw Date --
  // the producer job already knows the trip's timezone-naive start date and
  // Intl.DateTimeFormat isn't worth pulling into the template itself.
  tripStartDate: string;
  tripUrl: string;
  unpurchasedCount: number;
  // First few item names for the "Including X, Y, Z..." line. Deliberately
  // not the full list -- see app/jobs/workers/meal-plan/unpurchased-items-reminder.ts
  // for why this template stays a count + preview rather than a full
  // breakdown.
  previewItemNames: string[];
  remainingCount: number;
};

function countLabel(count: number) {
  return count === 1
    ? "meal plan item still needs purchased"
    : "meal plan items still need purchased";
}

function PreviewNames({
  names,
  remainingCount,
}: {
  names: string[];
  remainingCount: number;
}) {
  return (
    <>
      {names.map((name, i) => {
        const isLast = i === names.length - 1;
        let separator = "";
        if (!isLast) {
          const isSecondToLast = i === names.length - 2;
          separator =
            remainingCount === 0 && isSecondToLast
              ? names.length === 2
                ? " and "
                : ", and "
              : ", ";
        }
        return (
          <span key={name}>
            <strong>{name}</strong>
            {separator}
          </span>
        );
      })}
      {remainingCount > 0 ? `, and ${remainingCount} more.` : "."}
    </>
  );
}

export function MealPlanReminderEmail({
  userName,
  tripName,
  tripStartDate,
  tripUrl,
  unpurchasedCount,
  previewItemNames,
  remainingCount,
}: MealPlanReminderEmailProps) {
  return (
    <EmailLayout
      previewText={`${tripName}: ${unpurchasedCount} meal plan ${unpurchasedCount === 1 ? "item" : "items"} still need purchased`}
    >
      <Heading style={styles.heading}>Still need to pick these up</Heading>
      <Text style={styles.tripName}>{tripName}</Text>
      <Text style={styles.greeting}>
        {userName ? `Hi ${userName},` : "Hi there,"}
      </Text>
      <Text style={styles.text}>Your trip starts {tripStartDate}.</Text>

      <Section style={styles.countBox}>
        <Text style={styles.countNumber}>{unpurchasedCount}</Text>
        <Text style={styles.countLabel}>{countLabel(unpurchasedCount)}</Text>
      </Section>

      {previewItemNames.length > 0 && (
        <Text style={styles.preview}>
          Including{" "}
          <PreviewNames
            names={previewItemNames}
            remainingCount={remainingCount}
          />
        </Text>
      )}

      <Section style={styles.buttonSection}>
        <EmailButton href={tripUrl}>Review Meal Plan</EmailButton>
      </Section>
    </EmailLayout>
  );
}

MealPlanReminderEmail.PreviewProps = {
  userName: "Alex",
  tripName: "Sierra High Route — Section 2",
  tripStartDate: "Saturday, September 5",
  tripUrl: "https://outpost.example.com/trips/preview-trip-id",
  unpurchasedCount: 15,
  previewItemNames: ["Instant Oatmeal", "Tortillas", "Trail Mix"],
  remainingCount: 12,
} satisfies MealPlanReminderEmailProps;

export default MealPlanReminderEmail;

const styles = {
  heading: {
    fontFamily: emailFonts.heading,
    fontSize: "22px",
    fontWeight: 700,
    color: emailColors.stoneGray[9],
    margin: "0 0 4px",
  },
  tripName: {
    fontFamily: emailFonts.heading,
    fontSize: "15px",
    fontStyle: "italic" as const,
    color: emailColors.trailGreen[6],
    margin: "0 0 20px",
  },
  greeting: {
    fontSize: "15px",
    lineHeight: "1.55",
    color: emailColors.stoneGray[9],
    margin: "0 0 4px",
  },
  text: {
    fontSize: "15px",
    lineHeight: "1.55",
    color: emailColors.stoneGray[9],
    margin: "0 0 20px",
  },
  countBox: {
    backgroundColor: emailColors.trailGreen[0],
    border: `1px solid ${emailColors.trailGreen[1]}`,
    borderRadius: "8px",
    padding: "18px 20px",
    textAlign: "center" as const,
    margin: "0 0 18px",
  },
  countNumber: {
    fontFamily: emailFonts.heading,
    fontSize: "32px",
    fontWeight: 800,
    color: emailColors.trailGreen[6],
    lineHeight: "1",
    margin: "0",
  },
  countLabel: {
    fontSize: "13px",
    color: emailColors.stoneGray[5],
    margin: "4px 0 0",
  },
  preview: {
    fontSize: "13.5px",
    lineHeight: "1.6",
    color: emailColors.stoneGray[5],
    margin: "0 0 20px",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "0 0 4px",
  },
};
