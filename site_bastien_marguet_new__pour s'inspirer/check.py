#!/usr/bin/env python3
"""Contrôles de structure et des chemins locaux, sans dépendance externe."""
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'

class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids=[];self.references=[];self.h1=0;self.main=0;self.labels=set();self.fields=[];self.errors=[];self.lang=None
        self.third_party_loads=[];self.active_nav=[];self.controls=[];self.images=[]
    def handle_starttag(self, tag, attributes):
        a=dict(attributes)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='html':self.lang=a.get('lang')
        if tag=='h1':self.h1+=1
        if tag=='main':self.main+=1
        if tag=='label' and a.get('for'):self.labels.add(a['for'])
        if tag in ['input','select','textarea'] and a.get('type')!='hidden':self.fields.append(a.get('id'))
        if tag=='a' and a.get('aria-current')=='page':self.active_nav.append(a.get('href'))
        if tag in ['iframe','video']:self.errors.append('Lecteur chargé automatiquement : '+tag)
        if any(key.startswith('on') for key in a):self.errors.append('Gestionnaire JS inline')
        if tag=='img':
            self.images.append(a)
            if 'alt' not in a:self.errors.append('Image sans alternative')
            if 'width' not in a or 'height' not in a:self.errors.append('Image sans dimensions')
        for key in ['href','src']:
            if key in a:self.references.append((tag,key,a[key]))
        if tag in ['script','img','iframe','source'] and urlsplit(a.get('src','')).scheme in ['http','https']:self.third_party_loads.append(a['src'])
        if tag=='link' and a.get('rel') in ['stylesheet','preload','preconnect'] and urlsplit(a.get('href','')).scheme in ['http','https']:self.third_party_loads.append(a['href'])

def main():
    parsed={}
    errors=[]
    for path in sorted(OUT.rglob('*.html')):
        doc=Document();doc.feed(path.read_text(encoding='utf-8'));parsed[path]=doc
        relative=path.relative_to(OUT).as_posix()
        if doc.lang!='fr':errors.append(relative+': langue manquante')
        if doc.h1!=1:errors.append(relative+': nombre de h1 '+str(doc.h1))
        if doc.main!=1:errors.append(relative+': nombre de main '+str(doc.main))
        duplicates=[key for key,count in Counter(doc.ids).items() if count>1]
        if duplicates:errors.append(relative+': identifiants dupliqués '+str(duplicates))
        if set(doc.fields)-doc.labels:errors.append(relative+': champs sans libellé')
        if doc.third_party_loads:errors.append(relative+': chargement tiers '+str(doc.third_party_loads))
        errors.extend(relative+': '+e for e in doc.errors)
    references=0
    for path,doc in parsed.items():
        for tag,key,ref in doc.references:
            parts=urlsplit(ref)
            if parts.scheme or ref.startswith('//'):continue
            destination=(path.parent/unquote(parts.path)).resolve() if parts.path else path
            try:destination.relative_to(OUT.resolve())
            except ValueError:errors.append(str(path)+': chemin hors site '+ref);continue
            references+=1
            if not destination.is_file():errors.append(str(path.relative_to(OUT))+': fichier absent '+ref);continue
            if parts.fragment and destination in parsed and unquote(parts.fragment) not in parsed[destination].ids:errors.append(str(path.relative_to(OUT))+': ancre absente '+ref)
    data=json.loads((ROOT/'data/catalogue.json').read_text())
    pdfs=list((OUT/'pdfs').rglob('*.pdf'))
    for pdf in pdfs:
        with pdf.open('rb') as stream:
            if stream.read(5)!=b'%PDF-':errors.append('PDF invalide '+str(pdf))
    payload={'html_pages':len(parsed),'local_references_checked':references,'pdf_files':len(pdfs),'courses':len(data['courses']),'course_resources':sum(len(c['resources']) for c in data['courses']),'errors':errors}
    print(json.dumps(payload,ensure_ascii=False,indent=2))
    if errors:raise SystemExit(1)

if __name__=='__main__':main()
