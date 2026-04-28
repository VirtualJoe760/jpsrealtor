// src/lib/services/fub-client.ts
// Follow Up Boss API client for server-side use

export interface FubPhone {
  value: string;
  type: string;
  status: string;
  isPrimary: number;
  normalized?: string;
  isLandline?: boolean;
}

export interface FubEmail {
  value: string;
  type: string;
  status: string;
  isPrimary: number;
}

export interface FubAddress {
  type: string;
  street?: string;
  city?: string;
  state?: string;
  code?: string;
  country?: string;
}

export interface FubPerson {
  id: number;
  created: string;
  updated: string;
  lastActivity: string;
  firstName: string;
  lastName: string;
  name: string;
  stage: string;
  stageId: number;
  type: string;
  source: string;
  sourceId: number;
  price: number | null;
  contacted: number;
  assignedUserId: number;
  assignedTo: string;
  tags: string[];
  emails: FubEmail[];
  phones: FubPhone[];
  addresses: FubAddress[];
  picture: string | null;
  socialData: any;
  claimed: boolean;
  collaborators: Array<{ id: number; name: string; role: string }>;
}

export interface FubPeopleResponse {
  _metadata: {
    collection: string;
    offset: number;
    limit: number;
    total: number;
    next?: string;
    nextLink?: string;
  };
  people: FubPerson[];
}

export class FubClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.FUB_API_KEY || "";
    this.baseUrl = baseUrl || process.env.FUB_BASE_URL || "https://api.followupboss.com/v1";

    if (!this.apiKey) {
      throw new Error("FUB_API_KEY is not configured");
    }
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`;
  }

  async getPeople(params: {
    assignedUserId?: number;
    lastActivityAfter?: string;
    limit?: number;
    offset?: number;
    sort?: string;
    stage?: string;
    source?: string;
    tags?: string;
  } = {}): Promise<FubPeopleResponse> {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.set(key, String(val));
      }
    }

    const url = `${this.baseUrl}/people?${searchParams.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: this.authHeader },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "10", 10);
      throw new Error(`FUB rate limited. Retry after ${retryAfter}s`);
    }

    if (!res.ok) {
      throw new Error(`FUB API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetch all people with automatic pagination.
   */
  async getAllPeople(params: {
    assignedUserId?: number;
    lastActivityAfter?: string;
    sort?: string;
  } = {}): Promise<FubPerson[]> {
    const all: FubPerson[] = [];
    let url: string | null = `${this.baseUrl}/people?${new URLSearchParams({
      limit: "100",
      sort: params.sort || "updated",
      ...(params.assignedUserId ? { assignedUserId: String(params.assignedUserId) } : {}),
      ...(params.lastActivityAfter ? { lastActivityAfter: params.lastActivityAfter } : {}),
    }).toString()}`;

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: this.authHeader },
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "10", 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`FUB API error: ${res.status}`);
      }

      const data: FubPeopleResponse = await res.json();
      all.push(...data.people);

      url = data._metadata.nextLink && data.people.length > 0
        ? data._metadata.nextLink
        : null;

      if (url) {
        await new Promise((r) => setTimeout(r, 100)); // Rate limit buffer
      }
    }

    return all;
  }
}
