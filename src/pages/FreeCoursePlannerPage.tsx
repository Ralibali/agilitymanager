import { Helmet } from "react-helmet-async";
import V3CoursePlannerV2Page from "@/pages/v3/V3CoursePlannerV2Page";

/**
 * Publik ingång till AgilityManagers riktiga banplanerare.
 *
 * Viktigt: den här sidan har avsiktligt INGEN egen/förenklad ritmotor.
 * /banplanerare och den inloggade V3-vyn använder samma V2-planerare,
 * samma hinder, samma regelmotor, samma export och samma lokala autosparning.
 * Konto behövs bara där en funktion faktiskt kräver en användare, t.ex.
 * molnsparning, klubbdelning och koppling till träningsloggen.
 */
export default function FreeCoursePlannerPage() {
  return (
    <>
      <Helmet>
        <title>Gratis banplanerare för agility & hoopers | AgilityManager</title>
        <meta
          name="description"
          content="Rita agility- och hoopersbanor gratis i AgilityManagers fulla banplanerare. Riktig meterskala, svenska regelverk, banlinje, PDF-export, 3D och lokal autosparning – utan konto."
        />
        <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
        <meta property="og:title" content="Gratis banplanerare för agility & hoopers | AgilityManager" />
        <meta
          property="og:description"
          content="Använd samma fulla banplanerare som i AgilityManager – gratis och utan inloggning för att rita, planera och exportera banor."
        />
        <meta property="og:url" content="https://agilitymanager.se/banplanerare" />
        <meta property="og:type" content="website" />
      </Helmet>
      <V3CoursePlannerV2Page />
    </>
  );
}
