import { Outlet, useLocation } from 'react-router-dom'
import NavBar from './NavBar'

export default function Layout() {
  const { pathname } = useLocation()
  const showNav = pathname !== '/result'

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
      {showNav && <NavBar />}
    </div>
  )
}
