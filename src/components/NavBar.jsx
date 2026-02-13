import { NavLink } from 'react-router-dom'
import { Home, FileSearch, ShieldQuestion, GitFork, Scale } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/contract', icon: FileSearch, label: 'Contracts' },
  { to: '/risk', icon: ShieldQuestion, label: 'Risk' },
  { to: '/issues', icon: GitFork, label: 'Issues' },
  { to: '/regulatory', icon: Scale, label: 'Reg Check' },
]

export default function NavBar() {
  return (
    <nav className="flex-shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
      <div className="flex justify-around items-center py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-navy-400'
                  : 'text-slate-500 active:text-slate-300'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            <span className="text-[0.625rem] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
