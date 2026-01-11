'use client';

// src/app/agent/crm/page.tsx
// Redirect from old CRM page to new Contacts page
// The CRM has been split into separate Contacts and Email pages

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentCRMRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Contacts page
    router.replace('/agent/contacts');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Redirecting to Contacts...</p>
    </div>
  );
}
