# scripts/find_duplicates.py
# Python 3.10+
#
# What it does:
# - Load URLs from sitemap (default https://jpsrealtor.com/sitemap.xml)
#   OR fallback to local-logs/linkinator-report.json if sitemap fails.
# - Fetch pages concurrently
# - Parse <title> and <meta name="description">
# - Find duplicates and write:
#   local-logs/duplicate-titles.json
#   local-logs/duplicate-meta-descriptions.json
#   local-logs/duplicates-summary.csv
#
# Usage examples:
#   python scripts/find_duplicates.py
#   SITEMAP_URL=http://localhost:3000/sitemap.xml python scripts/find_duplicates.py
#
# Dependencies:
#   pip install aiohttp beautifulsoup4 lxml

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import csv
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import aiohttp
from bs4 import BeautifulSoup

DEFAULT_SITEMAP = os.environ.get("SITEMAP_URL", "https://jpsrealtor.com/sitemap.xml")
OUT_DIR = Path("local-logs")
LINKINATOR_REPORT = OUT_DIR / "linkinator-report.json"

OUT_TITLES = OUT_DIR / "duplicate-titles.json"
OUT_DESCS = OUT_DIR / "duplicate-meta-descriptions.json"
OUT_CSV = OUT_DIR / "duplicates-summary.csv"

CONCURRENCY = int(os.environ.get("DUPLICATE_FETCH_CONCURRENCY", "8"))
TIMEOUT_SECS = int(os.environ.get("DUPLICATE_FETCH_TIMEOUT", "20"))
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JPSRealtor-DupeChecker/1.0; +https://jpsrealtor.com)"
}


def ensure_out_dir() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_text(s: Optional[str]) -> str:
    if not s:
        return ""
    # Collapse whitespace and trim
    return re.sub(r"\s+", " ", s).strip()


async def fetch_text(session: aiohttp.ClientSession, url: str) -> Tuple[int, str]:
    """Fetch a URL and return (status_code, text). Follow redirects."""
    try:
        async with session.get(url, allow_redirects=True, timeout=TIMEOUT_SECS) as resp:
            status = resp.status
            text = await resp.text(errors="ignore")
            return status, text
    except asyncio.TimeoutError:
        return 0, ""
    except aiohttp.ClientError:
        return 0, ""


def parse_meta(html: str) -> Tuple[str, str]:
    """Extract <title> and <meta name='description'> content."""
    if not html:
        return "", ""
    soup = BeautifulSoup(html, "lxml")
    title_el = soup.find("title")
    meta_desc_el = soup.find("meta", attrs={"name": "description"})
    title = normalize_text(title_el.get_text()) if title_el else ""
    desc = normalize_text(meta_desc_el["content"]) if meta_desc_el and meta_desc_el.has_attr("content") else ""
    return title, desc


def extract_urls_from_sitemap_xml(xml: str) -> List[str]:
    """Very simple <loc> extractor covering standard and index sitemaps."""
    # collect all <loc> values
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml, flags=re.IGNORECASE)
    urls = []
    for u in locs:
        u = u.strip()
        if u and "jpsrealtor.com" in u:
            urls.append(u)
    # de-dupe while preserving order
    seen = set()
    uniq = []
    for u in urls:
        if u not in seen:
            uniq.append(u)
            seen.add(u)
    return uniq


async def load_urls_from_sitemap(session: aiohttp.ClientSession, sitemap_url: str) -> List[str]:
    status, xml = await fetch_text(session, sitemap_url)
    if status != 200 or not xml:
        return []
    # If this is a sitemap index, it will contain other sitemap <loc>s;
    # extract all <loc> and filter down to final URLs is fine enough for our use.
    return extract_urls_from_sitemap_xml(xml)


def extract_first_json_block(raw: str) -> Optional[dict]:
    """linkinator-report.json sometimes has logs around JSON. Extract first JSON object."""
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None


def load_urls_from_linkinator_fallback() -> List[str]:
    if not LINKINATOR_REPORT.exists():
        return []
    try:
        raw = LINKINATOR_REPORT.read_text(encoding="utf-8", errors="ignore")
        data = extract_first_json_block(raw)
        if not data:
            return []
        links = data.get("links", [])
        pages = set()
        for l in links:
            parent = l.get("parent")
            url = l.get("url")
            if isinstance(parent, str) and "jpsrealtor" in parent:
                pages.add(parent)
            if isinstance(url, str) and "jpsrealtor" in url:
                pages.add(url)
        return sorted(pages)
    except Exception:
        return []


async def gather_pages(urls: List[str]) -> Dict[str, Tuple[int, str]]:
    """Fetch all URLs concurrently and return mapping url -> (status, html)."""
    results: Dict[str, Tuple[int, str]] = {}
    sem = asyncio.Semaphore(CONCURRENCY)
    timeout = aiohttp.ClientTimeout(total=TIMEOUT_SECS + 5)

    async with aiohttp.ClientSession(headers=HEADERS, timeout=timeout) as session:
        async def _one(u: str):
            async with sem:
                status, html = await fetch_text(session, u)
                results[u] = (status, html)

        tasks = [asyncio.create_task(_one(u)) for u in urls]
        await asyncio.gather(*tasks)

    return results


def group_duplicates(items: Dict[str, Tuple[str, str]]) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    """Return (dupe_titles, dupe_descs), each mapping value -> list[urls]."""
    title_map: Dict[str, List[str]] = {}
    desc_map: Dict[str, List[str]] = {}

    for url, (title, desc) in items.items():
        if title:
            title_map.setdefault(title, []).append(url)
        if desc:
            desc_map.setdefault(desc, []).append(url)

    dupe_titles = {k: sorted(v) for k, v in title_map.items() if len(v) > 1}
    dupe_descs = {k: sorted(v) for k, v in desc_map.items() if len(v) > 1}
    return dupe_titles, dupe_descs


def write_outputs(dupe_titles: Dict[str, List[str]], dupe_descs: Dict[str, List[str]]) -> None:
    OUT_TITLES.write_text(json.dumps(dupe_titles, indent=2), encoding="utf-8")
    OUT_DESCS.write_text(json.dumps(dupe_descs, indent=2), encoding="utf-8")

    # CSV summary
    rows: List[List[str]] = [["Type", "Value", "Count", "URLs"]]
    for val, urls in dupe_titles.items():
        rows.append(["Title", val, str(len(urls)), " | ".join(urls)])
    for val, urls in dupe_descs.items():
        rows.append(["Meta Description", val, str(len(urls)), " | ".join(urls)])

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for r in rows:
            # quote handling to keep Excel happy
            writer.writerow(r)


async def main() -> None:
    ensure_out_dir()

    # 1) Try sitemap
    urls: List[str] = []
    async with aiohttp.ClientSession(headers=HEADERS) as session:
        urls = await load_urls_from_sitemap(session, DEFAULT_SITEMAP)

    # 2) Fallback to linkinator
    if not urls:
        print("⚠️  Sitemap unavailable or empty; falling back to local-logs/linkinator-report.json")
        urls = load_urls_from_linkinator_fallback()

    if not urls:
        print("❌ No URLs to check. Provide a sitemap or a linkinator-report.json in local-logs.")
        sys.exit(1)

    print(f"🔎 Checking {len(urls)} pages for duplicate titles & meta descriptions…")

    # 3) Fetch pages
    fetched = await gather_pages(urls)

    # 4) Parse and keep only pages that responded
    meta_by_url: Dict[str, Tuple[str, str]] = {}
    ok_count = 0
    for url, (status, html) in fetched.items():
        if status == 0:
            continue
        title, desc = parse_meta(html)
        meta_by_url[url] = (title, desc)
        ok_count += 1

    print(f"✅ Parsed metadata from {ok_count} pages (skipped {len(urls) - ok_count} failed fetches).")

    # 5) Group duplicates
    dupe_titles, dupe_descs = group_duplicates(meta_by_url)

    # 6) Write outputs
    write_outputs(dupe_titles, dupe_descs)

    title_groups = len(dupe_titles)
    desc_groups = len(dupe_descs)
    title_pages = sum(len(v) for v in dupe_titles.values())
    desc_pages = sum(len(v) for v in dupe_descs.values())

    print(f"""📄 Wrote:
- {OUT_TITLES}
- {OUT_DESCS}
- {OUT_CSV}

Summary:
• Duplicate title groups: {title_groups} (total pages involved: {title_pages})
• Duplicate meta description groups: {desc_groups} (total pages involved: {desc_pages})
""")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Interrupted.")
