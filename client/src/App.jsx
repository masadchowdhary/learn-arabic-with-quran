import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Loading from './components/common/Loading';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SurahList from './pages/SurahList';
import AyahView from './pages/AyahView';
import PracticeSession from './pages/PracticeSession';
import Profile from './pages/Profile';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <Loading />;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main App component
function AppContent() {
  const { loading } = useAuth();

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loading /></div>;

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/surahs" element={<SurahList />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/surah/:chapterNum" 
          element={
            <ProtectedRoute>
              <AyahView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/practice" 
          element={
            <ProtectedRoute>
              <PracticeSession />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
