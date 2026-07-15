import { Heading, Link, Section, Text } from "@react-email/components";
import EmailButton from "./components/button";
import EmailLayout from "./components/layout";
import { emailColors, emailFonts } from "./theme";

type ResetPasswordEmailProps = {
  userName?: string | null;
  resetUrl: string;
};

export function ResetPasswordEmail({
  userName,
  resetUrl,
}: ResetPasswordEmailProps) {
  return (
    <EmailLayout previewText="Reset your Outpost password">
      <Heading style={styles.heading}>Reset your password</Heading>
      <Text style={styles.text}>
        {userName ? `Hi ${userName},` : "Hi there,"} we got a request to reset
        the password on your Outpost account. Click below to choose a new one.
      </Text>

      <Section style={styles.buttonSection}>
        <EmailButton href={resetUrl}>Reset Password</EmailButton>
      </Section>

      <Text style={styles.mutedText}>
        Or copy and paste this link into your browser:
      </Text>
      <Link href={resetUrl} style={styles.link}>
        {resetUrl}
      </Link>

      <Text style={styles.mutedText}>
        If you didn&rsquo;t request a password reset, you can safely ignore this
        email &mdash; your password won&rsquo;t change until you click the link
        above and set a new one.
      </Text>
    </EmailLayout>
  );
}

ResetPasswordEmail.PreviewProps = {
  userName: "Alex",
  resetUrl: "https://outpost.example.com/reset-password?token=preview-token",
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;

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
