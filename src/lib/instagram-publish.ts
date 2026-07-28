/**
 * Publish an image carousel to an agent's Instagram Business account.
 *
 * Extracted so a CRON can publish without holding a skill token. The existing
 * `POST /api/skill/instagram/carousel` route does the same three Graph steps
 * behind `authenticateSkillRequest`, which is right for an agent-driven call
 * and wrong for a scheduled job — the job has no caller to authenticate.
 *
 * That route is another session's live work, so this deliberately does NOT
 * refactor it. Once that work lands, the route should call `publishCarousel`
 * too and this duplication should go.
 *
 * Graph flow: create one container per image (is_carousel_item), create a
 * parent CAROUSEL container listing them, then media_publish the parent.
 */
import User from "@/models/User";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface CarouselResult {
  mediaId: string;
  permalink?: string;
}

async function graph(path: string, params: Record<string, string>, method: "GET" | "POST") {
  const url = new URL(GRAPH + path);
  let res: Response;
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    res = await fetch(url.toString());
  } else {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || {};
    throw new Error(
      `graph ${method} ${path} failed: ${e.message || res.status}` +
        (e.code ? ` (code ${e.code})` : "")
    );
  }
  return json;
}

/** Resolve the agent's IG business account id and a usable page token. */
export async function resolveIgAccount(agentId: string) {
  const userDoc: any = await User.findById(agentId).select("adAccounts").lean();
  const meta = userDoc?.adAccounts?.meta;
  const token: string | undefined = meta?.pageAccessToken || meta?.accessToken;
  const pageId: string | undefined = meta?.pageId;
  if (!token || !pageId) {
    throw new Error("agent has no connected Meta page (adAccounts.meta.pageId / token)");
  }
  let igUserId: string | undefined = meta?.igUserId;
  if (!igUserId) {
    const page: any = await graph(`/${pageId}`, {
      fields: "instagram_business_account",
      access_token: token,
    }, "GET");
    igUserId = page?.instagram_business_account?.id;
  }
  if (!igUserId) throw new Error("that Facebook page has no linked Instagram business account");
  return { igUserId, token };
}

export async function publishCarousel(opts: {
  igUserId: string;
  token: string;
  imageUrls: string[];
  caption: string;
  /** These are AI-generated images of a real person in a real property. */
  isAiGenerated?: boolean;
}): Promise<CarouselResult> {
  const { igUserId, token, imageUrls, caption } = opts;
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error(`carousel needs 2-10 images, got ${imageUrls.length}`);
  }

  const children: string[] = [];
  for (const image_url of imageUrls) {
    const c = await graph(`/${igUserId}/media`, {
      image_url,
      is_carousel_item: "true",
      access_token: token,
    }, "POST");
    if (!c?.id) throw new Error(`no container id for ${image_url.slice(0, 60)}`);
    children.push(c.id);
  }

  const parentParams: Record<string, string> = {
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
    access_token: token,
  };
  // Honest labelling on marketing that depicts the agent somewhere they may not
  // have physically stood. Costs nothing; see actor-generation.md section 10.
  if (opts.isAiGenerated !== false) parentParams.is_ai_generated = "true";

  const parent = await graph(`/${igUserId}/media`, parentParams, "POST");
  if (!parent?.id) throw new Error("no carousel container id");

  const published = await graph(`/${igUserId}/media_publish`, {
    creation_id: parent.id,
    access_token: token,
  }, "POST");
  if (!published?.id) throw new Error("media_publish returned no id");

  let permalink: string | undefined;
  try {
    const info: any = await graph(`/${published.id}`, {
      fields: "permalink",
      access_token: token,
    }, "GET");
    permalink = info?.permalink;
  } catch {
    // A missing permalink is cosmetic; the post is already live.
  }
  return { mediaId: published.id, permalink };
}
