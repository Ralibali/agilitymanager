import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Activity,
  Building2,
  Dog,
  FileText,
  LayoutGrid,
  Loader2,
  Navigation,
  Trophy,
  Users,
  Medal,
} from "lucide-react";
import { useGlobalSearch, type SearchResultGroup } from "@/hooks/useGlobalSearch";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_ORDER: SearchResultGroup[] = [
  "Sidor",
  "Hundar",
  "Tävlingar",
  "Resultat",
  "Träning",
  "Klubbar",
  "Banor",
  "Kompisar",
  "Blogg",
];

const GROUP_ICONS: Record<SearchResultGroup, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Sidor: Navigation,
  Hundar: Dog,
  Tävlingar: Trophy,
  Resultat: Medal,
  Träning: Activity,
  Klubbar: Building2,
  Banor: LayoutGrid,
  Kompisar: Users,
  Blogg: FileText,
};

export function GlobalSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { results, loading } = useGlobalSearch(query);

  // Återställ query när dialogen stängs
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultGroup, typeof results>();
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [results]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Sök hundar, tävlingar, träningar, klubbar, banor…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Loader2 size={14} className="animate-spin" />
            Söker…
          </div>
        )}
        {!loading && results.length === 0 && (
          <CommandEmpty>
            {query ? `Inga träffar för "${query}".` : "Skriv för att söka."}
          </CommandEmpty>
        )}
        {grouped.map(({ group, items }, idx) => {
          const Icon = GROUP_ICONS[group];
          return (
            <div key={group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.group} ${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""}`}
                    onSelect={() => handleSelect(item.path)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{item.title}</div>
                      {item.subtitle && (
                        <div className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
