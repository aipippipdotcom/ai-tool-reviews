import xml.etree.ElementTree as ET
import requests
import json
import re
import sys

# ===== CONFIG =====
SUPABASE_URL = "https://jcgcyrqsaodwaoryxcwy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2N5cnFzYW9kd2Fvcnl4Y3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIzMjEsImV4cCI6MjA4ODUzODMyMX0.eyL_WB5GR3g-sjj9PVkVN_r18j8p8QVSpjDJVMOUPJY"
AUTHOR_ID = "b6a4dbcd-cd67-47fc-9b7e-7bba9082caa6"
XML_FILE = "WordPress_2026-03-08.xml"

# Category mapping: WordPress slug -> Supabase UUID
CATEGORY_MAP = {
    "ai-video-image":   "06ae3241-c463-472a-aebf-cf770b687c5e",
    "ai-seo-marketing": "65324879-5fc6-4690-821f-ad84fbb03049",
    "ai-design-code":   "da92ee9b-97f9-4f3f-b763-f7c18260f693",
    "ai-writing":       "85e98794-fcf5-4356-a518-eacbfca6adb8",
    "ai-voice-music":   "262eeb6d-5594-4581-9cef-87c7c894b58d",
    "ai-assistance":    "3e958ea5-0f77-4201-820c-96f0cd6de93e",
    "ebook":            "5fca526a-bda6-4d17-b96e-29102692eda0",
}
DEFAULT_CATEGORY = "3e958ea5-0f77-4201-820c-96f0cd6de93e"  # Assistance Tools

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def clean_wp_content(content):
    """Remove WordPress block comments"""
    content = re.sub(r'<!-- /?wp:[^>]+ -->', '', content)
    content = content.strip()
    return content

def parse_and_import():
    tree = ET.parse(XML_FILE)
    root = tree.getroot()

    ns = {
        'content': 'http://purl.org/rss/1.0/modules/content/',
        'wp': 'http://wordpress.org/export/1.2/',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
    }

    items = root.findall('.//item')
    success, skipped, failed = 0, 0, 0

    for item in items:
        # Only published posts
        status = item.find('wp:status', ns)
        post_type = item.find('wp:post_type', ns)
        
        if status is None or status.text != 'publish':
            skipped += 1
            continue
        if post_type is None or post_type.text != 'post':
            skipped += 1
            continue

        title = item.findtext('title', '').strip()
        if not title:
            skipped += 1
            continue

        # Slug
        slug_el = item.find('wp:post_name', ns)
        slug = slug_el.text if slug_el is not None and slug_el.text else re.sub(r'[^a-z0-9-]', '', title.lower().replace(' ', '-'))

        # Content
        content_el = item.find('content:encoded', ns)
        content = clean_wp_content(content_el.text or '') if content_el is not None else ''

        # Excerpt
        excerpt_el = item.find('excerpt:encoded', ns)
        excerpt = excerpt_el.text.strip() if excerpt_el is not None and excerpt_el.text else None

        # Date
        pub_date = item.findtext('pubDate', '')
        created_at = None
        if pub_date:
            try:
                from email.utils import parsedate_to_datetime
                created_at = parsedate_to_datetime(pub_date).isoformat()
            except:
                created_at = None

        # Category
        category_id = DEFAULT_CATEGORY
        for cat in item.findall('category'):
            domain = cat.get('domain', '')
            nicename = cat.get('nicename', '')
            if domain == 'category' and nicename in CATEGORY_MAP:
                category_id = CATEGORY_MAP[nicename]
                break

        # Cover image (first image in content)
        cover_image = None
        img_match = re.search(r'src=["\']([^"\']+\.(png|jpg|jpeg|webp))["\']', content, re.IGNORECASE)
        if img_match:
            cover_image = img_match.group(1)

        post_data = {
            "title": title[:200],
            "slug": slug,
            "excerpt": excerpt[:500] if excerpt else None,
            "content": content,
            "cover_image": cover_image,
            "category_id": category_id,
            "author_id": AUTHOR_ID,
            "published": True,
            "created_at": created_at,
            "updated_at": created_at,
        }

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/posts",
            headers=HEADERS,
            data=json.dumps(post_data)
        )

        if res.status_code in (200, 201):
            success += 1
            print(f"✅ [{success}] {title[:60]}")
        elif res.status_code == 409:
            skipped += 1
            print(f"⏭️  Duplicate: {title[:60]}")
        else:
            failed += 1
            print(f"❌ Failed ({res.status_code}): {title[:60]} — {res.text[:100]}")

    print(f"\n=== DONE ===")
    print(f"✅ Imported: {success}")
    print(f"⏭️  Skipped:  {skipped}")
    print(f"❌ Failed:   {failed}")

if __name__ == "__main__":
    parse_and_import()
