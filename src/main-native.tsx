import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import NativeApp from "./NativeApp";
import "./index.css";
import "./mobile/mobile.css";

document.documentElement.classList.add("native-app");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <NativeApp />
    </HashRouter>
  </StrictMode>,
);
