import type { ReactNode } from 'react';
import { Reveal, RevealText } from './Reveal';

/** Einheitlicher Abschnittskopf: Index · Label, Headline, optionaler Intro-Text. */
export function SectionHeading({
  index,
  label,
  title,
  accentWords,
  intro,
  tone = 'dark',
  className = '',
  id,
  size = 'lg',
}: {
  size?: 'lg' | 'md';
  index: string;
  label: string;
  title: string;
  accentWords?: string[];
  intro?: ReactNode;
  tone?: 'dark' | 'light';
  className?: string;
  id?: string;
}) {
  const mute = tone === 'dark' ? 'text-mute' : 'text-paper-mute';
  const line = tone === 'dark' ? 'bg-line-2' : 'bg-paper-ink/20';
  return (
    <div className={`grid gap-8 lg:grid-cols-12 lg:items-end ${className}`}>
      <div className="lg:col-span-8">
        <Reveal y={12}>
          <p className={`eyebrow flex items-center gap-3 ${mute}`}>
            <span className="text-accent">{index}</span>
            <span className={`h-px w-10 ${line}`} />
            <span>{label}</span>
          </p>
        </Reveal>
        <RevealText id={id} text={title} accentWords={accentWords} className={`${size === 'lg' ? 'display-lg' : 'display-md'} mt-6 text-balance`} />
      </div>
      {intro && (
        <Reveal delay={0.15} className={`text-pretty text-[1.05rem] leading-relaxed lg:col-span-4 ${mute}`}>
          {intro}
        </Reveal>
      )}
    </div>
  );
}
