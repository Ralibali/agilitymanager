import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AgilityManager] Unhandled render error", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private goHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background px-5 py-12 text-foreground flex items-center justify-center">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-lg sm:p-9">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" size={24} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Något gick fel</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">AgilityManager kunde inte visa sidan</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Dina sparade uppgifter påverkas inte. Ladda om sidan och försök igen, eller gå tillbaka till startsidan.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.reload}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <RefreshCw aria-hidden="true" size={17} />
              Ladda om
            </button>
            <button
              type="button"
              onClick={this.goHome}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Home aria-hidden="true" size={17} />
              Till startsidan
            </button>
          </div>
        </section>
      </main>
    );
  }
}
