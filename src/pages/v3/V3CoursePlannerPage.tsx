import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CoursePlannerPage = lazy(() => import("@/pages/CoursePlannerPage"));

export default function V3CoursePlannerPage() {
  return (
    <div className="min-h-[calc(100vh-100px)] bg-v3-canvas animate-v3-fade-in">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-6 pt-3 lg:pt-4">
        <Link
          to="/v3/courses"
          className="v3-tappable inline-flex items-center gap-1.5 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 px-3 py-1.5 text-v3-sm font-medium text-v3-text-primary shadow-v3-xs hover:border-v3-text-tertiary/40"
        >
          <ArrowLeft size={14} />
          Banor &amp; kurser
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="max-w-[1400px] mx-auto px-3 lg:px-6 py-6 space-y-3">
            <div className="v3-skeleton h-10 w-64 rounded-v3-base" />
            <div className="v3-skeleton h-[60vh] w-full rounded-v3-xl" />
          </div>
        }
      >
        <CoursePlannerPage />
      </Suspense>
    </div>
  );
}
