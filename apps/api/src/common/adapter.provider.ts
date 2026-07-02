// apps/api/src/common/adapter.provider.ts
//
// Thin helper that turns a resolved tenantId into the tenant-scoped DbAdapter
// via the keystone resolver (src/lib/tenant/resolve-connection.ts). Handlers
// NEVER construct an adapter or open a pool — they always come through here,
// which delegates to the reused, LRU-cached resolveAdapter(). (build_plan §3.3)

import { resolveAdapter } from "@/lib/tenant/resolve-connection";
import type { DbAdapter } from "@/lib/db/adapter";

/**
 * Resolve the pooled, LRU-cached DbAdapter for a request's tenant. A
 * non-active / missing tenant makes the underlying resolver throw
 * TenantUnavailableError, which the global CoreExceptionFilter maps to 503.
 */
export async function getAdapterForTenant(tenantId: string): Promise<DbAdapter> {
  return resolveAdapter(tenantId);
}
