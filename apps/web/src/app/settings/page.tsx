'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ConnectTelegramButton } from '@/components/ConnectTelegramButton';
import {
  fetchProfile,
  updateProfile,
  resetPortfolio,
  sendTestNotification,
  type Profile,
} from '@/lib/api-client';

const MAX_PICTURE_BYTES = 10 * 1024 * 1024;
const CARD = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md dark:shadow-2xl';
const INPUT = 'w-full rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'block text-sm text-slate-700 dark:text-slate-300 mb-1';

export default function SettingsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [dailyReportEnabled, setDailyReportEnabled] = useState(false);
  const [dailyReportTime, setDailyReportTime] = useState('07:00');
  const [channels, setChannels] = useState<string[]>([]);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const browserTimezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const p = await fetchProfile(token);
      setProfile(p);
      if (p) {
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setAge(p.age !== null ? String(p.age) : '');
        setGender(p.gender ?? '');
        setPicturePreview(p.profilePictureUrl);
        setDailyReportEnabled(p.dailyReportEnabled);
        setDailyReportTime(p.dailyReportTime);
        setChannels(p.dailyReportChannels);
        setNotificationEmail(p.notificationEmail ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handlePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureError(null);
    if (file.size > MAX_PICTURE_BYTES) {
      setPictureError('Image is too large — please choose one under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPicturePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await updateProfile(token, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        profilePictureUrl: picturePreview ?? undefined,
      });
      setProfileSaved(true);
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setProfileSaving(false);
    }
  }

  function toggleChannel(channel: string) {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  async function handleSaveNotifications() {
    if (!token) return;
    setNotifSaving(true);
    setNotifError(null);
    setNotifSaved(false);
    try {
      await updateProfile(token, {
        dailyReportEnabled,
        dailyReportTime,
        dailyReportTimezone: browserTimezone,
        dailyReportChannels: channels,
        notificationEmail: notificationEmail || undefined,
      });
      setNotifSaved(true);
    } catch (err) {
      setNotifError((err as Error).message);
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleTestSend() {
    if (!token) return;
    setTestSending(true);
    setTestResult(null);
    setNotifError(null);
    try {
      const { sent, errors } = await sendTestNotification(token);
      setTestResult(sent.length > 0 ? `Sent via ${sent.join(', ')}.` : null);
      setNotifError(errors.length > 0 ? errors.join(' ') : null);
    } catch (err) {
      setNotifError((err as Error).message);
    } finally {
      setTestSending(false);
    }
  }

  async function handleReset() {
    if (!token) return;
    setResetting(true);
    try {
      await resetPortfolio(token);
      setResetConfirming(false);
      setResetDone(true);
    } finally {
      setResetting(false);
    }
  }

  if (authLoading || loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-slate-700 dark:text-slate-300">Log in first on the dashboard, then come back here.</p>
          <Link href="/dashboard" className="text-emerald-600 dark:text-emerald-400 underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Settings</h1>
          <Link href="/dashboard" className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline">
            ← Back to dashboard
          </Link>
        </div>

        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Appearance</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Currently using <span className="font-medium">{theme === 'dark' ? 'dark' : 'light'}</span> mode.
            </p>
            <button
              onClick={toggleTheme}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </button>
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Profile</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {picturePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={picturePreview} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-slate-300 dark:border-slate-700" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
                  No photo
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handlePictureChange} className="text-xs text-slate-600 dark:text-slate-400" />
                <p className="text-[11px] text-slate-500 mt-1">Max 10MB.</p>
                {pictureError && <p className="text-xs text-rose-600 dark:text-rose-400">{pictureError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Age</label>
                <input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={INPUT}>
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            {profileError && <p className="text-xs text-rose-600 dark:text-rose-400">{profileError}</p>}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
            >
              {profileSaving ? 'Saving…' : profileSaved ? 'Saved ✓' : 'Save profile'}
            </button>
          </div>
        </section>

        <section className={CARD}>
          <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Daily Report Notifications</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={dailyReportEnabled}
                onChange={(e) => setDailyReportEnabled(e.target.checked)}
                className="accent-emerald-500"
              />
              Send me a daily portfolio report
            </label>

            <div>
              <label className={LABEL}>Time</label>
              <input
                type="time"
                value={dailyReportTime}
                onChange={(e) => setDailyReportTime(e.target.value)}
                className={INPUT + ' w-40'}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Based on your browser: <span className="font-medium">{browserTimezone}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={channels.includes('TELEGRAM')}
                  onChange={() => toggleChannel('TELEGRAM')}
                  className="accent-emerald-500"
                />
                Telegram
              </label>
              <div className="ml-6">
                <ConnectTelegramButton />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={channels.includes('EMAIL')}
                  onChange={() => toggleChannel('EMAIL')}
                  className="accent-emerald-500"
                />
                Email
              </label>
              <div className="ml-6">
                <label className={LABEL}>Send to (defaults to your account email: {user.email})</label>
                <input
                  type="email"
                  placeholder={user.email}
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            {notifError && <p className="text-xs text-rose-600 dark:text-rose-400">{notifError}</p>}
            {testResult && <p className="text-xs text-emerald-600 dark:text-emerald-400">{testResult}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSaveNotifications}
                disabled={notifSaving}
                className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                {notifSaving ? 'Saving…' : notifSaved ? 'Saved ✓' : 'Save notification settings'}
              </button>
              <button
                onClick={handleTestSend}
                disabled={testSending}
                className="text-sm px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200"
              >
                {testSending ? 'Sending…' : 'Send test now'}
              </button>
            </div>
          </div>
        </section>

        <section className={CARD + ' border-rose-300 dark:border-rose-900'}>
          <h2 className="text-lg font-semibold mb-2 text-rose-600 dark:text-rose-400">Danger Zone</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Resets your practice portfolio back to $100,000 in cash — this permanently deletes all
            holdings and trade history.
          </p>
          {resetDone ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Portfolio reset ✓</p>
          ) : resetConfirming ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-300">Are you sure?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white"
              >
                {resetting ? 'Resetting…' : 'Yes, reset everything'}
              </button>
              <button
                onClick={() => setResetConfirming(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirming(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Reset Portfolio
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
