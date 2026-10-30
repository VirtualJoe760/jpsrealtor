// src/app/api/skill/reso-cert/[[...path]]/route.ts
//
// RESO Web API over the FROZEN certification data set: listings inserted
// before CERT_CUTOFF (src/lib/reso/web-api/scope.ts). This is the URL RESO
// certifies against — a live feed adds listings with new City values while
// reso-cert replicates for 1-2 h, and DD 2.1 strict fails the run on them.
// Same handler, auth and rate tier as /api/skill/reso.

import { resoGet } from "@/lib/reso/web-api/handler";
import { CERT_SCOPE } from "@/lib/reso/web-api/scope";

export const dynamic = "force-dynamic";
// The frozen Lookup catalog is one $group scan of the set (~20-30 s cold),
// then cached 1 h per instance.
export const maxDuration = 60;

export const GET = resoGet(CERT_SCOPE);
