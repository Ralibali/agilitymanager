import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CoursePlannerPage = lazy(() => import("@/pages/CoursePlannerPage"));
const TIP_KEY = "am_v3_course_planner_space_tip_seen";

export default function V3CoursePlannerPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    try {
      setShowTip(window.localStorage.getItem(TIP_KEY) !== "1");
    } catch {
      setShowTip(true);
    }
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  const dismissTip = () => {
    try {
      window.localStorage.setItem(TIP_KEY, "1");
    } catch {
      // ignore
    }
    setShowTip(false);
  };

  return (
    <div
      className={cn(
        "v3-course-planner-shell min-h-[calc(100vh-100px)] bg-v3-canvas animate-v3-fade-in",
        sidebarCollapsed && "v3-course-planner-sidebar-collapsed",
        fullscreen && "v3-course-planner-fullscreen",
      )}
    >
      <div className="v3-course-planner-topbar max-w-[1500px] mx-auto px-3 lg:px-6 pt-3 lg:pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/v3/courses"
            className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 px-3 py-1.5 text-v3-sm font-medium text-v3-text-primary shadow-v3-xs hover:border-v3-text-tertiary/40"
          >
            <ArrowLeft size={14} />
            Banor &amp; kurser
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="v3-course-planner-control"
              aria-pressed={sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
              <span className="hidden sm:inline">{sidebarCollapsed ? "Visa meny" : "Stäng meny"}</span>
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((value) => !value)}
              className="v3-course-planner-control v3-course-planner-control-primary"
              aria-pressed={fullscreen}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline">{fullscreen ? "Avsluta storbild" : "Storbild"}</span>
            </button>
          </div>
        </div>

        {showTip && (
          <div className="v3-course-planner-tip" role="status">
            <Info size={15} className="text-v3-brand-700 shrink-0" />
            <p>
              Tips: stäng vänstermenyn för större arbetsyta, eller öppna <strong>Storbild</strong> för att använda banplaneraren med alla funktioner på maximal yta.
            </p>
            <button type="button" onClick={dismissTip} aria-label="Stäng tips">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="v3-course-planner-frame">
        <Suspense
          fallback={
            <div className="max-w-[1500px] mx-auto px-3 lg:px-6 py-6 space-y-3">
              <div className="v3-skeleton h-10 w-64 rounded-v3-base" />
              <div className="v3-skeleton h-[60vh] w-full rounded-v3-xl" />
            </div>
          }
        >
          <CoursePlannerPage />
        </Suspense>
      </div>
    </div>
  );
}
