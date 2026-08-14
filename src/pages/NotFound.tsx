import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/SiteNav";
import { Marquee } from "@/components/Marquee";

export function NotFound() {  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex h-[4.25rem] items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="grid flex-1 place-items-center px-4 text-center">
        <div>
          <p className="font-display text-[10rem] leading-none text-forest sm:text-[14rem]">404</p>
          <h1 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">Hunden tog fel väg vid hindret.</h1>
          <p className="mx-auto mt-4 max-w-md text-ink/60">
            Sidan du letar efter finns inte — men banplaneraren gör alltid.
          </p>
          <Link
            to="/"
            className="pressable shadow-hard mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-tang px-7 py-3.5 font-bold text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Till startsidan
          </Link>
        </div>
      </main>
      <Marquee items={["Fel hinder", "Omplacering", "Fem felpoäng", "Börja om"]} className="border-t-2 border-ink bg-tang text-ink" />
    </div>
  );
}

