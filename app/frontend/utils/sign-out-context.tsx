import {
  createContext,
  useContext,
  useRef,
  type PropsWithChildren,
} from "react";

interface SignOutContextValue {
  markSignOutInitiated: () => void;
  clearSignOutInitiated: () => void;
  isSignOutInitiated: () => boolean;
}

const SignOutContext = createContext<SignOutContextValue>({
  markSignOutInitiated: () => {},
  clearSignOutInitiated: () => {},
  isSignOutInitiated: () => false,
});

// Mounted once for the whole app (see app-providers.tsx). Lets the sign-out
// flow in HeaderLinks tell the authenticated-route guard that a session drop
// was intentional, so the guard doesn't append `?redirect=` and clobber the
// "you've been signed out" navigation with the "you need to sign in" one.
// A ref (not state) because the guard only needs to read the *current* value
// synchronously inside its own effect — flipping it shouldn't itself trigger
// a re-render anywhere.
export function SignOutProvider({ children }: PropsWithChildren) {
  const initiated = useRef(false);

  return (
    <SignOutContext.Provider
      value={{
        markSignOutInitiated: () => {
          initiated.current = true;
        },
        clearSignOutInitiated: () => {
          initiated.current = false;
        },
        isSignOutInitiated: () => initiated.current,
      }}
    >
      {children}
    </SignOutContext.Provider>
  );
}

export function useSignOutContext() {
  return useContext(SignOutContext);
}
