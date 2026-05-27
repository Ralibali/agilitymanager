import { useEffect, useRef } from 'react';

const SORO_SRC = 'https://app.trysoro.com/api/embed/ce63e899-6222-4954-8560-d61b59c37804';

/**
 * Bäddar in Trysoro-bloggen i den befintliga kunskapsbanken.
 * Laddar skriptet en gång och monterar widgeten i en egen container.
 */
export function SoroBlogEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.querySelector(`script[src="${SORO_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = SORO_SRC;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  return (
    <section className="mt-12" aria-label="Fler artiklar från Soro">
      <div ref={containerRef} id="soro-blog" className="soro-blog-embed" />
    </section>
  );
}

export default SoroBlogEmbed;
