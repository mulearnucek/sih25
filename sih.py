#!/usr/bin/env python3
"""
Scrape Smart India Hackathon Problem Statements from a page containing the
#dataTablePS table and associated modal dialogs.

Extracted CSV Columns (in order):
    PS ID, Title, Organisation, Category, Description, Department, Theme

Supports:
  - Fetching directly from a live URL (if the HTML already contains rows+modals)
  - Reading from a local HTML file (if you saved the page)
  - Writing clean CSV output
  - Graceful handling of missing fields

Usage Examples:
  python scrape_sih_ps.py --url https://sih.gov.in/sih2025PS -o ps_data.csv
  python scrape_sih_ps.py --file sih2025_home.html -o ps_data.csv

Dependencies:
  pip install requests beautifulsoup4 lxml

Notes:
  If the production page loads rows dynamically via AJAX (DataTables), the
  initial HTML may not include the rows. In that case you may need Selenium or
  manually fetch the API endpoint the table uses. The provided HTML snippet
  suggests the modals are already embedded statically.
"""

import argparse
import csv
import os
import re
import sys
import html
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup, Tag

def fetch_html(url: str, timeout: int = 30) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; SIH-Scraper/1.0; +https://example.com)"
    }
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.text

def read_local_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

# Mapping from modal's TH labels to our desired CSV keys
FIELD_MAP = {
    "Problem Statement ID": "PS ID",
    "Problem Statement Title": "Title",
    "Organization": "Organisation",
    "Organisation": "Organisation",
    "Category": "Category",
    "Description": "Description",
    "Department": "Department",
    "Theme": "Theme"
}

CSV_COLUMNS = ["PS ID", "Title", "Organisation", "Category", "Description", "Department", "Theme"]

def clean_text(text: str) -> str:
    if text is None:
        return ""
    # Unescape HTML entities and normalize whitespace
    text = html.unescape(text)
    # Replace <br> already converted to '\n' by get_text with spaces if double newlines accumulate
    text = re.sub(r'\r', '', text)
    # Collapse excessive blank lines
    text = re.sub(r'\n\s*\n+', '\n\n', text.strip())
    return text.strip()

def extract_modal_data(modal: Tag) -> Dict[str, str]:
    """
    Given a modal <div>, extract key/value rows from its internal table.
    """
    data = {}
    if modal is None:
        return data
    table = modal.find("table")
    if not table:
        return data
    for tr in table.find_all("tr"):
        th = tr.find("th")
        td = tr.find("td")
        if not th or not td:
            continue
        label = clean_text(th.get_text(" ", strip=True))
        value = clean_text(td.get_text("\n", strip=True))
        # Map to our unified keys
        if label in FIELD_MAP:
            mapped = FIELD_MAP[label]
            data[mapped] = value
    return data

def extract_rows(soup: BeautifulSoup) -> List[Dict[str, str]]:
    results = []
    table = soup.select_one("#dataTablePS")
    if not table:
        print("Could not find #dataTablePS table.", file=sys.stderr)
        return results

    for tr in table.select("tbody > tr"):
        # Basic fallback extraction from visible columns in the row
        tds = tr.find_all("td")
        if len(tds) < 1:
            continue

        # Title anchor with modal reference
        title_anchor = tr.find("a", attrs={"data-toggle": "modal"})
        modal_id = None
        if title_anchor and title_anchor.has_attr("data-target"):
            modal_id = title_anchor["data-target"].strip()
            # data-target might be like "#ViewProblemStatement25001"
            if modal_id.startswith("#"):
                modal_selector = modal_id
            else:
                modal_selector = f"#{modal_id}"
        else:
            modal_selector = None

        modal_data = {}
        if modal_selector:
            modal = soup.select_one(modal_selector)
            modal_data = extract_modal_data(modal)

        # If some fields not found in modal, try to supplement from row
        # Row likely has: Organization, Category, PS Number, Theme
        # Column order (from snippet):
        # 0: S.No.
        # 1: Organization
        # 2: Title (anchor)
        # 3: Category
        # 4: PS Number
        # 5: Submitted Idea(s) Count
        # 6: Theme
        row_org = clean_text(tds[1].get_text(" ", strip=True)) if len(tds) > 1 else ""
        row_title = clean_text(title_anchor.get_text(" ", strip=True)) if title_anchor else ""
        row_category = clean_text(tds[3].get_text(" ", strip=True)) if len(tds) > 3 else ""
        row_theme = clean_text(tds[6].get_text(" ", strip=True)) if len(tds) > 6 else ""

        record = {col: "" for col in CSV_COLUMNS}
        # Merge modal data first
        for k, v in modal_data.items():
            if k in record:
                record[k] = v

        # Fill gaps with row-level fallback
        if not record["Organisation"]:
            record["Organisation"] = row_org
        if not record["Title"]:
            record["Title"] = row_title
        if not record["Category"]:
            record["Category"] = row_category
        if not record["Theme"]:
            record["Theme"] = row_theme

        # In some cases PS ID may appear as part of PS Number column (e.g., "SIH25001")
        # If PS ID missing and we have 'PS Number' in row, attempt extraction
        if not record["PS ID"] and len(tds) > 4:
            ps_number_raw = clean_text(tds[4].get_text(" ", strip=True))
            # Try to extract digits from something like "SIH25001"
            m = re.search(r'(\d{3,})', ps_number_raw)
            if m:
                record["PS ID"] = m.group(1)
            else:
                record["PS ID"] = ps_number_raw

        results.append(record)
    return results

def write_csv(rows: List[Dict[str, str]], path: str):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for r in rows:
            writer.writerow({k: r.get(k, "") for k in CSV_COLUMNS})

def main():
    parser = argparse.ArgumentParser(description="Scrape SIH Problem Statements into CSV.")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--url", help="URL of the SIH page containing #dataTablePS")
    src.add_argument("--file", help="Local HTML file path")
    parser.add_argument("-o", "--output", default="problem_statements.csv", help="Output CSV file path")
    parser.add_argument("--parser", default="lxml", choices=["lxml", "html.parser"], help="BeautifulSoup parser to use (default: lxml)")
    args = parser.parse_args()

    try:
        if args.url:
            html_text = fetch_html(args.url)
        else:
            if not os.path.exists(args.file):
                print(f"File not found: {args.file}", file=sys.stderr)
                sys.exit(1)
            html_text = read_local_file(args.file)

        soup = BeautifulSoup(html_text, args.parser)
        rows = extract_rows(soup)
        if not rows:
            print("No rows extracted. The page may be dynamic (AJAX). Consider using Selenium.", file=sys.stderr)
        write_csv(rows, args.output)
        print(f"Successfully wrote {len(rows)} records to {args.output}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()
