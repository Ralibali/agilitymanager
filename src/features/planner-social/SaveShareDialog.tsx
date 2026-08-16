import { useEffect, useState } from "react";
import { Check, Copy, Globe, Loader2, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plannerApi, usePlannerProfile } from "@/lib/plannerProfile";

export interface SavedCourseRef {
  id: string;
  isPublic: boolean;
}

/**
 * Sparar banan mot den lättviktiga profilen och låter användaren välja
 * publik (kommentarer + betyg) eller privat.
 */
export function SaveShareDialog({
  open,
  onOpenChange,
  courseName,
  sport,
  courseData,
  courseId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  sport: string;
  courseData: unknown;
  courseId: string | null;
  onSaved: (ref: SavedCourseRef) => void;
}) {
  const { profile } = usePlannerProfile();
  const [name, setName] = useState(courseName);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(courseId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(courseName || "Min bana");
      setSavedId(courseId);
      setCopied(false);
    }
  }, [open, courseName, courseId]);

  const shareUrl = savedId ? `${window.location.origin}/bana/${savedId}` : "";

  const save = async () => {
    setSaving(true);
    try {
      const res = await plannerApi<{ course: { id: string; is_public: boolean } }>("save-course", {
        courseId: savedId,
        name: name.trim() || "Min bana",
        sport,
        isPublic,
        courseData,
      });
      setSavedId(res.course.id);
      onSaved({ id: res.course.id, isPublic: res.course.is_public });
      toast.success(isPublic ? "Bana sparad och publik" : "Bana sparad privat");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara banan");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera länken");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Spara & dela bana
          </DialogTitle>
          <DialogDescription>
            Sparas som {profile?.name ?? "din profil"}. Publika banor kan andra kommentera och betygsätta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="save-course-name">Bananamn</Label>
            <Input
              id="save-course-name"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              aria-pressed={isPublic}
              className={`rounded-xl border p-3 text-left transition ${
                isPublic ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              }`}
            >
              <Globe className="mb-1 h-4 w-4" />
              <div className="text-sm font-semibold">Publik</div>
              <div className="text-xs text-muted-foreground">Andra kan se, kommentera och betygsätta</div>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              aria-pressed={!isPublic}
              className={`rounded-xl border p-3 text-left transition ${
                !isPublic ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              }`}
            >
              <Lock className="mb-1 h-4 w-4" />
              <div className="text-sm font-semibold">Privat</div>
              <div className="text-xs text-muted-foreground">Bara du kommer åt banan</div>
            </button>
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savedId ? "Uppdatera bana" : "Spara bana"}
          </Button>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Att rita, spara och dela banor ingår i gratisnivån. Nya extrafunktioner kan
            bli betalda framöver — då märker vi dem tydligt innan du väljer dem.
          </p>

          {savedId && isPublic && (
            <div className="space-y-1.5">
              <Label htmlFor="save-course-link">Delningslänk</Label>
              <div className="flex gap-2">
                <Input id="save-course-link" readOnly value={shareUrl} />
                <Button type="button" variant="secondary" onClick={copy} aria-label="Kopiera länk">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SaveShareDialog;
