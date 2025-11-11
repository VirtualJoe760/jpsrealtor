# -*- coding: utf-8 -*-
"""
Scrape subdivision pages from pscondos, pshomes, and realestateranchomirage.

Outputs separate JSON files to local-logs/:
  - pscondos_subdivisions.json
  - pshomes_subdivisions.json
  - ranchomirage_subdivisions.json

Usage:
  python src/scripts/mls/scrape_subdivisions.py            # scrape all
  python src/scripts/mls/scrape_subdivisions.py --only pshomes
  python src/scripts/mls/scrape_subdivisions.py --only pscondos --limit 50
"""

import re
import time
import json
import html
import random
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, unquote

import requests
from bs4 import BeautifulSoup, Tag
from xml.etree import ElementTree as ET

# ---------- Pathing (two dirs up -> local-logs) ----------
SCRIPT_PATH = Path(__file__).resolve()
ROOT = SCRIPT_PATH.parents[2]  # project root per your note
LOCAL_LOGS = ROOT / "local-logs"
LOCAL_LOGS.mkdir(parents=True, exist_ok=True)

# ---------- Config ----------
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; JPSRealtorBot/1.0; +https://jpsrealtor.com/bot)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}
TIMEOUT = 20
SLEEP_BETWEEN_REQUESTS = 0.6  # seconds
MAX_RETRIES = 3
RETRY_STATUS = {429, 500, 502, 503, 504}

# ---------- HTTP fetch with retries ----------
def fetch(url: str) -> Optional[str]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
            status = resp.status_code
            if status == 200:
                return resp.text
            if status in RETRY_STATUS:
                wait = (0.8 * (2 ** (attempt - 1))) + random.uniform(0, 0.4)
                print(f"⚠️  HTTP {status}: {url} (retry {attempt}/{MAX_RETRIES} in {wait:.1f}s)")
                time.sleep(wait)
                continue
            print(f"⚠️  HTTP {status}: {url}")
            return None
        except requests.RequestException as e:
            wait = (0.8 * (2 ** (attempt - 1))) + random.uniform(0, 0.4)
            print(f"⚠️  Request failed for {url}: {e} (retry {attempt}/{MAX_RETRIES} in {wait:.1f}s)")
            time.sleep(wait)
    return None

# ---------- Sitemap helpers ----------
def parse_xml_sitemap(xml_text: str) -> List[str]:
    urls: List[str] = []
    try:
        root = ET.fromstring(xml_text)
        ns = {}
        if root.tag.startswith("{"):
            ns_uri = root.tag[root.tag.find("{")+1:root.tag.find("}")]
            ns = {"ns": ns_uri}
            loc_tags = root.findall(".//ns:loc", ns)
        else:
            loc_tags = root.findall(".//loc")
        for lt in loc_tags:
            if lt.text:
                urls.append(lt.text.strip())
    except Exception as e:
        print(f"⚠️  Failed to parse XML sitemap: {e}")
    return urls

# ---------- Text + parsing utils ----------
def clean_text(s: str) -> str:
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def slug_from_url(url: str) -> str:
    path = urlparse(url).path.rstrip("/")
    parts = [p for p in path.split("/") if p]
    return parts[-1].lower().strip() if parts else ""

def city_from_url(url: str) -> Optional[str]:
    # pshomes: /listings/<city>/neighborhood/<slug>/
    # pscondos: /<city>/<slug>/
    # ranchomirage: /<city>/<slug>/
    path = urlparse(url).path.rstrip("/")
    parts = [p for p in path.split("/") if p]
    if not parts:
        return None
    if len(parts) >= 4 and parts[0] == "listings" and parts[2] == "neighborhood":
        return parts[1].replace("-", " ").title()
    if len(parts) >= 2:
        return parts[-2].replace("-", " ").title()
    return None

def name_from_url_or_h1(url: str, soup: BeautifulSoup) -> str:
    for sel in ["h1", "h2"]:
        node = soup.select_one(sel)
        if node and clean_text(node.get_text()):
            return clean_text(node.get_text())
    slug = slug_from_url(url)
    return unquote(slug).replace("-", " ").title() if slug else url

# ---- Boilerplate filtering helpers ----
_BOILERPLATE_PATTERNS = [
    r"\bcontact\s+us\b",
    r"\bname\s*\*",
    r"\bemail\s*\*",
    r"\bphone\s*\*",
    r"\bsubscribe\b",
    r"\bcaptcha\b",
    r"\bprivacy\b",
    r"\bterms\b",
    r"^for sale\b",
]
_boilerplate_re = re.compile("|".join(_BOILERPLATE_PATTERNS), re.I)

def _is_inside_unwanted_container(node: Tag) -> bool:
    """Avoid text inside forms/nav/header/footer/aside and common form wrappers."""
    unwanted = {"form", "nav", "header", "footer", "aside"}
    cur = node
    while cur and isinstance(cur, Tag):
        if cur.name in unwanted:
            return True
        cls = " ".join(cur.get("class", []))
        if any(key in cls.lower() for key in ["gform_wrapper", "wpcf7", "frm_forms", "nf-form", "elementor-form"]):
            return True
        cur = cur.parent
    return False

def _is_inside_any_selector(node: Tag, selectors: List[str]) -> bool:
    classes = [s.lstrip(".").lower() for s in selectors]
    cur = node
    while cur and isinstance(cur, Tag):
        cur_classes = [c.lower() for c in cur.get("class", [])]
        if any(c in cur_classes for c in classes):
            return True
        cur = cur.parent
    return False

def _filter_paragraphs(paragraphs: List[Tag], min_len: int = 160, exclude_inside: Optional[List[str]] = None) -> List[str]:
    out: List[str] = []
    for p in paragraphs:
        if _is_inside_unwanted_container(p):
            continue
        if exclude_inside and _is_inside_any_selector(p, exclude_inside):
            continue
        txt = clean_text(p.get_text(" ", strip=True))
        if not txt:
            continue
        if _boilerplate_re.search(txt):
            continue
        if len(txt) < min_len and not txt.endswith("."):
            continue
        out.append(txt)
    return out

# ---- Site-specific bios ----
def extract_main_bio_pscondos(soup: BeautifulSoup) -> str:
    """
    pscondos: prefer a Bootstrap-ish .card.border-0 .card-body, then fallback.
    """
    candidates_css = [
        ".card.border-0 .card-body p",
        ".entry-content p",
        "article .entry-content p",
        "article p",
        ".content-area p",
        "#content p",
        "main p",
    ]
    for sel in candidates_css:
        ps = soup.select(sel)
        texts = _filter_paragraphs(ps, min_len=160)
        if texts:
            return " ".join(texts[:3])
    ps = soup.select("p")
    texts = _filter_paragraphs(ps, min_len=160)
    return " ".join(texts[:3]) if texts else ""

def extract_main_bio_pshomes(soup: BeautifulSoup) -> str:
    """
    pshomes: target the descriptive block inside `.well.property-well`.
    Stop before the 'For sale...' h3.
    """
    wells = soup.select(".well.property-well")
    for well in wells:
        parts: List[Tag] = []
        for child in well.children:
            if isinstance(child, Tag) and child.name in ("h1", "h2", "h3"):
                heading = clean_text(child.get_text())
                if heading.lower().startswith("for sale"):
                    break
            if isinstance(child, Tag) and child.name == "p":
                parts.append(child)
        texts = _filter_paragraphs(parts, min_len=140)
        if texts:
            return " ".join(texts[:3])

    candidates = [
        "main p",
        "article p",
        ".entry-content p",
        ".site-main p",
        ".content p",
    ]
    for sel in candidates:
        ps = soup.select(sel)
        texts = _filter_paragraphs(ps, min_len=160)
        if texts:
            return " ".join(texts[:3])

    ps = soup.select("p")
    texts = _filter_paragraphs(ps, min_len=160)
    return " ".join(texts[:3]) if texts else ""

def extract_main_bio_ranchomirage(soup: BeautifulSoup) -> str:
    """
    realestateranchomirage: take paragraphs from section.mce-content,
    skip promo widgets like .three-widgets; prefer content after the H1.
    """
    container = soup.select_one("section.mce-content") or soup.select_one(".mce-content")
    if container:
        start_collecting = False
        ordered_ps: List[Tag] = []
        for node in container.descendants:
            if not isinstance(node, Tag):
                continue
            if node.name == "h1":
                start_collecting = True
                continue
            if node.name == "p":
                if _is_inside_any_selector(node, [".three-widgets", ".search-widgets", ".cta", ".cards", ".grid"]):
                    continue
                if start_collecting:
                    ordered_ps.append(node)
        texts = _filter_paragraphs(ordered_ps, min_len=140, exclude_inside=[".three-widgets", ".cta", ".grid"])
        if not texts:
            ps = [p for p in container.select("p") if not _is_inside_any_selector(p, [".three-widgets", ".cta", ".grid"])]
            texts = _filter_paragraphs(ps, min_len=140, exclude_inside=[".three-widgets", ".cta", ".grid"])
        if texts:
            return " ".join(texts[:3])

    ps = soup.select("p")
    texts = _filter_paragraphs(ps, min_len=160)
    return " ".join(texts[:3]) if texts else ""

# ---------- Structured field parsing ----------
def to_int(s: str) -> Optional[int]:
    try:
        return int(s.replace(",", "").strip())
    except Exception:
        return None

def to_float(s: str) -> Optional[float]:
    try:
        return float(s.replace(",", "").strip())
    except Exception:
        return None

def parse_structured_fields(text: str) -> Dict[str, Any]:
    """
    Best-effort extraction of HOA fee, bedrooms, sqft, home count, tenure.
    Conservative to avoid false positives.
    """
    out: Dict[str, Any] = {}

    hoa = {}
    m_hoa_sent = re.search(r"(HOA[^.]{0,160})", text, re.IGNORECASE)
    if m_hoa_sent:
        seg = m_hoa_sent.group(1)
        m_amt = re.search(r"\$ ?([\d,]+(?:\.\d+)?)", seg)
        if m_amt:
            hoa["amount"] = to_float(m_amt.group(1))
        m_freq = re.search(r"\b(per |/)?(month|monthly|quarter|quarterly|year|yearly|annually)\b", seg, re.I)
        if m_freq:
            hoa["frequency"] = m_freq.group(2).lower()
    if hoa:
        out["hoa_fee"] = hoa

    m_beds = re.search(r"(\d+)\s*[–-]\s*(\d+)\s*bed(room)?s", text, re.I)
    if m_beds:
        out.setdefault("builds", {})["bedrooms_min"] = to_int(m_beds.group(1))
        out["builds"]["bedrooms_max"] = to_int(m_beds.group(2))
    else:
        m_beds_single = re.search(r"(\d+)\s*bed(room)?s", text, re.I)
        if m_beds_single:
            out.setdefault("builds", {})["bedrooms_min"] = to_int(m_beds_single.group(1))

    m_sqft = re.search(r"(\d{3,4}(?:,\d{3})?)\s*[–-]\s*(\d{3,4}(?:,\d{3})?)\s*(sq\.?\s*ft|square\s*feet)", text, re.I)
    if m_sqft:
        out.setdefault("builds", {})["sqft_min"] = to_int(m_sqft.group(1))
        out["builds"]["sqft_max"] = to_int(m_sqft.group(2))
    else:
        m_sqft_single = re.search(r"(\d{3,4}(?:,\d{3})?)\s*(sq\.?\s*ft|square\s*feet)", text, re.I)
        if m_sqft_single:
            out.setdefault("builds", {})["sqft_min"] = to_int(m_sqft_single.group(1))

    m_homes = re.search(r"(?:consists of|includes|total of)\s+(\d{1,5})\s+(?:homes?|units?)", text, re.I)
    if m_homes:
        out.setdefault("builds", {})["home_count"] = to_int(m_homes.group(1))

    m_tenure = re.search(r"\b(fee simple|fee land|lease(?:hold)?(?: land)?)\b", text, re.I)
    if m_tenure:
        term = m_tenure.group(1).lower()
        out.setdefault("flags", {})
        out["flags"]["tenure"] = "Fee Simple" if "fee" in term else "Leasehold"

    m_lease_exp = re.search(r"lease (?:expires|expiration)[^.\d]*(\d{4})", text, re.I)
    if m_lease_exp:
        out.setdefault("notes", {})["lease_expiration_year"] = to_int(m_lease_exp.group(1))

    return out

def record_template(url: str, name: str, city: Optional[str], bio_raw: str, source: str) -> Dict[str, Any]:
    d: Dict[str, Any] = {
        "name": name,
        "slug": slug_from_url(url),
        "city": city,
        "bio_raw": bio_raw,
        "source_url": url,
        "source_site": source,
    }
    d.update(parse_structured_fields(bio_raw))
    return d

# ---------- Site-specific scraping ----------
def scrape_pscondos(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    site = "pscondos"
    site_map = "https://www.pscondos.com/condo-sitemap.xml"
    print(f"🔎 Fetching sitemap: {site_map}")
    xml = fetch(site_map)
    if not xml:
        return []
    urls = parse_xml_sitemap(xml)

    # 🚫 Ignore malformed URLs that contain dot-segments like "/./"
    urls = [u for u in urls if "/./" not in u]

    print(f"  • {len(urls)} subdivision URLs found after filtering")
    if limit:
        urls = urls[:limit]

    out: List[Dict[str, Any]] = []
    for i, url in enumerate(urls, 1):
        html_text = fetch(url)
        if not html_text:
            continue
        soup = BeautifulSoup(html_text, "html.parser")
        name = name_from_url_or_h1(url, soup)
        city = city_from_url(url)
        bio = extract_main_bio_pscondos(soup)
        out.append(record_template(url, name, city, bio, site))
        if i % 25 == 0:
            print(f"  • scraped {i}/{len(urls)}")
        time.sleep(SLEEP_BETWEEN_REQUESTS)
    return out

def scrape_pshomes(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    site = "pshomes"
    site_map = "https://www.pshomes.com/neighborhood-sitemap.xml"
    print(f"🔎 Fetching sitemap: {site_map}")
    xml = fetch(site_map)
    if not xml:
        return []
    urls = parse_xml_sitemap(xml)

    # 🚫 Ignore any "/./" URLs here too, just in case
    urls = [u for u in urls if "/./" not in u]

    print(f"  • {len(urls)} subdivision URLs found")
    if limit:
        urls = urls[:limit]

    out: List[Dict[str, Any]] = []
    for i, url in enumerate(urls, 1):
        html_text = fetch(url)
        if not html_text:
            continue
        soup = BeautifulSoup(html_text, "html.parser")
        name = name_from_url_or_h1(url, soup)
        city = city_from_url(url)
        bio = extract_main_bio_pshomes(soup)
        out.append(record_template(url, name, city, bio, site))
        if i % 25 == 0:
            print(f"  • scraped {i}/{len(urls)}")
        time.sleep(SLEEP_BETWEEN_REQUESTS)
    return out

def scrape_ranchomirage(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    site = "ranchomirage"
    site_map = "https://www.realestateranchomirage.com/sitemap.xml"
    print(f"🔎 Fetching sitemap: {site_map}")
    xml = fetch(site_map)
    if not xml:
        return []
    urls = parse_xml_sitemap(xml)

    # Only keep URLs that look like /<city>/<subdivision>/ and ignore "/./" if present
    urls = [u for u in urls if "/./" not in u and re.search(r"https://www\.realestateranchomirage\.com/[^/]+/[^/]+/?$", u)]

    print(f"  • {len(urls)} subdivision URLs found after filtering")
    if limit:
        urls = urls[:limit]

    out: List[Dict[str, Any]] = []
    for i, url in enumerate(urls, 1):
        html_text = fetch(url)
        if not html_text:
            continue
        soup = BeautifulSoup(html_text, "html.parser")
        name = name_from_url_or_h1(url, soup)
        city = city_from_url(url)
        bio = extract_main_bio_ranchomirage(soup)
        out.append(record_template(url, name, city, bio, site))
        if i % 25 == 0:
            print(f"  • scraped {i}/{len(urls)}")
        time.sleep(SLEEP_BETWEEN_REQUESTS)
    return out

# ---------- Save helpers ----------
def save_json(filename: str, rows: List[Dict[str, Any]]):
    path = LOCAL_LOGS / filename
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Wrote {len(rows)} records → {path}")

# ---------- Main ----------
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Scrape subdivision data into separate JSON files.")
    ap.add_argument("--only", choices=["pscondos", "pshomes", "ranchomirage"], help="Scrape just one source")
    ap.add_argument("--limit", type=int, help="Limit number of pages per source (for testing)")
    args = ap.parse_args()

    print(f"🔧 local-logs resolved to: {LOCAL_LOGS}")
    sources = [args.only] if args.only else ["pscondos", "pshomes", "ranchomirage"]

    if "pscondos" in sources:
        rows = scrape_pscondos(limit=args.limit)
        save_json("pscondos_subdivisions.json", rows)

    if "pshomes" in sources:
        rows = scrape_pshomes(limit=args.limit)
        save_json("pshomes_subdivisions.json", rows)

    if "ranchomirage" in sources:
        rows = scrape_ranchomirage(limit=args.limit)
        save_json("ranchomirage_subdivisions.json", rows)

    print("🎯 Done.")
