import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { SetupPage } from '@/pages/SetupPage';
import { JoinPage } from '@/pages/JoinPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BooksPage } from '@/pages/BooksPage';
import { BookDetailPage } from '@/pages/BookDetailPage';
import { MeetsPage } from '@/pages/MeetsPage';
import { MeetDetailPage } from '@/pages/MeetDetailPage';
import { MembersPage } from '@/pages/MembersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-brown-light animate-pulse font-serif text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.isTemporary) return <Navigate to="/setup" replace />;

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-brown-light animate-pulse font-serif text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : user.isTemporary ? <Navigate to="/setup" replace /> : <Navigate to="/" replace />} />
      <Route path="/setup" element={user?.isTemporary ? <SetupPage /> : <Navigate to="/" replace />} />
      <Route path="/join/:token" element={<JoinPage />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/meets" element={<MeetsPage />} />
        <Route path="/meets/:id" element={<MeetDetailPage />} />
        <Route path="/members" element={<MembersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
