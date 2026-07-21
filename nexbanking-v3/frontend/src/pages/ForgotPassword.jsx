import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}>

      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--warning) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />

      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>NexBanking</span>
        </div>

        <div className="glass card p-8">
          {!submitted ? (
            <>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'var(--accent-glow)' }}>
                <Mail className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Reset password</h1>
              <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      className={`input-field pl-10 ${error ? 'input-error' : ''}`}
                    />
                  </div>
                  {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
                </div>

                <button type="submit" className="btn-primary w-full">
                  Send Reset Link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-14 h-14" style={{ color: 'var(--success)' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Check your inbox</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              </p>
              <p className="text-xs px-4 py-3 rounded-xl" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                Note: Password reset emails require backend email integration (e.g. Nodemailer + SMTP). This UI is ready to connect.
              </p>
            </div>
          )}

          <Link to="/login"
            className="flex items-center justify-center gap-2 mt-6 text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
