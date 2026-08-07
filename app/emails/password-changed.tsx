import { Heading, Link, Text } from "@react-email/components";
import EmailLayout from "./components/layout";
import { emailAppUrl, emailColors, emailFonts } from "./theme";

type PasswordChangedEmailProps = {
  userName?: string | null;
};

export function PasswordChangedEmail({ userName }: PasswordChangedEmailProps) {
  const forgotPasswordUrl = `${emailAppUrl}/forgot-password`;

  return (
    <EmailLayout previewText="Your Outpost password was changed">
      <Heading style={styles.heading}>Your password was changed</Heading>
      <Text style={styles.text}>
        {userName ? `Hi ${userName},` : "Hi there,"} this is a confirmation that
        the password on your Outpost account was just changed.
      </Text>

      <Text style={styles.mutedText}>
        If you made this change, you can safely ignore this email.
      </Text>
      <Text style={styles.mutedText}>
        If you didn&rsquo;t change your password,{" "}
        <Link href={forgotPasswordUrl} style={styles.link}>
          reset it now
        </Link>{" "}
        to secure your account.
      </Text>
    </EmailLayout>
  );
}

PasswordChangedEmail.PreviewProps = {
  userName: "Alex",
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;

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
  mutedText: {
    fontSize: "13px",
    lineHeight: "1.5",
    color: emailColors.stoneGray[5],
    margin: "0 0 8px",
  },
  link: {
    fontSize: "13px",
    color: emailColors.trailGreen[6],
  },
};
