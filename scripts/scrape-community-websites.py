#!/usr/bin/env python3
"""
scrape-community-websites.py

Phase 2: Scrapes official community/club websites for "About" descriptions.
Reads the catalog from Phase 1 and fetches About page text from each URL.

Usage:
    python scripts/scrape-community-websites.py
    python scripts/scrape-community-websites.py --limit 10
    python scripts/scrape-community-websites.py --city "Indian Wells"

Input:  local-logs/subdivision-website-catalog.json (from Phase 1)
Output: local-logs/scraped-descriptions.json
"""

import json
import os
import sys
import time
import re
import argparse
from urllib.parse import urljoin, urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install requests beautifulsoup4")
    sys.exit(1)

# Config
SLEEP_BETWEEN_REQUESTS = 0.8
MAX_RETRIES = 3
TIMEOUT = 20
HEADERS = {
    "User-Agent": "JPSRealtorBot/1.0 (community-research; +https://jpsrealtor.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Common about page paths to try
ABOUT_PATHS = [
    "/about",
    "/about-us",
    "/about-us/",
    "/our-story",
    "/the-club",
    "/club",
    "/community",
    "/membership",
    "/lifestyle",
    "/overview",
]

# Boilerplate text patterns to filter out
BOILERPLATE_PATTERNS = [
    r"cookie", r"privacy policy", r"terms of (use|service)",
    r"all rights reserved", r"copyright \d{4}",
    r"sign up for", r"subscribe to", r"newsletter",
    r"contact us", r"get in touch", r"schedule a tour",
    r"captcha", r"recaptcha", r"spam",
    r"powered by", r"website by", r"designed by",
    r"follow us on", r"connect with us",
    r"loading\.\.\.", r"please wait",
]
BOILERPLATE_RE = re.compile("|".join(BOILERPLATE_PATTERNS), re.IGNORECASE)


def fetch_page(url, retry=0):
    """Fetch a URL with retries and rate limiting."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if resp.status_code in (429, 500, 502, 503, 504) and retry < MAX_RETRIES:
            wait = (2 ** retry) * 1.5
            print(f"      ⏳ Got {resp.status_code}, retrying in {wait:.0f}s...")
            time.sleep(wait)
            return fetch_page(url, retry + 1)
        if resp.status_code != 200:
            return None
        return resp.text
    except (requests.RequestException, Exception) as e:
        if retry < MAX_RETRIES:
            time.sleep(2 ** retry)
            return fetch_page(url, retry + 1)
        return None


def extract_text(html, url):
    """Extract meaningful text from HTML, filtering boilerplate."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove script, style, nav, footer, header, form elements
    for tag in soup.find_all(["script", "style", "nav", "footer", "header", "form",
                               "aside", "iframe", "noscript"]):
        tag.decompose()

    # Strategy 1: Look for main content areas
    content_candidates = []

    # Try common content selectors
    for selector in ["main", "article", ".content", ".about", "#about",
                     ".page-content", ".entry-content", ".post-content",
                     ".club-about", ".community-info", ".overview",
                     '[role="main"]', ".mce-content", ".text-block"]:
        found = soup.select(selector)
        for el in found:
            text = el.get_text(separator=" ", strip=True)
            if len(text) > 100:
                content_candidates.append(text)

    # Strategy 2: Fall back to collecting all paragraphs
    if not content_candidates:
        paragraphs = []
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 50 and not BOILERPLATE_RE.search(text):
                paragraphs.append(text)
        if paragraphs:
            content_candidates.append(" ".join(paragraphs))

    if not content_candidates:
        return None

    # Use the longest candidate (most likely the main content)
    best = max(content_candidates, key=len)

    # Clean up
    best = re.sub(r"\s+", " ", best).strip()

    # Filter out boilerplate sentences
    sentences = re.split(r"(?<=[.!?])\s+", best)
    clean_sentences = [s for s in sentences if not BOILERPLATE_RE.search(s)]
    best = " ".join(clean_sentences)

    # Truncate if too long (we only need the about description, not the whole page)
    if len(best) > 3000:
        best = best[:3000] + "..."

    return best if len(best) > 80 else None


def scrape_community(entry):
    """Scrape a single community website for about text."""
    url = entry.get("officialUrl")
    if not url:
        return None

    result = {
        "name": entry["name"],
        "slug": entry["slug"],
        "city": entry["city"],
        "sourceUrl": url,
        "scrapedText": None,
        "scrapedFrom": None,
        "googleDescription": entry.get("googleDescription"),
    }

    # Try the homepage first
    print(f"      Fetching homepage: {url}")
    html = fetch_page(url)
    time.sleep(SLEEP_BETWEEN_REQUESTS)

    if html:
        text = extract_text(html, url)
        if text and len(text) > 150:
            result["scrapedText"] = text
            result["scrapedFrom"] = url
            # Still try about page for potentially better content

    # Try about pages
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    for about_path in ABOUT_PATHS:
        about_url = urljoin(base, about_path)
        if about_url == url:
            continue

        html = fetch_page(about_url)
        time.sleep(SLEEP_BETWEEN_REQUESTS)

        if html:
            text = extract_text(html, about_url)
            if text and len(text) > 150:
                # Prefer about page over homepage if it has more content
                if not result["scrapedText"] or len(text) > len(result["scrapedText"]):
                    result["scrapedText"] = text
                    result["scrapedFrom"] = about_url
                break  # Found good about content, stop trying

    return result


def main():
    parser = argparse.ArgumentParser(description="Scrape community websites for about text")
    parser.add_argument("--limit", type=int, help="Limit number of communities to scrape")
    parser.add_argument("--city", type=str, help="Filter by city name")
    parser.add_argument("--resume", action="store_true", help="Skip already-scraped entries")
    args = parser.parse_args()

    print("🌐 Community Website Scraper")
    print("============================\n")

    # Load catalog from Phase 1
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "local-logs", "subdivision-website-catalog.json")
    if not os.path.exists(catalog_path):
        print(f"❌ Catalog not found at {catalog_path}")
        print("   Run Phase 1 first: node scripts/build-subdivision-catalog.js")
        sys.exit(1)

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    print(f"📋 Loaded {len(catalog)} entries from catalog\n")

    # Filter to entries with websites
    to_scrape = [e for e in catalog if e.get("officialUrl")]
    print(f"🔗 {len(to_scrape)} have official websites to scrape")
    print(f"📝 {len([e for e in catalog if e.get('googleDescription')])} have Google descriptions")
    print(f"❌ {len([e for e in catalog if not e.get('officialUrl') and not e.get('googleDescription')])} have nothing\n")

    if args.city:
        to_scrape = [e for e in to_scrape if e["city"].lower() == args.city.lower()]
        print(f"🔍 Filtered to {len(to_scrape)} in {args.city}\n")

    if args.limit:
        to_scrape = to_scrape[:args.limit]
        print(f"📏 Limited to {args.limit} entries\n")

    # Load existing results if resuming
    output_path = os.path.join(os.path.dirname(__file__), "..", "local-logs", "scraped-descriptions.json")
    results = []
    processed_slugs = set()

    if args.resume and os.path.exists(output_path):
        with open(output_path, "r", encoding="utf-8") as f:
            results = json.load(f)
        processed_slugs = {r["slug"] for r in results}
        print(f"📂 Resuming — {len(results)} already scraped\n")

    # Scrape each community
    scraped = 0
    with_text = 0
    errors = 0

    for i, entry in enumerate(to_scrape):
        if entry["slug"] in processed_slugs:
            continue

        print(f"[{i+1}/{len(to_scrape)}] {entry['city']} / {entry['name']}")

        try:
            result = scrape_community(entry)
            if result:
                results.append(result)
                scraped += 1
                if result.get("scrapedText"):
                    with_text += 1
                    print(f"      ✅ Got {len(result['scrapedText'])} chars from {result['scrapedFrom']}")
                else:
                    print(f"      ⚠️  No usable text found")
        except Exception as e:
            print(f"      💥 Error: {e}")
            errors += 1
            results.append({
                "name": entry["name"],
                "slug": entry["slug"],
                "city": entry["city"],
                "sourceUrl": entry.get("officialUrl"),
                "scrapedText": None,
                "error": str(e),
            })

        # Save progress every 5 items
        if len(results) % 5 == 0:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

    # Final save
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Also build a combined file with Google descriptions for entries without websites
    combined = list(results)
    for entry in catalog:
        if entry["slug"] not in {r["slug"] for r in combined}:
            if entry.get("googleDescription"):
                combined.append({
                    "name": entry["name"],
                    "slug": entry["slug"],
                    "city": entry["city"],
                    "sourceUrl": None,
                    "scrapedText": None,
                    "googleDescription": entry["googleDescription"],
                    "source": "google-places-only",
                })

    combined_path = os.path.join(os.path.dirname(__file__), "..", "local-logs", "all-subdivision-descriptions.json")
    with open(combined_path, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2, ensure_ascii=False)

    # Summary
    print("\n============================")
    print("📊 Summary:")
    print(f"   Scraped: {scraped}")
    print(f"   With usable text: {with_text}")
    print(f"   No text found: {scraped - with_text}")
    print(f"   Errors: {errors}")
    print(f"\n📄 Results saved to: {output_path}")
    print(f"📄 Combined file: {combined_path}")


if __name__ == "__main__":
    main()
