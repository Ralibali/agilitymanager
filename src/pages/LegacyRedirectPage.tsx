import { Navigate, useLocation, useParams } from "react-router";
import { legacyCoursePath } from "@/lib/legacyCourseRedirect";
import { LEGACY_REDIRECTS } from "@/lib/legacyRedirects";

/** Leder gamla adresser från före redesignen till närmaste befintliga sida. */
export default function LegacyRedirectPage() {
  const { pathname } = useLocation();
  const { courseKey } = useParams<{ courseKey: string }>();
  const target = courseKey !== undefined ? legacyCoursePath(courseKey) : (LEGACY_REDIRECTS[pathname] ?? "/");
  return <Navigate to={target} replace />;
}
