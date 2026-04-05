import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/spaces" className="brand">
          SharedBudget
        </Link>
        <nav className="topbar-nav">
          {user && (
            <>
              <span className="muted">{user.email}</span>
              <button type="button" className="btn ghost" onClick={() => void logout()}>
                Выйти
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
