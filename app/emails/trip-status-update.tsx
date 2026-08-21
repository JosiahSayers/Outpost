import { Heading, Section, Text } from "@react-email/components";
import EmailButton from "./components/button";
import EmailLayout from "./components/layout";
import { emailColors, emailFonts } from "./theme";

type TripStatusUpdateEmailProps = {
  userName?: string | null;
  title: string;
  description: string;
  tripName: string;
  tripUrl: string;
};

// Title/description are passed in rather than hardcoded here so the copy can
// be shared verbatim with the in-app notification (see
// app/jobs/workers/trip-status/move-to-in-progress.ts and
// move-to-finished.ts) -- if a user has both channels enabled, the wording
// matches. `tripName` has no in-app equivalent -- the notification list
// already sits inside trip context there, but email has room to name the
// trip, shown as a kicker under the headline.
export function TripStatusUpdateEmail({
  userName,
  title,
  description,
  tripName,
  tripUrl,
}: TripStatusUpdateEmailProps) {
  return (
    <EmailLayout previewText={`${tripName}: ${description}`}>
      <Heading style={styles.heading}>{title}</Heading>
      <Text style={styles.tripName}>{tripName}</Text>
      <Text style={styles.greeting}>
        {userName ? `Hi ${userName},` : "Hi there,"}
      </Text>
      <Text style={styles.text}>{description}</Text>

      <Section style={styles.buttonSection}>
        <EmailButton href={tripUrl}>View Trip</EmailButton>
      </Section>
    </EmailLayout>
  );
}

TripStatusUpdateEmail.PreviewProps = {
  userName: "Alex",
  title: "Your trip has started!",
  description: "We've automatically marked your trip as in progress.",
  tripName: "Pacific Crest Traverse — North Section",
  tripUrl: "https://outpost.example.com/trips/preview-trip-id",
} satisfies TripStatusUpdateEmailProps;

export default TripStatusUpdateEmail;

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
    margin: "0 0 24px",
  },
  buttonSection: {
    textAlign: "center" as const,
    margin: "0 0 24px",
  },
};
