# Script to Check and Fix Broken Links and Detect Orphan Pages in a Website
# This script uses requests and BeautifulSoup to crawl your website, identify broken links,
# detect orphan pages, and generate a report. It now dynamically fetches pages from a sitemap.

import requests
from bs4 import BeautifulSoup
import csv

# Sitemap URL (Replace with your Next.js sitemap URL)
SITEMAP_URL = 'https://jpsrealtor.com/sitemap.xml'

# User-Agent header to reduce false blocks
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

# Function to fetch URLs from the sitemap
def fetch_sitemap_urls():
    urls = []
    try:
        response = requests.get(SITEMAP_URL, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(response.text, 'xml')
        for loc in soup.find_all('loc'):
            urls.append(loc.text)
    except requests.RequestException as e:
        print(f"Failed to fetch sitemap: {e}")
    return urls

# Function to check a single URL
def check_url(url):
    if 'linkedin.com' in url or 'facebook.com' in url:
        return 'Skipped (Social Media)'
    try:
        response = requests.get(url, headers=HEADERS, timeout=5)
        if response.status_code == 200:
            return 'OK'
        else:
            return f'Error {response.status_code}'
    except requests.RequestException as e:
        return 'Broken'

# Function to crawl and check links within a page
def check_links_in_page(url, found_links):
    broken_links = []
    try:
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, 'html.parser')
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('http'):
                found_links.add(href)
                status = check_url(href)
                if status not in ['OK', 'Skipped (Social Media)']:
                    broken_links.append((href, status))
    except requests.RequestException as e:
        print(f"Failed to fetch {url}: {e}")
    return broken_links

# Main function
def main():
    urls_to_check = fetch_sitemap_urls()
    if not urls_to_check:
        print("No URLs found in sitemap. Exiting.")
        return
    
    found_links = set()
    broken_links_report = []

    for url in urls_to_check:
        print(f"Checking {url}")
        broken_links = check_links_in_page(url, found_links)
        if broken_links:
            for link, status in broken_links:
                print(f"Broken link found: {link} (Status: {status})")
                broken_links_report.append([url, link, status])
    
    # Detect orphan pages (pages in sitemap but not linked anywhere internally)
    orphan_pages = [url for url in urls_to_check if url not in found_links]
    
    # Write broken links report to CSV
    with open('broken_links_report.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Page URL', 'Broken Link', 'Status'])
        writer.writerows(broken_links_report)
    print("Broken Links Report saved as broken_links_report.csv")
    
    # Write orphan pages report to CSV
    with open('orphan_pages_report.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Orphan Page'])
        for orphan in orphan_pages:
            writer.writerow([orphan])
    print("Orphan Pages Report saved as orphan_pages_report.csv")

if __name__ == '__main__':
    main()
