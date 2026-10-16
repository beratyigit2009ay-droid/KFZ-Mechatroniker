export default function SectionHeading({
  index,
  eyebrow,
  title,
  intro,
  tone = 'light',
  align = 'left',
  id,
  className = '',
}) {
  const dark = tone === 'dark'
  return (
    <div
      className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl ${className}`}
      data-reveal
    >
      <p
        className={`eyebrow ${dark ? 'text-gold-400' : 'text-gold-700'} ${
          align === 'center' ? 'justify-center' : ''
        }`}
      >
        {index && <span className="font-display text-base tracking-normal italic">{index}</span>}
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`mt-5 font-display text-[2.4rem] leading-[1.05] font-medium sm:text-5xl lg:text-[3.6rem] ${
          dark ? 'text-white' : 'text-ink-900'
        }`}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={`mt-6 text-[1.05rem] leading-relaxed ${dark ? 'text-mist' : 'text-slate'} ${
            align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}
        >
          {intro}
        </p>
      )}
    </div>
  )
}
