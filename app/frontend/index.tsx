import "./instrument";

import { reactErrorHandler } from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { registerServiceWorker } from "./utils/register-service-worker";
import { suppressResizeObserverError } from "./utils/suppress-resize-observer-error";

suppressResizeObserverError();
registerServiceWorker();

const container = document.getElementById("root");
const root = createRoot(container!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
});
root.render(<App />);
