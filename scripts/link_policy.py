"""Keep internal navigation in place and open external web links separately."""
import re
from html import escape, unescape
from urllib.parse import urlsplit


def external_links(document, base_url):
    base = urlsplit(base_url)

    def update(match):
        tag = match.group(0)
        href = re.search(r'\bhref\s*=\s*([\'"])(.*?)\1', tag, re.I | re.S)
        if not href:
            return tag
        value = urlsplit(unescape(href.group(2)))
        if value.scheme and value.scheme.lower() not in ('http', 'https'):
            return tag
        external = bool(value.netloc) and not (
            value.netloc.lower() == base.netloc.lower()
            and (value.path == base.path.rstrip('/') or value.path.startswith(base.path))
        )
        tag = re.sub(r'\s+target\s*=\s*([\'"]).*?\1', '', tag, flags=re.I | re.S)
        if external:
            rel = re.search(r'\s+rel\s*=\s*([\'"])(.*?)\1', tag, re.I | re.S)
            tokens = unescape(rel.group(2)).split() if rel else []
            tokens = list(dict.fromkeys(tokens + ['noopener', 'noreferrer']))
            tag = re.sub(r'\s+rel\s*=\s*([\'"]).*?\1', '', tag, flags=re.I | re.S)
            tag = tag[:-1] + ' target="_blank" rel="' + escape(' '.join(tokens), quote=True) + '">'
        return tag

    return re.sub(r'<a\b[^>]*>', update, document, flags=re.I)
