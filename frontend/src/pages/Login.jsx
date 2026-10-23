import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Eye, EyeOff, Sun, Moon,
  AlertCircle, Clock,
} from 'lucide-react';
import Footer from '../components/Footer';

const LOCKOUT_KEY  = 'dnf_login_lockout';
const ATTEMPTS_KEY = 'dnf_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

function getLockoutState() {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.until) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getAttempts() {
  return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
}

function recordFailedAttempt() {
  const count = getAttempts() + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(count));
  if (count >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_MS;
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until }));
    localStorage.setItem(ATTEMPTS_KEY, '0');
  }
  return count;
}

function clearAttempts() {
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.removeItem(ATTEMPTS_KEY);
}

function formatSeconds(ms) {
  const s   = Math.ceil(ms / 1000);
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const Login = () => {
  const [tab, setTab]           = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [business, setBusiness] = useState('');
  const [country, setCountry]   = useState('');
  const [phone, setPhone]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [lockout,    setLockout]    = useState(() => getLockoutState());
  const [countdown,  setCountdown]  = useState('');

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const { login, signup } = useContext(AuthContext);
  const toast    = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!lockout) return;
    const interval = setInterval(() => {
      const remaining = lockout.until - Date.now();
      if (remaining <= 0) { setLockout(null); clearInterval(interval); }
      else setCountdown(formatSeconds(remaining));
    }, 500);
    setCountdown(formatSeconds(lockout.until - Date.now()));
    return () => clearInterval(interval);
  }, [lockout]);

  const validate = () => {
    const errs = {};
    if (tab === 'signup' && !name.trim())   errs.name     = 'Name is required';
    if (!email.trim())                       errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))   errs.email    = 'Enter a valid email';
    if (!password)                           errs.password = 'Password is required';
    else if (password.length < 8)           errs.password = 'Minimum 8 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const current = getLockoutState();
    if (current) { setLockout(current); return; }
    if (!validate()) return;

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        clearAttempts();
        navigate(location.state?.returnTo || '/dashboard', { replace: true });
      } else {
        await signup(name, email, password, business, country, phone);
        clearAttempts();
        toast.success('Account Pending Approval', 'Your account has been created and is pending admin approval. You can login once approved.');
        switchTab('login');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Authentication failed';
      if (tab === 'login') {
        const attempts = recordFailedAttempt();
        const fresh    = getLockoutState();
        if (fresh) {
          setLockout(fresh);
          toast.error('Account Temporarily Locked', 'Too many failed attempts. Please wait 5 minutes.');
        } else {
          const rem = MAX_ATTEMPTS - attempts;
          toast.error('Login Failed', msg + (rem > 0 ? ` ${rem} attempt${rem !== 1 ? 's' : ''} remaining.` : ''));
        }
      } else {
        toast.error('Sign Up Failed', msg);
      }
      setFieldErrors({});
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setFieldErrors({});
    setEmail('');
    setPassword('');
    setName('');
    setBusiness('');
    setCountry('');
    setPhone('');
    setShowPass(false);
  };

  return (
    <div className="auth-root">
      {/* Theme toggle — fixed top right */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 20 }}>
        <button
          className="btn-icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          id="auth-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Main auth panel */}
      <div className="auth-panel animate-fade-in-scale">

        <div className="card auth-card">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img
              src="/logo.png"
              alt="DNF Trading"
              style={{
                width: 110,
                height: 'auto',
                margin: '0 auto 0.75rem',
                display: 'block',
                filter: theme === 'dark'
                  ? 'drop-shadow(0 4px 16px rgba(58,123,213,0.35))'
                  : 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))',
              }}
            />
            <h2 style={{ fontSize: '1.45rem', marginBottom: '0.25rem' }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {tab === 'login'
                ? 'Sign in to your account to continue'
                : 'Join DNF Trading today'}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
              role="tab"
              aria-selected={tab === 'login'}
              id="tab-login"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
              role="tab"
              aria-selected={tab === 'signup'}
              id="tab-signup"
            >
              Sign Up
            </button>
          </div>

          {/* Lockout Banner */}
          {lockout && (
            <div className="lockout-banner" role="alert" aria-live="assertive">
              <Clock size={18} style={{ flexShrink: 0 }} />
              <span>
                Account temporarily locked. Try again in <strong>{countdown}</strong>
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {tab === 'signup' && (
              <>
                <div className="input-group">
                  <label htmlFor="auth-name">Full Name</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      className={`input-field has-icon ${fieldErrors.name ? 'error' : ''}`}
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                      autoComplete="name"
                      disabled={loading || !!lockout}
                    />
                  </div>
                  {fieldErrors.name && (
                    <span className="input-error"><AlertCircle size={12} /> {fieldErrors.name}</span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="auth-business">Business Name</label>
                  <div className="input-wrapper">
                    <input
                      id="auth-business"
                      type="text"
                      className={`input-field ${fieldErrors.business ? 'error' : ''}`}
                      placeholder="Acme Corp"
                      value={business}
                      onChange={(e) => { setBusiness(e.target.value); setFieldErrors(p => ({ ...p, business: '' })); }}
                      disabled={loading || !!lockout}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="auth-country">Country</label>
                  <div className="input-wrapper">
                    <input
                      id="auth-country"
                      type="text"
                      className={`input-field ${fieldErrors.country ? 'error' : ''}`}
                      placeholder="USA"
                      value={country}
                      onChange={(e) => { setCountry(e.target.value); setFieldErrors(p => ({ ...p, country: '' })); }}
                      disabled={loading || !!lockout}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="auth-phone">Phone Number (Optional)</label>
                  <div className="input-wrapper">
                    <input
                      id="auth-phone"
                      type="tel"
                      className="input-field"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading || !!lockout}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="input-group">
              <label htmlFor="auth-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className={`input-field has-icon ${fieldErrors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                  autoComplete="email"
                  disabled={loading || !!lockout}
                />
              </div>
              {fieldErrors.email && (
                <span className="input-error"><AlertCircle size={12} /> {fieldErrors.email}</span>
              )}
            </div>

            <div className="input-group" style={{ marginBottom: '1.75rem' }}>
              <label htmlFor="auth-password">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="auth-password"
                  type={showPass ? 'text' : 'password'}
                  className={`input-field has-icon has-suffix ${fieldErrors.password ? 'error' : ''}`}
                  placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  disabled={loading || !!lockout}
                />
                <button
                  type="button"
                  className="input-suffix"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <span className="input-error"><AlertCircle size={12} /> {fieldErrors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              id="auth-submit-btn"
              style={{ width: '100%', padding: '0.9rem', fontSize: '0.95rem' }}
              disabled={loading || !!lockout}
            >
              {loading ? (
                <><span className="spinner" /> {tab === 'login' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                tab === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none', border: 'none',
                color: 'var(--brand-primary)', fontWeight: 600,
                cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-main)',
              }}
            >
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Bottom copyright */}
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          &copy; {new Date().getFullYear()} DNF Trading. All rights reserved.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', zoom: 0.85 }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default Login;
