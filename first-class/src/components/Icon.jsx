const paths = {
  phone: (
    <path d="M5.2 3.8h3.1l1.6 4.1-2.1 1.4a11.2 11.2 0 0 0 6.9 6.9l1.4-2.1 4.1 1.6v3.1a2 2 0 0 1-2.1 2A16.3 16.3 0 0 1 3.2 5.9a2 2 0 0 1 2-2.1z" />
  ),
  door: (
    <>
      <path d="M6 21V4.6A1.6 1.6 0 0 1 7.6 3h8.8A1.6 1.6 0 0 1 18 4.6V21" />
      <path d="M3.5 21h17" />
      <circle cx="14.6" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  cylinder: (
    <>
      <path d="M12 3.5a4 4 0 0 1 2.6 7l1.4 10H8l1.4-10a4 4 0 0 1 2.6-7z" />
      <path d="M12 6.8v3.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 2.8v5.6c0 4.4-2.9 7.9-7 9.6-4.1-1.7-7-5.2-7-9.6V5.8z" />
      <path d="M9 12.1l2.1 2.1L15.2 10" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="1.6" />
      <path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" />
      <path d="M12 14.4v2.4" />
    </>
  ),
  car: (
    <>
      <path d="M3.5 16.5v-3l2-5A2 2 0 0 1 7.4 7h9.2a2 2 0 0 1 1.9 1.5l2 5v3a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
      <path d="M3.5 13.5h17" />
      <circle cx="7.5" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </>
  ),
  consult: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3h0A1.5 1.5 0 0 1 4 11.5z" />
      <path d="M16 8.5h2.5A1.5 1.5 0 0 1 20 10v6a1.5 1.5 0 0 1-1.5 1.5H18v3l-3.5-3H11A1.5 1.5 0 0 1 9.5 16v-1" />
    </>
  ),
  transparency: (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </>
  ),
  care: (
    <>
      <path d="M7 4h10l3.5 5L12 20 3.5 9z" />
      <path d="M3.5 9h17" />
      <path d="M9.6 4L8.2 9 12 20l3.8-11-1.4-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="16.5" r="3.5" />
      <path d="M10 14l9.5-9.5" />
      <path d="M16.5 7.5l2.2 2.2M14 10l1.6 1.6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8" />
    </>
  ),
  tools: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5L3.8 16.8a1.6 1.6 0 0 0 0 2.3l1.1 1.1a1.6 1.6 0 0 0 2.3 0l5.5-5.5a4 4 0 0 0 5-5.4L15.3 11.7l-2.6-.4-.4-2.6z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M9 7h8v8" />,
  menu: <path d="M4 8.5h16M4 15.5h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
}

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.5, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
