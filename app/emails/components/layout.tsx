import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts, emailLogoUrl, emailRadius } from "../theme";

type EmailLayoutProps = {
  /** Shown as the inbox preview snippet; not rendered in the email body. */
  previewText: string;
  children: ReactNode;
};

export default function EmailLayout({
  previewText,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.outerContainer}>
          <Section style={styles.header}>
            <Img
              src={emailLogoUrl}
              alt="Outpost"
              width="160"
              height="40"
              style={styles.logo}
            />
          </Section>

          <Container style={styles.card}>{children}</Container>

          <Section style={styles.footer}>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>
              Outpost &mdash; your backpacking companion
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: emailColors.stoneGray[0],
    fontFamily: emailFonts.body,
    color: emailColors.stoneGray[9],
    margin: 0,
    padding: "40px 0",
  },
  outerContainer: {
    maxWidth: "480px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  logo: {
    margin: "0 auto",
  },
  card: {
    backgroundColor: emailColors.white,
    borderRadius: emailRadius.md,
    border: `1px solid ${emailColors.stoneGray[2]}`,
    padding: "32px",
    maxWidth: "480px",
  },
  footer: {
    padding: "0 16px",
  },
  divider: {
    borderColor: emailColors.stoneGray[2],
    margin: "24px 0 16px",
  },
  footerText: {
    fontSize: "12px",
    lineHeight: "1.5",
    color: emailColors.stoneGray[5],
    textAlign: "center" as const,
  },
};
