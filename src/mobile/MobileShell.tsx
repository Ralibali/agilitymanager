import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, PawPrint, WifiOff } from "lucide-react";
import { Link, useLocation } from "react-router";
import MobileNavigation, { MobileSectionNavigation } from "./MobileNavigation";
import { mobileSection } from "./navigation";

const SECTION_TITLES = {
  planner: "Banplanerare",
  library: "Banor",
  account: "Mitt AgilityManager",
};

function backTarget(pathname: string) {
  if (pathname === "/banplanerare" || pathname.startsWith("/bana/")) return "/banor";
  if (pathname === "/integritet" || pathname === "/radera-konto") return "/mitt-agilitymanager";
  return "/";
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    const nativeStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ connected?: unknown }>).detail;
      if (typeof detail?.connected === "boolean") setOnline(detail.connected);
    };
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    window.addEventListener("am:network-status", nativeStatus);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("am:network-status", nativeStatus);
    };
  }, []);
  return online;
}

export default function MobileShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const online = useOnlineStatus();
  const section = mobileSection(pathname);
  const planner = pathname === "/banplanerare";
  const home = pathname === "/";
  const title = pathname === "/integritet"
    ? "Integritet"
    : pathname === "/radera-konto"
      ? "Radera konto"
      : section ? SECTION_TITLES[section] : "AgilityManager";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className={`mobile-app${planner ? " mobile-app--planner" : ""}`}>
      <button type="button" className="mobile-skip-link" onClick={() => {
        const content = document.getElementById("mobile-content");
        content?.focus();
        content?.scrollIntoView({ block: "start" });
      }}>Hoppa till innehållet</button>
      <header className="mobile-header">
        <div className="mobile-header__inner">
          {home ? (
            <Link to="/" className="mobile-brand" aria-label="AgilityManager, startsida">
              <span className="mobile-brand__symbol"><PawPrint size={22} aria-hidden="true" /></span>
              <span>Agility<span className="text-forest">Manager</span></span>
            </Link>
          ) : (
            <>
              <Link to={backTarget(pathname)} className="mobile-header__button" aria-label="Tillbaka">
                <ArrowLeft size={22} aria-hidden="true" />
              </Link>
              <span className="mobile-header__title">{title}</span>
              <Link to="/" className="mobile-header__button mobile-header__home" aria-label="AgilityManager, startsida">
                <PawPrint size={22} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </header>
      {!online ? (
        <div className="mobile-offline" role="status" aria-live="polite">
          <WifiOff size={18} aria-hidden="true" />
          <p>Du är offline. Lokala banor går att använda. Delning och sparande på profil behöver internet.</p>
        </div>
      ) : null}
      <MobileSectionNavigation />
      <div id="mobile-content" className="mobile-content" tabIndex={-1}>
        {children}
      </div>
      {!planner ? (
        <footer className="mobile-legal-links" aria-label="Integritet och konto">
          <Link to="/integritet">Integritet</Link>
          <span aria-hidden="true">·</span>
          <Link to="/radera-konto">Radera konto</Link>
        </footer>
      ) : null}
      <MobileNavigation />
    </div>
  );
}
