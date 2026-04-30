"use client";

// Banner shown when an admin is viewing an agent's dashboard via their subdomain.

import { Eye, ArrowLeft } from "lucide-react";

interface ImpersonationBannerProps {
  agentName: string;
  agentEmail: string;
  subdomain: string;
}

export default function ImpersonationBanner({ agentName, agentEmail, subdomain }: ImpersonationBannerProps) {
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye size={16} />
        <span>
          Admin view — viewing <strong>{agentName}</strong>&apos;s dashboard ({agentEmail})
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs opacity-75">{subdomain}.chatrealty.io</span>
        <a
          href="/admin/users"
          className="flex items-center gap-1 px-3 py-1 bg-amber-700 text-white rounded-md text-xs font-medium hover:bg-amber-800 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to Admin
        </a>
      </div>
    </div>
  );
}
