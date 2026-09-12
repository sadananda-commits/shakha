import { useState } from 'react';
import { callHssApi, HssApiError } from '@/lib/hssApi';
import { User } from '@/lib/types';

export default function ProfileCard({
  user,
  onUpdated,
}: {
  user: User;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user['Full Name'] || '',
    phone: user.Phone || '',
    address: user.Address || '',
    country: user.Country || '',
    emergencyContact: user['Emergency Contact'] || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await callHssApi('updateProfile', { userId: user['User ID'], ...form });
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof HssApiError ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-ink">My Profile</h3>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-marigold-dark underline underline-offset-2"
          >
            Edit Profile
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <ProfileRow label="Full name" value={user['Full Name']} />
          <ProfileRow label="Email" value={user.Email} />
          <ProfileRow label="Phone" value={user.Phone} />
          <ProfileRow label="Address" value={user.Address} />
          <ProfileRow label="Country" value={user.Country} />
          <ProfileRow label="Emergency contact" value={user['Emergency Contact']} />
        </dl>
        <p className="text-xs text-ink-muted mt-4">
          GDPR consent given {user['Consent Date'] ? `on ${user['Consent Date']}` : ''}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-4"
    >
      <h3 className="font-display text-lg font-semibold text-ink">Edit Profile</h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Full name</span>
        <input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Phone</span>
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="input"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Address</span>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="input"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Country</span>
          <input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Emergency contact</span>
          <input
            value={form.emergencyContact}
            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            className="input"
          />
        </label>
      </div>

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-ink-light underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-ink">{value || '—'}</dd>
    </div>
  );
}
