import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { GlobalPlannerRibbon } from "./components/GlobalPlannerRibbon";
import "./index.css";
import "./styles/mobile-polish.css";
import "./styles/v3-desktop-polish.css";
import "./styles/v3-hardening.css";
import { registerSW } from "./pwa/registerSW";

import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/instrument-serif/400.css";

const rootEl = document.getElementById("root")!;
const tree = (
  <HelmetProvider>
    <GlobalPlannerRibbon />
    <App />
  </HelmetProvider>
);

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}

registerSW();
