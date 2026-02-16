import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { BookOpen, Users, Calendar, Home, LogOut, Menu, X, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/books', icon: BookOpen, label: 'Reading List' },
  { to: '/meets', icon: Calendar, label: 'Meets' },
  { to: '/members', icon: Users, label: 'Members' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navItems = user?.isAdmin
    ? [...baseNavItems, { to: '/admin', icon: Shield, label: 'Admin' }]
    : baseNavItems;
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-warm-gray sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-burgundy" />
              <span className="font-serif text-xl font-semibold text-burgundy">Reading Circle</span>
            </NavLink>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-burgundy text-white'
                      : 'text-brown hover:bg-warm-gray-light'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-brown-light">
                {user?.username}
                {user?.isAdmin && (
                  <span className="ml-1 text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">Admin</span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-brown-light hover:text-burgundy transition-colors rounded-lg hover:bg-warm-gray-light"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-brown hover:bg-warm-gray-light rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-warm-gray bg-white">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-burgundy text-white'
                      : 'text-brown hover:bg-warm-gray-light'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t border-warm-gray pt-3 mt-3">
                <div className="px-4 py-2 text-sm text-brown-light">
                  Signed in as <strong>{user?.username}</strong>
                  {user?.isAdmin && (
                    <span className="ml-1 text-xs bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-brown hover:bg-warm-gray-light"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
