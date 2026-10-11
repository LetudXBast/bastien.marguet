"""Validate generated pages and their local navigation without dependencies."""
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent


class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.references = []
        self.labels = set()
        self.fields = []
        self.h1 = self.main = 0
        self.form_actions = []
        self.nav = []
        self.in_nav = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        self.h1 += tag == 'h1'
        self.main += tag == 'main'
        if tag == 'label' and a.get('for'):
            self.labels.add(a['for'])
        if tag in ['input', 'textarea', 'select'] and a.get('type') != 'hidden':
            self.fields.append(a.get('id'))
        if tag == 'form':
            self.form_actions.append(a.get('action'))
        if tag == 'nav':
            self.in_nav = a.get('aria-label') == 'Navigation principale'
        if tag == 'a' and self.in_nav:
            self.nav.append(a.get('href'))
        for key in ['href', 'src']:
            if key in a:
                self.references.append(a[key])

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.in_nav = False


def main():
    urls = ET.parse(ROOT / 'sitemap.xml').findall('.//{*}loc')
    base = json.loads((ROOT / 'data/site.json').read_text(encoding='utf-8'))['base_url']
    paths = [ROOT / element.text.removeprefix(base) for element in urls]
    paths += [ROOT / '404.html', ROOT / 'merci.html']
    parsed = {}
    errors = []
    count = 0
    for path in paths:
        doc = Document()
        doc.feed(path.read_text(encoding='utf-8'))
        parsed[path.resolve()] = doc
        if doc.h1 != 1 or doc.main != 1:
            errors.append(f'{path.name}: expected one main and one h1')
        if any(n > 1 for n in Counter(doc.ids).values()):
            errors.append(f'{path.name}: duplicate IDs')
        if set(doc.fields) - doc.labels:
            errors.append(f'{path.name}: unlabelled fields')
        expected = ['index.html', 'enseignements.html', 'publications.html', 'interventions.html', 'a-propos.html', 'contact.html']
        if [Path(link).name for link in doc.nav] != expected:
            errors.append(f'{path.name}: navigation differs from reference')
        if any('vision-education.html' in ref for ref in doc.references):
            errors.append(f'{path.name}: draft education map exposed')
    for path, doc in list(parsed.items()):
        for ref in doc.references:
            parts = urlsplit(ref)
            if parts.scheme or parts.netloc:
                continue
            count += 1
            destination = (path.parent / unquote(parts.path)).resolve() if parts.path else path
            if not destination.is_file():
                errors.append(f'{path.relative_to(ROOT)}: missing {ref}')
                continue
            if parts.fragment and destination.suffix == '.html':
                if destination not in parsed:
                    other = Document()
                    other.feed(destination.read_text(encoding='utf-8'))
                    parsed[destination] = other
                if unquote(parts.fragment) not in parsed[destination].ids:
                    errors.append(f'{path.relative_to(ROOT)}: missing anchor {ref}')
    data = json.loads((ROOT / 'data/catalogue.json').read_text(encoding='utf-8'))
    for course in data['courses']:
        for resource in course['resources']:
            local = resource.get('local_path')
            if local and local.endswith('.pdf'):
                with (ROOT / local).open('rb') as stream:
                    if stream.read(5) != b'%PDF-':
                        errors.append(f'Invalid PDF: {local}')
    contact = parsed[(ROOT / 'contact.html').resolve()]
    config = json.loads((ROOT / 'data/site.json').read_text(encoding='utf-8'))
    if contact.form_actions != [config['contact_endpoint']]:
        errors.append('Contact form not preserved')
    print(json.dumps({'pages': len(paths), 'local_references': count, 'courses': len(data['courses']),
                      'resources': sum(len(c['resources']) for c in data['courses']), 'errors': errors}, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
