import VerifyEmail from "$/emails/verify-email";
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const verifyUrl =
  "https://outpost.sayerscloud.com/api/auth/verify-email?token=abc123";

// @react-email/render's render() streams through Node's ReadableStream/
// WritableStream, which collides with happy-dom's globally-registered
// polyfills of those same globals (see tests/preload.ts) -- its pipeTo()
// does an instanceof check against the real Node class and happy-dom's
// substitute fails it. renderToStaticMarkup is synchronous and untouched by
// that conflict, and these components don't need anything render() adds
// (plain-text conversion, pretty-printing) for a content assertion.
function renderEmail(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

describe("VerifyEmail", () => {
  it("greets the user by name when given one", () => {
    const html = renderEmail(
      <VerifyEmail userName="Alex" verifyUrl={verifyUrl} />,
    );

    expect(html).toContain("Hi Alex,");
  });

  it("falls back to a generic greeting without a name", () => {
    const html = renderEmail(
      <VerifyEmail userName={null} verifyUrl={verifyUrl} />,
    );

    expect(html).toContain("Hi there,");
    expect(html).not.toContain("Hi null");
  });

  it("includes the verify URL in both the button and the plain-text link", () => {
    const html = renderEmail(
      <VerifyEmail userName="Alex" verifyUrl={verifyUrl} />,
    );

    const occurrences = html.split(verifyUrl).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
