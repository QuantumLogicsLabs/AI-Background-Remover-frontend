import { NavLink } from 'react-router-dom';

const MOBILE_NAV_ITEMS = [
  {
    to: '/',
    label: 'Remove BG',
    icon: (<span className="text-xl leading-none">✂️</span>),
  },
  {
    to: '/enhance',
    label: 'Enhance',
    icon: (<span className="text-xl leading-none">✨</span>),
  },
  {
    to: '/batch',
    label: 'Batch',
    icon: (<span className="text-xl leading-none">📁</span>),
  },
  {
    to: '/history',
    label: 'History',
    icon: (<span className="text-xl leading-none">🕐</span>),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (<span className="text-xl leading-none">⚙️</span>),
  },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-border px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb"
    >
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[10px] font-medium transition-all ${
              isActive
                ? 'text-magenta font-semibold scale-105'
                : 'text-secondary hover:text-primary'
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
