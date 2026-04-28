import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile-polish.css";
import "./styles/v3-desktop-polish.css";

const rootEl = document.getElementById("root")!;
const tree = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Om react-snap (eller annan SSG/SSR) har pre-renderat HTML in i #root
// så hydrerar vi den i stället för att blåsa över med en tom render.
// Detta bevarar SEO-värdet av den prerenderade markupen.
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}
