import { Heading, Link, Section, Text } from "@react-email/components";
import EmailButton from "./components/button";
import EmailLayout from "./components/layout";
import { emailColors, emailFonts } from "./theme";

type VerifyEmailProps = {
  userName?: string | null;
  verifyUrl: string;
};

export function VerifyEmail({ userName, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout previewText="Verify your Outpost email address">
      <Heading style={styles.heading}>Verify your email</Heading>
      <Text style={styles.text}>
        {userName ? `Hi ${userName},` : "Hi there,"} confirm this is your email
        address to finish securing your Outpost account.
      </Text>

      <Section style={styles.buttonSection}>
        <EmailButton href={verifyUrl}>Verify Email</EmailButton>
      </Section>

      <Text style={styles.mutedText}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={verifyUrl} style={styles.link}>
        {verifyUrl}
      </Link>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  userName: "Alex",
  verifyUrl:
    "https://outpost.example.com/api/auth/verify-email?token=preview-token",
} satisfies VerifyEmailProps;

export default VerifyEmail;

const styles = {
  heading: {
    fontFamily: emailFonts.heading,
    fontSize: "22px",
    fontWeight: 700,
    color: emailColors.stoneGray[9],
    margin: "0 0 16px",
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
  mutedText: {
    fontSize: "13px",
    lineHeight: "1.5",
    color: emailColors.stoneGray[5],
    margin: "0 0 8px",
  },
  link: {
    fontSize: "13px",
    color: emailColors.trailGreen[6],
    wordBreak: "break-all" as const,
  },
};
