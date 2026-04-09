import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Logged for internal debugging only — no user data exposed
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Sidan hittades inte – AgilityManager</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <p className="text-6xl font-display font-bold text-primary mb-4">404</p>
          <h1 className="text-xl font-display font-semibold text-foreground mb-2">
            Sidan hittades inte
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sidan du letar efter finns inte eller har flyttats.
          </p>
          <Button asChild className="gradient-primary text-primary-foreground gap-2">
            <a href="/">
              <Home size={16} /> Tillbaka till startsidan
            </a>
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFound;
