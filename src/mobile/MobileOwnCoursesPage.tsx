import { useState } from "react";
import { FolderOpen, PenLine, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { deleteLocalCourse, listLocalCourses, type LocalCourse } from "@/features/course-planner-v2/localCourses";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function MobileOwnCoursesPage() {
  const [courses, setCourses] = useState(listLocalCourses);
  const [remove, setRemove] = useState<LocalCourse | null>(null);
  const deleteCourse = () => {
    if (!remove) return;
    if (!deleteLocalCourse(remove.id)) {
      toast.error("Kunde inte radera banan. Försök igen.");
      return;
    }
    setCourses(listLocalCourses());
    setRemove(null);
    toast.success("Den sparade banan har raderats.");
  };

  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <div>
      <p className="mobile-kicker">På din enhet</p>
      <h1 className="font-display text-4xl">Mina banor</h1>
      <p className="mt-3 text-ink/70">Här finns banorna du har sparat. Öppna en bana för att redigera den eller exportera en egen kopia som JSON, PDF eller bild.</p>
    </div>
    {courses.length ? <ul className="space-y-3">
      {courses.map(course => <li key={course.id} className="rounded-2xl border-2 border-ink/15 bg-[#FCFAF4] p-4">
        <h2 className="text-xl font-bold">{course.name}</h2>
        <p className="mt-1 text-sm text-ink/60">{course.sport === "hoopers" ? "Hoopers" : "Agility"} · {course.obstacleCount} hinder</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to={`/banplanerare?local=${encodeURIComponent(course.id)}`} className="mobile-primary-action">
            <PenLine size={18} aria-hidden="true" /> Öppna
          </Link>
          <button type="button" onClick={() => setRemove(course)} className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/20 px-4 font-bold" aria-label={`Radera ${course.name}`}>
            <Trash2 size={18} aria-hidden="true" /> Radera
          </button>
        </div>
      </li>)}
    </ul> : <div className="rounded-2xl border-2 border-dashed border-ink/20 p-6">
      <FolderOpen size={32} className="text-forest" aria-hidden="true" />
      <h2 className="mt-3 text-xl font-bold">Inga sparade banor än</h2>
      <p className="mt-2 text-ink/70">Rita en bana och välj Spara bana i banans meny. Ditt aktuella utkast autosparas också i planeraren.</p>
      <Link to="/banplanerare" className="mobile-primary-action mt-4">Börja rita</Link>
    </div>}
    <section className="rounded-2xl bg-ink/5 p-5" aria-labelledby="local-backup">
      <h2 id="local-backup" className="text-lg font-bold">Behåll en egen kopia</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">Banorna lagras i appen på den här enheten. Exportera dem som JSON innan du byter telefon eller rensar appens uppgifter. En exporterad banfil kan importeras i planeraren igen. Att radera en sparad bana raderar inte en separat kopia som redan ligger i planeraren.</p>
    </section>
    <section className="text-sm leading-relaxed text-ink/70">
      <h2 className="text-lg font-bold text-ink">Hjälp och kontakt</h2>
      <p className="mt-2">AgilityManager ges ut av Aurora Media AB. Kontakta <a href="mailto:info@auroramedia.se" className="underline">info@auroramedia.se</a> om du behöver hjälp.</p>
      <Link to="/integritet" className="mt-3 inline-flex min-h-12 items-center font-bold underline">Så hanterar appen dina uppgifter</Link>
    </section>
    <AlertDialog open={!!remove} onOpenChange={open => { if (!open) setRemove(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Radera den sparade banan?</AlertDialogTitle>
          <AlertDialogDescription>Den sparade banan {remove?.name} tas bort från den här enheten. Exportera först en JSON-kopia om du vill behålla den. En eventuell kopia i planeraren eller bland exporterade filer påverkas inte.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={deleteCourse}>Radera sparad bana</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}
