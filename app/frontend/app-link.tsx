import { useVersionDrift } from "$/frontend/utils/hooks/use-version-drift";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { Link } from "wouter";

interface Props extends Omit<ComponentPropsWithoutRef<"a">, "href"> {
  href?: string;
  to?: string;
}

/**
 * Drop-in replacement for wouter's Link, used as `component={AppLink}` (or
 * directly as JSX) anywhere the app links to an internal route. Renders a
 * plain anchor -- a full browser navigation -- instead of routing within the
 * SPA when a version drift is detected, so a stale client always picks up
 * the new bundle on its next navigation instead of continuing to run against
 * a backend it may no longer match. Forwards its ref since some hosts
 * (Mantine's NavLink/Menu.Item) rely on it for keyboard navigation.
 */
const AppLink = forwardRef<HTMLAnchorElement, Props>(function AppLink(
  { href, to, ...rest },
  ref,
) {
  const hasDrift = useVersionDrift();
  const resolvedHref = href ?? to;

  if (hasDrift) {
    return <a ref={ref} href={resolvedHref} {...rest} />;
  }

  return <Link ref={ref} href={resolvedHref as string} {...rest} />;
});

export default AppLink;
