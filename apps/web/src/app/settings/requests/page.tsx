'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchContactRequests, resolveContactRequest, type ContactRequest } from '@/lib/api-client';
export default function RequestsPage() {
  const { user } = useAuth();
  return <RequestsInbox key={user?.id ?? 'anonymous'} />;
}
function RequestsInbox() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ContactRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (!token) return; let active=true; fetchContactRequests(token).then(data => { if(active) setRequests(data); }).catch(err => { if(active) setError(err.message); }); return () => { active=false; }; }, [token]);
  async function resolve(id: string) {
    if (!token || busy) return; setBusy(id); setError(null);
    try { await resolveContactRequest(token, id); setRequests(value => value?.filter(request => request.id !== id) ?? null); } catch(err) { setError((err as Error).message); } finally { setBusy(null); }
  }
  return <main className="workspace-shell max-w-3xl"><header className="workspace-heading"><div><h1>Privacy and support requests</h1><p>Operator access requires an administrator session verified with MFA.</p></div></header>
    <p>Handle each request securely and respond through an authorized channel before marking it resolved. No email is sent by these controls. The oldest 100 open requests are shown.</p>
    {!token && <p className="mt-4">Sign in to continue.</p>}{error && <p role="alert" className="mt-4">{error}</p>}
    {token && !requests && !error && <p role="status">Loading…</p>}{requests?.length===0 && <p className="mt-4">No open requests.</p>}
    {requests?.map(request => <article key={request.id} className="workspace-panel break-words"><h2>{request.category}</h2><p>{request.email}</p><p className="text-sm">{new Date(request.createdAt).toLocaleString()} · {request.id}</p><p className="my-4 whitespace-pre-wrap">{request.message}</p><button className="button-primary" disabled={!!busy} onClick={() => resolve(request.id)}>{busy===request.id ? 'Saving…' : 'Mark resolved'}</button></article>)}
  </main>;
}
