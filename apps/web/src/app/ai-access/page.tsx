'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { confirmAiEligibility, withdrawAiEligibility } from '@/lib/api-client';

export default function AiAccessPage() {
  const { token } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawn, setWithdrawn] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!token || !confirmed || busy) return;
    setBusy(true); setError(null);
    try { await confirmAiEligibility(token); setDone(true); setWithdrawn(false); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function withdraw() {
    if (!token || busy) return; setBusy(true); setError(null);
    try { await withdrawAiEligibility(token); setDone(false); setConfirmed(false); setWithdrawn(true); } catch(err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <main className="workspace-shell max-w-3xl">
    <header className="workspace-heading"><div><h1>AI access</h1><p>AI features are currently limited to adults aged 18 or older in Canada.</p></div></header>
    <p className="mb-4">AI requests send messages and research context to Gemini or OpenAI. The unpaid Gemini service may use content to improve its products and for human review. Do not submit personal, confidential or sensitive information. <Link className="underline" href="/privacy">Read the Privacy policy</Link>.</p>
    <p className="mb-6">This country and age declaration is stored with your account. No identity document or date of birth is requested. Simulated trading does not require AI access. AI Guide access also requires the separate one-time payment where available.</p>
    {withdrawn && <p role="status" className="mb-4">AI eligibility withdrawn.</p>}
    {!token ? <p>Sign in using the navigation to confirm eligibility.</p> : done ? <p role="status">Eligibility recorded. <Link href="/dashboard" className="underline">Return to the workspace</Link>.</p> : <form onSubmit={submit} className="space-y-5">
      <label className="flex items-start gap-3"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I am 18 or older and currently in Canada.</span></label>
      {error && <p role="alert">{error}</p>}
      <button className="button-primary" disabled={!confirmed || busy}>{busy ? 'Saving…' : 'Confirm eligibility'}</button>
    </form>}
    {token && <div className="mt-6"><p className="mb-3">If you leave Canada or no longer wish to use AI, withdraw your eligibility declaration.</p><button className="rounded-md border px-3 py-2" disabled={busy} onClick={withdraw}>Withdraw AI eligibility</button>{done && error && <p role="alert">{error}</p>}</div>}
  </main>;
}
