import type { SVGProps } from 'react';
import type { IconName } from '../types';

type Name =
  | IconName
  | 'phone'
  | 'arrow'
  | 'arrow-up-right'
  | 'calendar'
  | 'pin'
  | 'clock'
  | 'star'
  | 'check'
  | 'copy'
  | 'route'
  | 'menu'
  | 'close'
  | 'chevron'
  | 'mail'
  | 'google'
  | 'shield'
  | 'spark'
  | 'map';

const paths: Record<Name, React.ReactNode> = {
  phone: (
    <path d="M5.2 3.5h3l1.6 4.2-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4.2 1.6v3a1.7 1.7 0 0 1-1.8 1.7A15.2 15.2 0 0 1 3.5 5.3 1.7 1.7 0 0 1 5.2 3.5Z" />
  ),
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.2" />
      <path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6c0 .9.8 1.7 1.7 1.7h2.3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  google: (
    <path d="M20.2 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.6a4 4 0 0 1-1.7 2.6v2.1h2.8c1.6-1.5 2.5-3.7 2.5-6.3ZM12 20.6c2.3 0 4.2-.8 5.7-2.1l-2.8-2.1c-.8.5-1.8.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H4.3v2.2A8.6 8.6 0 0 0 12 20.6ZM7.2 13.7a5.1 5.1 0 0 1 0-3.4V8.1H4.3a8.6 8.6 0 0 0 0 7.8l2.9-2.2ZM12 6.8c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8.4 8.4 0 0 0 12 3.4a8.6 8.6 0 0 0-7.7 4.7l2.9 2.2c.7-2 2.6-3.5 4.8-3.5Z" />
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 3 7.9 7 9 4-1.1 7-4.7 7-9V6l-7-2.5Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  map: (
    <>
      <path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  wrench: (
    <path d="M14.8 4.2a4.6 4.6 0 0 0-5.6 6l-5.4 5.4a1.9 1.9 0 0 0 2.7 2.7l5.4-5.4a4.6 4.6 0 0 0 6-5.6l-2.8 2.8-2.4-.6-.6-2.4 2.7-2.9Z" />
  ),
  service: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </>
  ),
  repair: (
    <>
      <path d="M4 20 10.5 13.5" />
      <path d="m13.8 6.3 3.9 3.9M14.5 3.5l6 6-2.6 2.6-6-6 2.6-2.6ZM12 8.1l-1.5 1.5 3.9 3.9 1.5-1.5" />
    </>
  ),
  maintenance: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
      <path d="M20.5 3.5v5h-5" />
      <path d="M12 8v4l2.6 1.6" />
    </>
  ),
  garage: (
    <>
      <path d="M3.5 20V9l8.5-5 8.5 5v11" />
      <path d="M7 20v-7.5h10V20M7 15.5h10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, className, ...rest }: { name: Name } & SVGProps<SVGSVGElement>) {
  const filled = name === 'star' || name === 'google';
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'h-5 w-5'}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export type { Name as IconKey };
