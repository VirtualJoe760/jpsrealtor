'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DialerCreditBalance({ isLight }: { isLight: boolean }) {
  const [data, setData] = useState<{ availableCredits: number; reservedCredits: number; sandbox: boolean; stripe: { mode: string; webhookConfigured: boolean } }>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch('/api/crm/dialer/billing', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setData).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [retry]);
  return <div className={`mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm sm:mx-6 lg:mx-8 ${isLight ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-slate-900 text-slate-200'}`}>
    <div aria-live="polite">{failed ? <button onClick={() => setRetry(value => value + 1)}>Credits unavailable · Retry</button> : data ? <><strong>{data.availableCredits.toLocaleString(undefined, { maximumFractionDigits: 3 })} {data.sandbox ? 'test ' : ''}credits available</strong><span className="ml-2">· {data.reservedCredits.toLocaleString()} reserved</span><p className="mt-1 text-xs">Stripe: {data.stripe.mode}{!data.stripe.webhookConfigured && ' · Webhook setup required'}{data.sandbox && ' · Test credits cannot fund real calls'}</p></> : 'Loading credits…'}<p className="mt-1 text-xs opacity-70">Calls remain simulated. Live usage billing and auto top-up await pilot verification.</p></div>
    <Link href="/agent/subscription" target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 font-semibold">Manage credits ↗</Link>
  </div>;
}
