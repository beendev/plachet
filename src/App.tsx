import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { Footer } from './components/marketing/Footer';
import { Navbar } from './components/marketing/Navbar';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/auth/AdminLogin';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { SyndicRegister } from './pages/auth/SyndicRegister';
import { OwnerApprovalPage } from './pages/order/OwnerApprovalPage';
import { TenantOrderPage } from './pages/order/TenantOrderPage';
import { CachetsPage } from './pages/public/CachetsPage';
import { LegalNoticePage } from './pages/public/LegalNoticePage';
import { LandingPage } from './pages/public/LandingPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';
import { AuthProvider, useAuth } from './lib/auth-context';
import { PlaceurActivation } from './pages/placeur/PlaceurActivation';
import { PlaceurDashboard } from './pages/placeur/PlaceurDashboard';

const getPostLoginPath = (role: string) => {
  if (role === 'placeur') return '/placeur';
  if (role === 'admin') return '/admin';
  return '/syndic';
};

const LandingRoute = () => {
  const navigate = useNavigate();
  return (
    <LandingPage
      onPortalClick={() => navigate('/syndic/login')}
      onRegisterClick={() => navigate('/syndic/register')}
      onCachetsClick={() => navigate('/cachets')}
      onHomeClick={() => navigate('/')}
    />
  );
};

const CachetsRoute = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
      <Navbar
        onPortalClick={() => navigate('/syndic/login')}
        onRegisterClick={() => navigate('/syndic/register')}
        onCachetsClick={() => navigate('/cachets')}
        onHomeClick={() => navigate('/')}
      />
      <main>
        <CachetsPage onBack={() => navigate('/')} />
      </main>
      <Footer onPortalClick={() => navigate('/syndic/login')} />
    </div>
  );
};

const LegalNoticeRoute = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
      <Navbar
        onPortalClick={() => navigate('/syndic/login')}
        onRegisterClick={() => navigate('/syndic/register')}
        onCachetsClick={() => navigate('/cachets')}
        onHomeClick={() => navigate('/')}
      />
      <main>
        <LegalNoticePage />
      </main>
      <Footer onPortalClick={() => navigate('/syndic/login')} />
    </div>
  );
};

const PrivacyPolicyRoute = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white">
      <Navbar
        onPortalClick={() => navigate('/syndic/login')}
        onRegisterClick={() => navigate('/syndic/register')}
        onCachetsClick={() => navigate('/cachets')}
        onHomeClick={() => navigate('/')}
      />
      <main>
        <PrivacyPolicyPage />
      </main>
      <Footer onPortalClick={() => navigate('/syndic/login')} />
    </div>
  );
};

const TenantOrderRoute = () => {
  const { token } = useParams();
  if (!token) return <NotFound message="Lien de commande introuvable." />;
  return <TenantOrderPage token={token} />;
};

const OwnerApprovalRoute = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  if (!token) return <NotFound message="Token manquant pour la validation propriétaire." />;
  return <OwnerApprovalPage token={token} />;
};

const ResetPasswordRoute = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  if (!token) return <NotFound message="Lien de réinitialisation invalide." />;
  return <ResetPassword token={token} />;
};

const PlaceurActivationRoute = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  if (!token) return <NotFound message="Invitation invalide." />;
  return <PlaceurActivation token={token} />;
};

const AdminGate = () => {
  const { user, token, logout } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to={getPostLoginPath(user.role)} replace />;
  return <AdminDashboard user={user} authToken={token} onLogout={logout} />;
};

const SyndicGate = () => {
  const { user, token, logout } = useAuth();
  if (!user) return <Navigate to="/syndic/login" replace />;
  if (user.role !== 'syndic') return <Navigate to={getPostLoginPath(user.role)} replace />;
  return <AdminDashboard user={user} authToken={token} onLogout={logout} />;
};

const PlaceurGate = () => {
  const { user, token, logout } = useAuth();
  if (!user) return <Navigate to="/syndic/login" replace />;
  if (user.role !== 'placeur') return <Navigate to={getPostLoginPath(user.role)} replace />;
  return <PlaceurDashboard user={user} authToken={token} onLogout={logout} />;
};

const AdminLoginRoute = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  if (user) return <Navigate to={getPostLoginPath(user.role)} replace />;

  return (
    <AdminLogin
      onLogin={({ user: nextUser, token }) => {
        login({ user: nextUser, token });
        navigate(getPostLoginPath(nextUser.role), { replace: true });
      }}
      onRegisterClick={() => navigate('/syndic/register')}
      onForgotPasswordClick={() => navigate('/syndic/forgot')}
      onBack={() => navigate('/')}
    />
  );
};

const SyndicLoginRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const redirectTo = (location.state as any)?.from || '/syndic';

  if (user) return <Navigate to={getPostLoginPath(user.role)} replace />;

  return (
    <AdminLogin
      onLogin={({ user: nextUser, token }) => {
        login({ user: nextUser, token });
        if (nextUser.role === 'syndic') {
          navigate(redirectTo, { replace: true });
          return;
        }
        navigate(getPostLoginPath(nextUser.role), { replace: true });
      }}
      onRegisterClick={() => navigate('/syndic/register')}
      onForgotPasswordClick={() => navigate('/syndic/forgot')}
      onBack={() => navigate('/')}
    />
  );
};

const SyndicRegisterRoute = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (user) return <Navigate to={getPostLoginPath(user.role)} replace />;
  return (
    <SyndicRegister
      onRegister={() => navigate('/syndic/login', { replace: true })}
      onBack={() => navigate('/syndic/login')}
    />
  );
};

const ForgotPasswordRoute = () => {
  const navigate = useNavigate();
  return <ForgotPassword onBack={() => navigate('/syndic/login')} />;
};

const NotFound = ({ message = 'Page introuvable.' }: { message?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-black/5 w-full max-w-md border border-black/5 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-bold mx-auto">P</div>
        <h2 className="text-2xl font-bold tracking-tight">Oops</h2>
        <p className="text-sm text-zinc-500">{message}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/')} className="w-full bg-black text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
            Retour accueil
          </button>
          <button onClick={() => navigate(-1)} className="w-full border border-black/10 text-black py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-black/30 transition-colors">
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/cachets" element={<CachetsRoute />} />
          <Route path="/mentions-legales" element={<LegalNoticeRoute />} />
          <Route path="/confidentialite" element={<PrivacyPolicyRoute />} />
          <Route path="/order/:token" element={<TenantOrderRoute />} />
          <Route path="/validation-proprietaire" element={<OwnerApprovalRoute />} />
          <Route path="/reset-password" element={<ResetPasswordRoute />} />
          <Route path="/placeur/activation" element={<PlaceurActivationRoute />} />
          <Route path="/placeur" element={<PlaceurGate />} />
          <Route path="/syndic" element={<SyndicGate />} />
          <Route path="/syndic/login" element={<SyndicLoginRoute />} />
          <Route path="/syndic/register" element={<SyndicRegisterRoute />} />
          <Route path="/syndic/forgot" element={<ForgotPasswordRoute />} />
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/admin/login" element={<AdminLoginRoute />} />
          <Route path="/admin/register" element={<Navigate to="/syndic/register" replace />} />
          <Route path="/admin/forgot" element={<Navigate to="/syndic/forgot" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
