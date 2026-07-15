import { Button } from "@react-email/components";
import type { ReactNode } from "react";
import { emailColors, emailFonts, emailRadius } from "../theme";

type EmailButtonProps = {
  href: string;
  children: ReactNode;
};

/** Mirrors the app's Button defaults (theme.ts): uppercase, semi-bold, letter-spaced. */
export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button href={href} style={styles.button}>
      {children}
    </Button>
  );
}

const styles = {
  button: {
    backgroundColor: emailColors.trailGreen[6],
    color: emailColors.white,
    borderRadius: emailRadius.sm,
    fontFamily: emailFonts.body,
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    padding: "12px 24px",
    textDecoration: "none",
    display: "inline-block",
  },
};
