import { lazy, Suspense, Component, type ReactNode } from "react";
import type { CoursePlanner3DProps } from "./CoursePlanner3D";

const CoursePlanner3D = lazy(() => import("./CoursePlanner3D"));

class Boundary extends Component<{ onClose: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[3D] error", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[1100] bg-[#0d1410] text-white grid place-items-center p-6">
          <div className="max-w-md text-center space-y-3">
            <div className="text-xl font-semibold">3D-vyn kunde inte laddas</div>
            <p className="text-white/70 text-sm">Försök igen, eller använd 2D-vyn.</p>
            <button onClick={this.props.onClose} className="h-10 px-4 rounded-full bg-white text-black font-semibold">
              Tillbaka till 2D
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LazyCoursePlanner3D(props: CoursePlanner3DProps) {
  return (
    <Boundary onClose={props.onClose}>
      <Suspense
        fallback={
          <div className="fixed inset-0 z-[1100] bg-[#0d1410] text-white grid place-items-center">
            <div className="text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <div className="text-sm text-white/70">Laddar 3D-vyn…</div>
            </div>
          </div>
        }
      >
        <CoursePlanner3D {...props} />
      </Suspense>
    </Boundary>
  );
}
