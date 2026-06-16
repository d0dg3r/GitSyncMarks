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
FOLDER_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$", re.IGNORECASE)


def validate_role(role):
    if role not in SYNC_ROLES:
        raise ValueError(f"Invalid --folder {role!r}: must be one of {', '.join(SYNC_ROLES)}")


def validate_subfolder(name):
    if not name:
        return
    if name in (".", "..") or "/" in name or "\\" in name or ".." in name:
        raise ValueError(f"Invalid --path {name!r}: must be a single folder name without separators or '..'")
    if not FOLDER_NAME_RE.match(name):
        raise ValueError(f"Invalid --path {name!r}: use letters, numbers, and hyphens only")


def validate_base_path(base_path):
    if base_path is None or not str(base_path).strip():
        base_path = "bookmarks"
    if os.path.isabs(base_path):
        raise ValueError(f"Invalid --base-path {base_path!r}: must be a relative repo path")
    base = base_path.replace("\\", "/").strip().rstrip("/")
    if not base:
        raise ValueError("Invalid --base-path: must not be empty")
    for part in base.split("/"):
        if part in (".", ".."):
            raise ValueError(f"Invalid --base-path {base_path!r}: path traversal not allowed")
    return base


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
    base = validate_base_path(base_path)
    role = role or "toolbar"
    validate_role(role)
    validate_subfolder(subfolder)
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

    try:
        file_path = add_bookmark(
            base_path=args.base_path,
            role=args.folder,
            subfolder=args.path,
            url=args.url,
            title=args.title,
        )
    except ValueError as err:
        parser.error(str(err))
    print(f"Created: {file_path}")


if __name__ == "__main__":
    main()
