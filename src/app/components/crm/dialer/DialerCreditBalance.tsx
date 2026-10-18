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
  return <details className={`mx-3 mb-3 border-b py-2 text-sm sm:mx-6 lg:mx-8 ${isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-slate-200'}`}>
    <summary className="min-h-11 cursor-pointer py-3">{failed ? 'Credits unavailable' : data ? <><strong>{data.availableCredits.toLocaleString(undefined, { maximumFractionDigits: 3 })} {data.sandbox ? 'test ' : ''}credits available</strong><span className="ml-2 text-xs opacity-70">· {data.reservedCredits.toLocaleString()} reserved</span></> : 'Loading credits…'}</summary>
    <div className="pb-3">{failed && <button onClick={() => setRetry(value => value + 1)} className="min-h-11 underline">Retry credits</button>}{data && <p className="text-xs">Stripe: {data.stripe.mode}{!data.stripe.webhookConfigured && ' · Webhook setup required'}{data.sandbox && ' · Test credits cannot fund real calls'}</p>}<p className="my-2 text-xs opacity-70">Calls remain simulated. Live usage billing and auto top-up await pilot verification.</p><Link href="/agent/subscription" target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 py-3 font-semibold underline">Manage credits ↗</Link></div>
  </details>;
}
