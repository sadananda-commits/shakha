import { useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Friend', 'Other'];

export default function AddParticipantForm({
  userId,
  onAdded,
  onCancel,
}: {
  userId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    relationship: 'Child',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
  });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gdprConsent) {
      setError('Please confirm consent on this participant\u2019s behalf to continue.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await callHssApi('addParticipant', { userId, ...form, gdprConsent: true });
      onAdded();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-4"
    >
      <h3 className="font-display text-lg font-semibold text-ink">Add Participant</h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Full name</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Relationship</span>
        <select
          value={form.relationship}
          onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          className="input"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Date of birth</span>
          <input
            type="date"
            required
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Gender</span>
          <select
            required
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="input"
          >
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-ink-muted -mt-2">
        Date of birth and gender are required — they're how the system works out
        Shakha participation composition automatically, instead of a coordinator
        having to estimate and count it by hand.
      </p>

      <p className="text-xs text-ink-muted -mb-2">
        Phone and email are optional — mainly relevant for adult family members.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Phone (optional)</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Email (optional)</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </label>
      </div>

      <label className="flex items-start gap-3 border border-ink/10 rounded-card p-4">
        <input
          type="checkbox"
          checked={gdprConsent}
          onChange={(e) => setGdprConsent(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-ink-light leading-relaxed">
          As their parent/guardian or on their own behalf, I consent to HSS storing
          and processing this participant's personal information for Shakha
          administration, communication, participation tracking and community
          activities, in accordance with applicable GDPR requirements.
        </span>
      </label>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Adding…' : 'Add participant'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-light underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
