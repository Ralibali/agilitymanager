import { useEffect, useState } from 'react';
import { fetchCloudCourses, fetchCourseVersions, type CloudCourse, type CourseVersion } from '@/features/course-planner-v2/cloudCourses';

export function CloudCourseBrowser({ userId, onPick }: { userId: string; onPick: (course: CloudCourse, version?: CourseVersion) => void }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'updated' | 'name'>('updated');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ courses: CloudCourse[]; count: number }>({ courses: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<CloudCourse | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      fetchCloudCourses(userId, query, sort, page).then(data => { if (!cancelled) setResult(data); })
        .catch(() => { if (!cancelled) setError('Kunde inte hämta dina molnsparade banor.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userId, query, sort, page, retry]);
  if (selected) return <VersionBrowser key={selected.id} course={selected} onBack={() => setSelected(null)} onPick={onPick} />;
  return <section className="space-y-3" aria-label="Banor på ditt konto">
    <p className="text-sm font-bold">På ditt konto · privata tills du väljer att dela</p>
    <div className="flex gap-2">
      <input aria-label="Sök molnsparade banor" placeholder="Sök bana…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} className="min-w-0 flex-1 rounded-lg border p-2" />
      <select aria-label="Sortera molnsparade banor" value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(0); }} className="rounded-lg border p-2">
        <option value="updated">Senast ändrad</option><option value="name">Namn A–Ö</option>
      </select>
    </div>
    {loading ? <p role="status">Hämtar banor…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)} className="underline">Försök igen</button></p> : <>
      <p className="text-xs text-ink/60">{result.count} {result.count === 1 ? 'bana' : 'banor'}</p>
      {!result.count && <p className="text-sm">{query ? 'Inga banor matchar sökningen.' : 'Välj Spara bana för att spara din första bana på kontot.'}</p>}
      <ul className="space-y-2">{result.courses.map(course => <li key={course.id} className="rounded-xl border-2 border-ink/15 bg-white p-3">
        <button onClick={() => onPick(course)} className="w-full text-left"><strong>{course.name} · v{course.revision}</strong><span className="block text-xs text-ink/60">{new Date(course.updated_at).toLocaleString('sv-SE')} · {course.is_public ? 'Publik' : 'Privat'}</span></button>
        <button onClick={() => setSelected(course)} className="mt-2 min-h-9 text-sm font-semibold underline">Visa versioner av {course.name}</button>
      </li>)}</ul>
      <Pages page={page} count={result.count} onPage={setPage} />
    </>}
  </section>;
}

function VersionBrowser({ course, onBack, onPick }: { course: CloudCourse; onBack: () => void; onPick: (course: CloudCourse, version?: CourseVersion) => void }) {
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ versions: CourseVersion[]; count: number; error?: string; loading: boolean }>({ versions: [], count: 0, loading: true });
  useEffect(() => {
    let cancelled = false;
    fetchCourseVersions(course.id, page).then(data => { if (!cancelled) setState({ ...data, loading: false }); })
      .catch(() => { if (!cancelled) setState({ versions: [], count: 0, loading: false, error: 'Kunde inte hämta versionerna.' }); });
    return () => { cancelled = true; };
  }, [course.id, page, retry]);
  return <section className="space-y-3">
    <button onClick={onBack} className="min-h-10 underline">Tillbaka till mina banor</button>
    <h3 className="font-bold">Versioner av {course.name}</h3>
    <p className="text-xs text-ink/60">Öppna en tidigare version och välj Spara bana för att skapa en ny version. Tidigare versioner finns kvar.</p>
    {state.loading ? <p role="status">Hämtar versioner…</p> : state.error ? <p role="alert">{state.error} <button className="underline" onClick={() => { setState(s => ({ ...s, loading: true })); setRetry(n => n + 1); }}>Försök igen</button></p> : <>
      <ul className="space-y-2">{state.versions.map(version => <li key={version.revision}><button onClick={() => onPick(course, version)} className="w-full rounded-xl border p-3 text-left"><strong>{version.name} · v{version.revision}</strong><span className="block text-xs">{new Date(version.created_at).toLocaleString('sv-SE')}</span></button></li>)}</ul>
      <Pages page={page} count={state.count} onPage={next => { setState(s => ({ ...s, loading: true })); setPage(next); }} />
    </>}
  </section>;
}

function Pages({ page, count, onPage }: { page: number; count: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / 10));
  return <nav aria-label="Sidindelning för molnbanor" className="flex items-center justify-between gap-2 text-sm">
    <button className="min-h-10 disabled:opacity-40" disabled={page === 0} onClick={() => onPage(page - 1)}>Föregående</button>
    <span>Sida {page + 1} av {pages}</span>
    <button className="min-h-10 disabled:opacity-40" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Nästa</button>
  </nav>;
}
