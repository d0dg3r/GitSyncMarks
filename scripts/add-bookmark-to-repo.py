#!/usr/bin/env python3
"""Add a single bookmark to a GitSyncMarks repository.

Creates the bookmark JSON file and ensures the surrounding structure
(`_index.json`, role `_order.json`, optional subfolder `_order.json`) so the
extension imports the bookmark on the next sync — even in a fresh repository
that was never initialized by the extension.

Filenames and `_order.json` entries match `lib/bookmark-serializer.js`
(`generateFilename`, folder descriptors) so the extension does not have to
rewrite them on the next push.
"""

import argparse
import json
import os
import re
import unicodedata

SYNC_ROLES = ("toolbar", "other")


def slugify(value):
    """Port of slugify() in lib/bookmark-serializer.js."""
    value = value or ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if not 0x0300 <= ord(c) <= 0x036F)
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    value = value[:40]
    return value or "untitled"


def short_hash(value):
    """Port of shortHash() (FNV-1a, 32-bit) in lib/bookmark-serializer.js."""
    value = value or ""
    units = []
    for ch in value:
        cp = ord(ch)
        if cp > 0xFFFF:
            cp -= 0x10000
            units.append(0xD800 + (cp >> 10))
            units.append(0xDC00 + (cp & 0x3FF))
        else:
            units.append(cp)
    h = 0x811C9DC5
    for unit in units:
        h = (h ^ unit) & 0xFFFFFFFF
        h = (h * 0x01000193) & 0xFFFFFFFF
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if h == 0:
        base36 = "0"
    else:
        out = ""
        n = h
        while n > 0:
            out = digits[n % 36] + out
            n //= 36
        base36 = out
    return base36.rjust(4, "0")[:4]


def generate_filename(title, url):
    """Port of generateFilename() in lib/bookmark-serializer.js."""
    return f"{slugify(title)}_{short_hash(url or '')}.json"


def dumps(obj):
    """Match JSON.stringify(obj, null, 2): 2-space indent, no trailing newline."""
    return json.dumps(obj, indent=2, ensure_ascii=False)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(dumps(obj))


def read_order(path):
    if not os.path.isfile(path):
        return []
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def ensure_order_file(path):
    if not os.path.isfile(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        write_json(path, [])


def folder_entry_present(order, dir_name):
    for entry in order:
        if isinstance(entry, dict) and entry.get("dir") == dir_name:
            return True
        if isinstance(entry, str) and entry == dir_name:
            return True
    return False


def add_bookmark(base_path, role, subfolder, url, title):
    base = (base_path or "bookmarks").rstrip("/")
    role = role or "toolbar"
    title = title if title else url

    # Base structure: _index.json + role order files (mirror createMinimalBookmarkStructure)
    index_path = os.path.join(base, "_index.json")
    if not os.path.isfile(index_path):
        os.makedirs(base, exist_ok=True)
        write_json(index_path, {"version": 2})
    for base_role in SYNC_ROLES:
        ensure_order_file(os.path.join(base, base_role, "_order.json"))

    target_dir = os.path.join(base, role)
    if subfolder:
        target_dir = os.path.join(target_dir, subfolder)
        # Register the subfolder in the parent role _order.json as a folder entry
        parent_order_path = os.path.join(base, role, "_order.json")
        parent_order = read_order(parent_order_path)
        if not folder_entry_present(parent_order, subfolder):
            parent_order.append({"dir": subfolder, "title": subfolder})
            write_json(parent_order_path, parent_order)

    os.makedirs(target_dir, exist_ok=True)
    target_order_path = os.path.join(target_dir, "_order.json")
    target_order = read_order(target_order_path)

    filename = generate_filename(title, url)
    file_path = os.path.join(target_dir, filename)
    write_json(file_path, {"title": title, "url": url})

    if filename not in target_order:
        target_order.append(filename)
        write_json(target_order_path, target_order)

    return file_path


def main():
    parser = argparse.ArgumentParser(description="Add a bookmark to a GitSyncMarks repo.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--title", default="")
    parser.add_argument("--base-path", default="bookmarks")
    parser.add_argument("--folder", default="toolbar")
    parser.add_argument("--path", default="")
    args = parser.parse_args()

    file_path = add_bookmark(
        base_path=args.base_path,
        role=args.folder,
        subfolder=args.path,
        url=args.url,
        title=args.title,
    )
    print(f"Created: {file_path}")


if __name__ == "__main__":
    main()
