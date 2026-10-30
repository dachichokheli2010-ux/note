import { useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
  error?: string;
  labelAction?: ReactNode;
}

export default function PasswordField({ id, label, value, onChange, autoComplete, hint, error, labelAction }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const describedBy = error || hint ? `${id}-hint` : undefined;
  return <div className={`form-field${error ? ' has-error' : ''}`}>
    <div className="form-label-row"><label htmlFor={id}>{label}</label>{labelAction}</div>
    <div className="input-with-action">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} />
      <button type="button" className="input-action" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button>
    </div>
    {(error || hint) && <p className="form-hint" id={describedBy}><Info size={16} aria-hidden="true" />{error || hint}</p>}
  </div>;
}
