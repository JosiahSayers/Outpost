import { createRoot } from "react-dom/client";
import App from "./app";
import { suppressResizeObserverError } from "./utils/suppress-resize-observer-error";

suppressResizeObserverError();

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
