'use client';
import { useState } from 'react';
import Link from 'next/link';
import { submitContactRequest } from '@/lib/api-client';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('privacy');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try { const result = await submitContactRequest({ email, category, message }); setReceipt(result.receipt); setMessage(''); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="workspace-shell max-w-3xl">
    <header className="workspace-heading"><div><h1>Privacy and support</h1><p>Contact the site operator, who handles privacy requests, in British Columbia, Canada.</p></div></header>
    <p className="mb-4">Use this form to request access or correction, ask about privacy practices, report an account problem or request cancellation. No account is required. For vulnerabilities, use <a className="underline" href="https://github.com/Godslayer2003/alpha-trade-engine/security/advisories/new">private security reporting</a>.</p>
    <p className="mb-6 text-sm">Your email and message are stored for the operator&apos;s review. Open requests remain until resolved; resolved requests are removed after one year. Never include passwords, API keys, payment card details or identity documents. See the <Link className="underline" href="/privacy">Privacy policy</Link>.</p>
    {receipt && <p role="status" className="mb-5 break-all">Request recorded. Reference: {receipt}. This receipt confirms submission, not resolution.</p>}
    <form onSubmit={submit} className="space-y-5">
      <label className="block">Reply email<input className="mt-2 block w-full rounded-md border bg-transparent px-3 py-2" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block">Request type<select className="mt-2 block w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-900" value={category} onChange={event => setCategory(event.target.value)}><option value="privacy">Privacy access, correction or enquiry</option><option value="support">Account support</option><option value="cancellation">Cancellation or refund request</option></select></label>
      <label className="block">Message<textarea className="mt-2 block min-h-36 w-full rounded-md border bg-transparent px-3 py-2" required minLength={10} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button className="button-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
    </form>
  </main>;
}
