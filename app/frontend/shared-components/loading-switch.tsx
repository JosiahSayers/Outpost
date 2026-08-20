import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { Center, Loader, Transition } from "@mantine/core";
import type { ReactNode } from "react";

const FADE_DURATION = 200;

interface Props {
  loading: boolean;
  /**
   * Rendered lazily, only once loading resolves -- lets callers read data
   * that's only guaranteed defined post-load without a separate null check
   * ahead of this component.
   */
  children: () => ReactNode;
  /** Defaults to a centered Loader; pass a skeleton grid etc. to override. */
  fallback?: ReactNode;
}

export default function LoadingSwitch({ loading, children, fallback }: Props) {
  const { isLoading, showSpinner } = useDelayedLoading(loading);

  return (
    <>
      {/* Loading branch: fades in after the debounce delay, but is removed
          instantly (exitDuration=0) once content is ready -- an eased exit
          here would keep both trees mounted briefly and stack visually. */}
      <Transition
        mounted={isLoading && showSpinner}
        transition="fade"
        duration={FADE_DURATION}
        exitDuration={0}
        timingFunction="ease-out"
      >
        {(styles) => (
          <div style={styles}>
            {fallback ?? (
              <Center py="xl">
                <Loader />
              </Center>
            )}
          </div>
        )}
      </Transition>

      <Transition
        mounted={!isLoading}
        transition="fade"
        duration={FADE_DURATION}
        timingFunction="ease-out"
      >
        {(styles) => <div style={styles}>{children()}</div>}
      </Transition>
    </>
  );
}
