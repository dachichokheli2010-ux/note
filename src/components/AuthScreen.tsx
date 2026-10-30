import { useState } from 'react';
import type { FormEvent } from 'react';
import { Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Brand from './Brand';
import PasswordField from './PasswordField';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

const copy: Record<AuthMode, { title: string; description: string; submit: string }> = {
  login: { title: 'Welcome to Note', description: 'Please log in to continue', submit: 'Login' },
  signup: { title: 'Create Your Account', description: 'Sign up to start organizing your notes and boost your productivity.', submit: 'Sign up' },
  forgot: { title: 'Forgotten your password?', description: 'Enter your email below, and we’ll send you a link to reset it.', submit: 'Send Reset Link' },
  reset: { title: 'Reset Your Password', description: 'Choose a new password to secure your account.', submit: 'Reset Password' },
};

function GoogleIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.95 10.95 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>;
}

export default function AuthScreen({ initialMode = 'login', onPasswordReset }: { initialMode?: AuthMode; onPasswordReset?: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password' | 'confirm', string>>>({});

  function switchMode(next: AuthMode) {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setErrorMessage('');
    setFieldErrors({});
  }

  function validate() {
    const errors: typeof fieldErrors = {};
    if (mode !== 'reset' && !EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (mode === 'login' && !password) errors.password = 'Please enter your password.';
    if ((mode === 'signup' || mode === 'reset') && password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (mode === 'reset' && confirmPassword !== password) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !validate()) return;
    setBusy(true);
    setMessage('');
    setErrorMessage('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email for a confirmation link to finish creating your account.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('If an account exists for that email, a password reset link has been sent.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        onPasswordReset?.();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) setErrorMessage(error.message);
  }

  return <main className="auth-page">
    <form className="auth-card" onSubmit={submit} noValidate>
      <Brand />
      <div className="auth-heading">
        <h1>{copy[mode].title}</h1>
        <p>{copy[mode].description}</p>
      </div>

      <div className="auth-fields">
        {mode !== 'reset' && <div className={`form-field${fieldErrors.email ? ' has-error' : ''}`}>
          <div className="form-label-row"><label htmlFor="auth-email">Email Address</label></div>
          <input id="auth-email" type="email" autoComplete="email" placeholder="email@example.com" value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'auth-email-hint' : undefined} />
          {fieldErrors.email && <p className="form-hint" id="auth-email-hint"><Info size={16} aria-hidden="true" />{fieldErrors.email}</p>}
        </div>}
        {mode !== 'forgot' && <PasswordField
          id="auth-password"
          label={mode === 'reset' ? 'New Password' : 'Password'}
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          hint={mode === 'login' ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters`}
          error={fieldErrors.password}
          labelAction={mode === 'login' ? <button type="button" className="text-link" onClick={() => switchMode('forgot')}>Forgot</button> : undefined}
        />}
        {mode === 'reset' && <PasswordField id="auth-confirm" label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={fieldErrors.confirm} />}
      </div>

      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? 'Please wait…' : copy[mode].submit}</button>

      {(mode === 'login' || mode === 'signup') && <div className="auth-alternate">
        <p>Or log in with:</p>
        <button type="button" className="button button-outline button-full button-google" onClick={signInWithGoogle}><GoogleIcon />Google</button>
      </div>}

      <div className="auth-footer">
        {mode === 'login' && <p>No account yet? <button type="button" className="text-link" onClick={() => switchMode('signup')}>Sign Up</button></p>}
        {mode === 'signup' && <p>Already have an account? <button type="button" className="text-link" onClick={() => switchMode('login')}>Login</button></p>}
        {mode === 'forgot' && <p>Remembered it? <button type="button" className="text-link" onClick={() => switchMode('login')}>Back to Login</button></p>}
      </div>
    </form>
  </main>;
}
