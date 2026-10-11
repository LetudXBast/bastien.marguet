#!/usr/bin/env python3
"""Génère les pages statiques sans dépendance Python externe. Python 3.10+."""
import argparse
import json
import re
import shutil
from collections import defaultdict
from html import escape
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
import xml.etree.ElementTree as ET
from link_policy import external_links

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT
DATA = json.loads((ROOT / 'data/catalogue.json').read_text(encoding='utf-8'))
CONFIG = json.loads((ROOT / 'data/site.json').read_text(encoding='utf-8'))
PAGES = []
E = lambda value: escape(str(value), quote=True)
CATEGORIES = {'cours': 'Cours', 'annale': 'Sujet', 'corrige': 'Corrigé', 'support': 'Support'}
LEVELS = {'BUT1': ('BUT · 1re année', 'Fondamentaux, mathématiques et outils scientifiques'),
          'BUT2': ('BUT · 2e année', 'Analyse, statistiques et modélisation'),
          'BUT3': ('BUT · 3e année', 'Anglais et communication scientifique'),
          'LP CESP': ('Licence professionnelle CESP', 'Automatisme, régulation et capteurs')}

def fragment(name):
    return (ROOT / 'data/fragments' / (name + '.html')).read_text(encoding='utf-8')

def url(value):
    parts = urlsplit(value)
    return urlunsplit((parts.scheme, parts.netloc, quote(parts.path, safe='/%@'), parts.query, parts.fragment))

def link(href, title, **attrs):
    props = ''.join(f' {key.rstrip("_").replace("_", "-")}="{E(value)}"' for key, value in attrs.items())
    return f'<a href="{E(url(href))}"{props}>{title}</a>'

def relative(path, prefix): return prefix + path

def course_title(course): return course['title'].split(' (')[0]

def course_context(course):
    level = course['level']
    if level == 'LP CESP':
        return 'Licence professionnelle CESP · Chargé de projet Électro-Hydro-Mécanique pour systèmes de pompage'
    ctx = LEVELS[level][0] + ' · Génie chimique - Génie des procédés'
    match = re.search(r'Parcours (.+)\)', course['title'])
    return ctx + (' · Parcours ' + match.group(1) if match else '')

def course_href(course, prefix=''): return prefix + 'enseignements/' + course['slug'] + '.html'

def size_label(size):
    if not size: return ''
    return ((f'{size / 1_000_000:.1f} Mo' if size >= 1_000_000 else f'{round(size / 1000)} ko').replace('.', ','))

def resource_title(resource):
    title = resource['title']
    session = resource.get('session', '').lower()
    if title in ['Sujet réel', 'Sujet final']: return 'Sujet - examen final'
    if title == 'Sujet' and 'blanc' in session: return 'Sujet - examen blanc'
    if title == 'Corrigé' and 'blanc' in session: return 'Corrigé - examen blanc'
    return title

def resource_href(resource, prefix):
    return relative(resource['local_path'], prefix) if resource.get('local_path') else resource['url']

def resource_row(resource, course, prefix='', in_catalogue=False, heading='h3'):
    label = resource_title(resource)
    year = resource.get('year')
    category = CATEGORIES[resource.get('category', 'support')]
    metadata = [category]
    if resource.get('session'): metadata.append(resource['session'].replace('Exam blanc', 'Examen blanc'))
    metadata.append(('Année ' + year) if year else 'Édition non datée')
    metadata.append(resource['format'])
    if resource.get('language'): metadata.append({'fr': 'Français', 'en': 'Anglais'}[resource['language']])
    if resource.get('size_bytes'): metadata.append(size_label(resource['size_bytes']))
    searchable = ' '.join([label, course['title'], course['description'], ' '.join(metadata), 'corrigé' if resource.get('category') == 'corrige' else ''])
    data = f' data-resource data-level="{E(course["level"])}" data-year="{E(year or "non-date")}" data-category="{E(resource["category"])}" data-search="{E(searchable)}"' if in_catalogue else ''
    target = link(resource_href(resource, prefix), E(label))
    if resource.get('http_status') == 404:
        target = E(label) + ' <span class="muted">- document indisponible</span>'
    context = f'<p class="resource-context meta">{link(course_href(course, prefix), E(course_title(course)))} · {E(course["level"])}</p>' if in_catalogue else ''
    return f'''<li class="resource-item" id="{E(resource['id'])}"{data}>
      <div class="resource-heading"><{heading}>{target}</{heading}><span class="resource-label">{E(resource['format'])}</span></div>
      {context}<p class="resource-meta">{E(' · '.join(metadata))}</p>
    </li>'''

def breadcrumbs(items):
    return '<nav class="breadcrumbs" aria-label="Fil d’Ariane"><ol>' + ''.join('<li>' + (link(href, E(label)) if href else f'<span aria-current="page">{E(label)}</span>') + '</li>' for href, label in items) + '</ol></nav>'

def nav(prefix, current):
    entries = [('index.html', 'Accueil'), ('enseignements.html', 'Enseignements'), ('publications.html', 'Publications'), ('interventions.html', 'Interventions'), ('a-propos.html', 'À propos'), ('contact.html', 'Contact')]
    return ''.join('<li>' + link(prefix+path, E(label), **({'aria_current': 'page'} if path == current else {})) + '</li>' for path, label in entries)

def page(path, title, description, content, current=None, prefix='', script=False):
    canonical = urljoin(CONFIG['base_url'], path)
    scripts = f'<script src="{prefix}assets/script.js" defer></script>' if script else ''
    home_current = ' aria-current="page"' if path == 'index.html' else ''
    document = f'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(title)} - Bastien Marguet</title>
  <meta name="description" content="{E(description)}">
  <meta name="google-site-verification" content="uIl1gm6lEvPuF1crlqyiuN7xsGx7xSDzLGbgRj04NrQ">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="canonical" href="{E(canonical)}">
  <link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="{E(title)} - Bastien Marguet">
  <meta property="og:description" content="{E(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:url" content="{E(canonical)}">
  <link rel="stylesheet" href="{prefix}assets/style.css">
  {scripts}
</head>
<body>
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="site-brand" href="{prefix}index.html" aria-label="Bastien Marguet - Retour à l’accueil"{home_current}>
        <span class="brand-mark" aria-hidden="true">BM</span>
        <span class="brand-copy"><strong>Bastien Marguet</strong><span>Sciences · pédagogie · IA</span></span>
      </a>
      <nav class="site-nav" aria-label="Navigation principale"><ul id="site-nav-list">{nav(prefix, current or path)}</ul></nav>
    </div>
  </header>
  <main id="contenu" class="container" tabindex="-1">{content}</main>
  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 Bastien Marguet</p>
      <nav class="footer-links" aria-label="Liens complémentaires">
        {link(prefix+'resources.html', 'Bibliothèque')}
        {link(prefix+'outils.html', 'Outils pédagogiques')}
        {link('https://github.com/LetudXBast', 'GitHub')}
        {link('https://fr.linkedin.com/in/bastien-marguet-23a074200', 'LinkedIn')}
        {link(prefix+'informations.html', 'Informations du site')}
      </nav>
    </div>
  </footer>
</body>
</html>'''
    destination = OUT / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    document = external_links(document, CONFIG['base_url'])
    destination.write_text('\n'.join(line.rstrip() for line in document.splitlines()) + '\n', encoding='utf-8')
    PAGES.append(path)

def local_nav(items, label='Sur cette page'):
    return '<nav class="local-nav" aria-label="'+E(label)+'">'+''.join(link('#'+i, E(t)) for i,t in items)+'</nav>'

def intro(kicker, title, desc):
    return f'<header class="page-intro"><p class="page-kicker">{E(kicker)}</p><h1>{E(title)}</h1><p class="lead">{desc}</p></header>'

def contact_band(prefix=''):
    return f'''<aside class="contact-band"><h2>Une question, une collaboration ?</h2><p>Pour un support de cours, une formation ou une intervention, {link(prefix+'contact.html', 'contactez-moi via le formulaire')}.</p></aside>'''

def home():
    quick=''
    for level,(label,description) in LEVELS.items():
        target='enseignements.html#'+{'BUT1':'enseignements-but1','BUT2':'enseignements-but2','BUT3':'enseignements-but3','LP CESP':'enseignements-lp-cesp'}[level]
        short=level.replace('LP CESP','LP CESP').replace('BUT','BUT ')
        quick_content = f'<span class="quick-label">{E(short)}</span><span><span class="quick-title">{E(label)}</span><span class="quick-description">{E(description)}</span></span><span class="arrow" aria-hidden="true">→</span>'
        quick += '<li>' + link(target, quick_content) + '</li>'
    body = f'''<section class="intro" id="intro" aria-labelledby="titre-accueil">
      <div><p class="page-kicker">Enseignant · IUT Lyon 1</p><h1 id="titre-accueil">Bastien Marguet</h1>
      <p class="lead">Docteur en physique statistique, agrégé de Physique-Chimie et professeur agrégé affecté dans l’enseignement supérieur (PRAG).</p>
      <p class="prose">J’enseigne les mathématiques appliquées, les sciences et la communication scientifique. Je m’intéresse aussi à la cognition - attention, mémoire, raisonnement - et à l’usage de l’IA pour soutenir l’apprentissage et l’autonomie.</p>
      <p class="prose">En 2026-2027, je me forme au {link('a-propos.html#formation-neuroeducation', 'DU Neuroéducation, adossé au LaPsyDÉ')}.</p>
      <div class="actions">{link('enseignements.html', 'Trouver un cours <span aria-hidden="true">→</span>', class_='button')}{link('resources.html','Chercher un document')}{link('a-propos.html','Mon parcours')}</div></div>
      <figure class="intro-photo"><img src="img/intro.jpeg" width="2000" height="1329" alt="Mon portrait lors d’un échange"><figcaption>Sciences, transmission et dialogue.</figcaption></figure>
    </section>
    <section class="section" id="enseignements" aria-labelledby="titre-cours"><span id="resources-preview" aria-hidden="true"></span><div class="section-heading"><h2 id="titre-cours">Accès aux enseignements</h2>{link('resources.html','Toute la bibliothèque')}</div>
      <div class="overview"><div><p>Retrouvez les polycopiés, les supports et les annales par formation et par cours.</p><ul class="quick-links">{quick}</ul></div>
      <aside><h3>Choisir le bon document</h3><p>Les sujets et les corrigés sont identifiés séparément. Chaque annale conserve l’année indiquée dans la ressource d’origine.</p><p class="meta">Retrouvez les annales de 2024-2025 et 2025-2026, ainsi que les premiers sujets de 2026-2027. Certains supports ne portent pas de date.</p><p>{link('outils.html','Vidéos et simulateurs pédagogiques →')}</p></aside></div>
    </section>
    <section class="section" id="about" aria-labelledby="titre-activites"><h2 id="titre-activites">Travaux et transmission</h2>
      <div class="overview"><article><p class="page-kicker">Physique statistique</p><h3>Interfaces et systèmes hors équilibre</h3><p class="prose">Mes travaux de recherche ont porté sur la dynamique d’interfaces, leur confinement et les phénomènes collectifs en croissance cristalline.</p>{link('publications.html','Articles et manuscrit de thèse →')}</article>
      <article><p class="page-kicker">Interventions</p><h3>IA, apprentissage et communication</h3><p class="prose">Ateliers et formations autour de l’usage raisonné de l’IA, de la prise de parole scientifique et de la valorisation des compétences doctorales.</p>{link('interventions.html','Interventions et supports →')}</article></div>
      {fragment('ambassadeur-doctorat')}
    </section>
    <section class="section" id="ia" aria-labelledby="titre-ia"><h2 id="titre-ia">IA et autonomie intellectuelle</h2><p class="prose">Je m’intéresse aux effets de l’IA générative sur les méthodes de travail et les processus cognitifs. Mon approche consiste à l’intégrer dans une démarche explicite : questionner, vérifier les réponses et conserver une réflexion personnelle.</p>{link('interventions.html#approche-ia','Approche et formats d’intervention →')}</section>
    <section class="contact-band" id="contact"><h2>Prendre contact</h2><p>Une question sur un cours, un atelier ou une collaboration ?</p><p>{link('contact.html','Me contacter',class_='button')}</p></section>'''
    page('index.html', 'Enseignements et travaux', 'Je suis PRAG à l’IUT Lyon 1. Retrouvez mes supports de cours, annales, publications et interventions.', body)

def teaching():
    ids={'BUT1':'enseignements-but1','BUT2':'enseignements-but2','BUT3':'enseignements-but3','LP CESP':'enseignements-lp-cesp'}
    body=intro('Enseignements', 'Cours et ressources pédagogiques', 'Mathématiques, sciences et communication scientifique : choisissez votre formation, puis votre enseignement.')
    body += '<p class="prose">Bachelor universitaire de technologie (BUT) en Génie chimique - Génie des procédés, et licence professionnelle CESP à l’IUT Lyon 1.</p>'
    body += '<aside class="notice"><p><strong>Années disponibles.</strong> Annales 2024-2025 et 2025-2026, premiers sujets 2026-2027. Les fiches de TD sont accessibles avec les supports de cours.</p></aside>'
    body += local_nav([(ids[level],level.replace('BUT','BUT ')) for level in LEVELS])
    body += '<p>'+link('resources.html','Rechercher par titre, thème, année ou type de document →')+'</p>'
    for level,(label,desc) in LEVELS.items():
        body += f'<section class="section" id="{ids[level]}"><h2>{E(label)}</h2><p class="muted">{E(desc)}</p><ul class="course-list">'
        for course in DATA['courses']:
            if course['level'] != level: continue
            count=len(course['resources'])
            countlabel=f'{count} ressource'+('s' if count>1 else '')+' disponible'+('s' if count>1 else '') if count else 'Aucun support public actuellement'
            context=course_context(course)
            body += f'''<li><article class="course-card" id="{E(course['id'])}"><div><h3>{link(course_href(course),E(course_title(course)))}</h3><p class="meta">{E(context)}</p>{f'<p>{E(course["description"])}</p>' if course['description'] else ''}<p class="course-count">{E(countlabel)}</p></div>{link(course_href(course),'Voir le cours <span aria-hidden="true">→</span>',class_='course-open')}</article></li>'''
        body += '</ul></section>'
    body += '<section class="section" id="formations"><h2>Formations et parcours</h2><div class="prose"><p><strong>CPIT</strong> : Conception des procédés et innovation technologique. <strong>CPOP</strong> : Contrôle, pilotage et optimisation des procédés.</p><p><strong>CESP</strong> : Chargé de projet Électro-Hydro-Mécanique pour systèmes de pompage.</p><p>'+link('https://iut.univ-lyon1.fr/formation/but/but-genie-chimique-genie-des-procedes','Présentation du BUT sur le site de l’IUT Lyon 1')+'</p></div></section>'
    page('enseignements.html','Enseignements','Mes enseignements en BUT Génie chimique - Génie des procédés et en licence professionnelle CESP.',body,current='enseignements.html')
    for course in DATA['courses']: course_page(course)

def course_page(course):
    prefix='../'
    body=breadcrumbs([(prefix+'index.html','Accueil'),(prefix+'enseignements.html','Enseignements'),(None,course_title(course))])
    description='<p class="prose">'+E(course['description'])+'</p>' if course['description'] else ''
    body += f'<header class="course-header"><p class="page-kicker">{E(course["level"])}</p><h1>{E(course_title(course))}</h1><p class="meta">{E(course_context(course))}</p>{description}</header>'
    supports=[r for r in course['resources'] if r['category'] not in ['annale','corrige']]
    annales=[r for r in course['resources'] if r['category'] in ['annale','corrige']]
    sections=[]
    content=''
    if supports:
        sections.append(('supports','Supports de cours'))
        content += '<section id="supports"><h2>Supports de cours</h2><ul class="resource-list">'+''.join(resource_row(r,course,prefix) for r in supports)+'</ul></section>'
    if annales:
        sections.append(('annales','Annales et évaluations'))
        content += '<section class="subsection" id="annales"><h2>Annales et évaluations</h2><p class="prose">Documents des sessions indiquées. Un corrigé est proposé seulement lorsqu’il figure parmi les supports publics.</p>'
        years=defaultdict(list)
        for r in annales: years[r.get('year') or 'non-date'].append(r)
        for year in sorted(years,key=lambda v:v if v!='non-date' else '',reverse=True):
            label='Édition non datée' if year=='non-date' else 'Année '+year
            yid='annee-'+year
            sections.append((yid,label))
            content += f'<section id="{E(yid)}"><h3 class="year-heading">{E(label)}</h3><ul class="resource-list">'+''.join(resource_row(r,course,prefix,heading='h4') for r in years[year])+'</ul></section>'
        content += '</section>'
    if not course['resources']:
        content += '<aside class="notice"><p>Aucun support public pour cet enseignement actuellement.</p></aside>'
    if course['id'].startswith('ue-lp-cesp'):
        content += '<p>'+link(prefix+'outils.html#simulateurs','Consulter les simulateurs d’automatisme et de régulation →')+'</p>'
    content += '<p class="rights-note">Les indications de version et les conditions figurant dans chaque document s’appliquent. Pour une réutilisation ou pour signaler un problème, '+link(prefix+'contact.html','contactez-moi en précisant le cours et le fichier')+'.</p>'
    content += '<p class="actions">'+link(prefix+'enseignements.html','← Tous les enseignements')+link(prefix+'resources.html?niveau='+quote(course['level']),'Bibliothèque de ce niveau')+'</p>'
    if sections:
        toc='<aside class="toc" aria-label="Sommaire du cours"><h2>Sur cette page</h2><ul>'+''.join('<li>'+link('#'+sid,E(label))+'</li>' for sid,label in sections)+'</ul></aside>'
        body += '<div class="course-layout"><div>'+content+'</div>'+toc+'</div>'
    else: body += content
    page('enseignements/'+course['slug']+'.html',course_title(course),course['description'] or course_context(course),body,current='enseignements.html',prefix=prefix)

def catalogue():
    resources=[(r,c) for c in DATA['courses'] for r in c['resources']]
    body=intro('Bibliothèque', 'Trouver un document', 'Un catalogue commun aux pages de cours : polycopiés, sujets, corrigés et présentations.')
    years=sorted({r['year'] for r,c in resources if r.get('year')},reverse=True)
    options=lambda values: ''.join('<option value="'+E(value)+'">'+E(label)+'</option>' for value,label in values)
    form=f'''<form class="search-form" role="search" data-catalogue-filter hidden>
      <div class="filter-controls"><div><label for="recherche">Titre ou thème du cours</label><input id="recherche" name="q" type="search" placeholder="Statistiques, interro 2…" autocomplete="off" aria-describedby="recherche-aide"></div>
      <div><label for="niveau">Formation / niveau</label><select id="niveau" name="niveau"><option value="">Tous les niveaux</option>{options([(level,level.replace('BUT','BUT ')) for level in LEVELS if any(c['resources'] for c in DATA['courses'] if c['level']==level)])}</select></div>
      <div><label for="annee">Année du document</label><select id="annee" name="annee"><option value="">Toutes les années</option>{options([(y,y) for y in years])}<option value="non-date">Édition non datée</option></select></div>
      <div><label for="type">Type de document</label><select id="type" name="type"><option value="">Tous les types</option>{options(list(CATEGORIES.items()))}</select></div></div>
      <div class="filter-footer"><p class="meta" id="recherche-aide">Recherche dans les titres et les thèmes des cours, hors texte des PDF.</p><button class="text-button" type="reset">Effacer les filtres</button></div>
    </form>'''
    body+=form+'<noscript><p class="notice">Toutes les ressources sont affichées. Retrouvez aussi les documents '+link('enseignements.html','classés par cours')+'.</p></noscript>'
    body+=f'<div class="results-header filter-status"><p role="status" aria-live="polite" aria-atomic="true" data-result-count>{len(resources)} ressources</p><p class="meta" data-active-filters>Toutes les ressources</p></div>'
    body+='<div class="empty-state" data-empty-results hidden><h2>Aucune ressource correspondante</h2><p>Essayez un autre mot, une autre année ou effacez les filtres.</p></div>'
    body+='<ul class="resource-list">'+''.join(resource_row(r,c,in_catalogue=True,heading='h2') for r,c in resources)+'</ul>'
    body+='<p class="rights-note">Une ressource non datée ne vaut pas confirmation de l’édition en cours. Les conditions de réutilisation figurant dans les fichiers s’appliquent.</p>'
    body+='<section class="section" id="enseignements"><h2>Retrouver les autres rubriques</h2><p>La bibliothèque rassemble les documents pédagogiques. Les autres contenus disposent de pages dédiées.</p>'
    redirects={'interventions':('interventions.html','Interventions'),'publications':('publications.html','Publications'),'recherches':('a-propos.html#recherches','Recherche'),'vulgarisation':('outils.html','Vulgarisation et outils'),'vulgarisation-videos':('outils.html#videos','Vidéos pédagogiques'),'vulgarisation-jeu':('outils.html#fonction-cachee','Jeu Fonction cachée'),'vulgarisation-simulateurs':('outils.html#simulateurs','Simulateurs'),'cv':('a-propos.html#cv','Parcours / CV'),'responsabilites':('a-propos.html#responsabilites','Responsabilités'),'medias':('interventions.html#medias','Médias')}
    for sid,(href,label) in redirects.items(): body+='<p id="'+sid+'">'+link(href,E(label)+' →')+'</p>'
    for course in DATA['courses']:
        body+=f'<p id="{E(course["id"])}">'+link(course_href(course),E(course_title(course))+' →')+'</p>'
    for level in LEVELS:
        sid={'BUT1':'enseignements-but1','BUT2':'enseignements-but2','BUT3':'enseignements-but3','LP CESP':'enseignements-lp-cesp'}[level]
        body+=f'<p id="{sid}">'+link('enseignements.html#'+sid,E(level)+' →')+'</p>'
    body+='</section>'
    page('resources.html','Bibliothèque de ressources','Recherche dans les titres et thèmes des cours, avec filtres par niveau, année et type de document.',body,script=True)

def publications():
    body=intro('Publications', 'Articles et manuscrit de thèse', 'Travaux en physique statistique : croissance cristalline, interfaces hors équilibre et dynamique stochastique.')
    body+=local_nav([('articles','Articles'),('these','Thèse')])
    body+='<section id="articles"><h2>Articles</h2><p class="meta">Du plus récent au plus ancien.</p><ul class="publication-list">'
    for pub in [p for p in DATA['publications'] if p['type']=='article']:
        body += f'<li class="publication" id="{E(pub["id"])}"><h3 lang="en">{E(pub["title"])}</h3><p>{E(pub["authors"])}</p><p class="meta"><cite>{E(pub["venue"])}</cite> · {E(pub["details"])} · {pub["year"]} · Article</p><div class="actions">'+link(resource_href(pub,''),'Lire le PDF ('+size_label(pub.get('size_bytes'))+')')+link('https://doi.org/'+pub['doi'],'DOI : '+E(pub['doi']))+'</div></li>'
    body+='</ul></section><section class="section" id="these"><h2>Manuscrit de thèse</h2>'
    pub=next(p for p in DATA['publications'] if p['type']=='these')
    body+=f'<article class="publication"><h3>{E(pub["title"])}</h3><p>Bastien Marguet · Université Claude Bernard Lyon 1 · 2022</p><p class="meta">Thèse de doctorat en physique statistique</p><div class="actions">'+link(resource_href(pub,''),'Lire le manuscrit (PDF · '+size_label(pub.get('size_bytes'))+')')+link(pub['record_url'],'Notice de soutenance')+'</div></article></section>'
    body+='<p class="rights-note">Les droits propres à chaque article et à chaque version de fichier s’appliquent. Pour les ateliers et conférences, consultez '+link('interventions.html','les interventions')+'.</p>'
    page('publications.html','Publications','Mes articles en physique statistique et mon manuscrit de thèse, avec références et DOI.',body,current='publications.html')

def interventions():
    body=intro('Interventions', 'Ateliers, formations et médiation', 'IA et apprentissage, communication scientifique et valorisation du doctorat : sujets, événements et supports disponibles.')
    body+=local_nav([('chronologie','Interventions datées'),('approche-ia','Approche de l’IA'),('medias','Vidéos et podcasts')])
    body+='<section id="chronologie"><h2>Interventions datées</h2><p class="meta">Du plus récent au plus ancien.</p><ol class="intervention-list">'
    for event in sorted(DATA['interventions'],key=lambda e:e['date'],reverse=True):
        body+=f'<li class="intervention" id="{E(event["id"])}"><time datetime="{E(event["date"])}">{E(event["display_date"])}</time><div><h3>{E(event["title"])}</h3><p>'+link(event['links'][0]['url'],E(event['organisation']))+(' · '+E(event['place']) if event.get('place') else '')+'</p>'
        available=event['links'][1:]
        if available:
            labels={'support':'Support (HTML)','annonce':'Annonce','sondage':'Sondage','présentation':'Présentation'}
            body+='<div class="actions">'+''.join(link(a['url'],E(labels.get(a['title'],a['title']))) for a in available)+'</div>'
        body+='</div></li>'
    body+='</ol></section>'
    body+='''<section class="section" id="approche-ia"><h2>IA et méthodes de travail</h2><div class="overview"><article><h3>Conserver une réflexion personnelle</h3><p>L’IA générative est un outil à intégrer dans une méthode de travail, avec une attention à la vérification des réponses, aux mécanismes cognitifs et à l’autonomie intellectuelle.</p><p>Mes interventions abordent l’analyse, la rédaction, l’autoévaluation et la création de contenus pédagogiques à partir de cas concrets.</p></article><article><h3>Formations et accompagnement</h3><p>Avec '''+link('https://sites.google.com/view/gaston-nieuviarts','Gaston Nieuviarts')+''', nous intervenons auprès d’universités et d’organisations.</p><ul><li>Usages de l’IA pour l’analyse et la rédaction</li><li>Création de contenus pédagogiques assistés</li><li>Méthodes de travail et autonomie cognitive</li><li>Ateliers pratiques sur des cas d’usage</li></ul><p class="meta">Conférence, atelier, journée de formation ou accompagnement.</p>'''+link('contact.html','Échanger sur un besoin →')+'</article></div></section>'
    body += '<section class="section" id="medias"><h2>Vidéos, interviews et podcasts</h2><p class="prose">Retrouvez mes interventions filmées et mes échanges autour des sciences.</p>' + fragment('media') + '<p>' + link('https://pintofscience.fr/events/lyon', 'Pint of Science à Lyon') + '</p></section>' + contact_band()
    page('interventions.html','Interventions','Mes ateliers sur l’IA et l’apprentissage, la communication scientifique et les compétences doctorales ; vidéos et podcasts.',body,current='interventions.html')

def legacy_section(sid):
    value=DATA['legacy_sections'][sid]
    value=re.sub(r'\s+(?:target|rel)="[^"]*"','',value)
    value=value.replace('class="cv-list"','class="timeline"').replace('class="research-list modern-research"','class="research-list"')
    return value

def about():
    body=intro('À propos', 'Enseigner, chercher, transmettre', 'Mon parcours associe physique statistique, enseignement dans le supérieur et communication scientifique.')
    body+=local_nav([('biographie','Biographie courte'),('formation-neuroeducation','Formation en cours'),('responsabilites','Responsabilités'),('recherches','Recherche'),('cv','Parcours')])
    body+='''<section id="biographie" class="prose"><h2>Quelques mots sur mon parcours</h2><p>Je suis docteur en physique statistique, agrégé de Physique-Chimie et PRAG à l’IUT Lyon 1. J’enseigne les mathématiques appliquées, les sciences et la communication scientifique. Mes activités portent également sur l’usage raisonné de l’IA générative, la médiation scientifique et la valorisation des compétences doctorales.</p></section>'''
    body+=fragment('neuroeducation')
    body+='<section class="section" id="responsabilites"><h2>Mes responsabilités</h2><div class="prose">'+legacy_section('responsabilites')+'</div></section>'
    body+='<section class="section" id="recherches"><h2>Mes expériences de recherche</h2><p class="prose">Physique statistique, dynamique d’interfaces et systèmes hors équilibre.</p>'+legacy_section('recherches')+'<p class="actions">'+link('publications.html','Articles et manuscrit de thèse →')+'</p></section>'
    body+='<section class="section" id="cv"><h2>Mon parcours académique</h2><div class="prose">'+legacy_section('cv')+'</div></section>'
    body+=contact_band()
    page('a-propos.html','À propos','Mon parcours académique, mes responsabilités et mes expériences de recherche.',body,current='a-propos.html')

def contact():
    body = intro('Contact', 'Échanger autour d’un cours ou d’un projet', 'Pour une intervention, une formation, une question sur un cours ou une collaboration scientifique et pédagogique.')
    form = fragment('contact').replace('https://letudxbast.github.io/bastien.marguet/merci.html', urljoin(CONFIG['base_url'], 'merci.html'))
    body += '<div class="page-layout"><section aria-labelledby="titre-message"><h2 id="titre-message">Votre message</h2>' + form + '<p class="meta">Le formulaire envoie votre message via FormSubmit.</p></section>'
    body += '<aside class="toc"><h2>Sujets d’échange</h2><ul><li>Enseignements et ressources</li><li>IA et apprentissage</li><li>Communication scientifique</li><li>Doctorat et compétences</li><li>Médiation et collaborations</li></ul><p>' + link('https://fr.linkedin.com/in/bastien-marguet-23a074200', 'LinkedIn') + ' · ' + link('https://github.com/LetudXBast', 'GitHub') + '</p></aside></div>'
    page('contact.html', 'Contact', 'Me contacter pour un cours, une formation ou une collaboration.', body, current='contact.html')


def tools():
    body=intro('Outils pédagogiques', 'Explorer et expérimenter', 'Vidéos de mathématiques, jeu de découverte de fonctions et simulateurs d’automatisme et de régulation.')
    body+=local_nav([('videos','Vidéos'),('fonction-cachee','Fonction cachée'),('simulateurs','Simulateurs')])
    body += '<section id="videos"><h2>Vidéos pédagogiques</h2><p>Deux exemples créés pour mes enseignements.</p>' + fragment('videos') + '</section>' 
    body+='<section class="section" id="fonction-cachee"><h2>Fonction cachée</h2><p class="prose">Deviner une fonction à partir de ses valeurs : un jeu pédagogique interactif.</p>'+link('https://fonction-cachee-bmarguet.streamlit.app/','Ouvrir le jeu sur Streamlit →')+'</section>'
    body+='<section class="section" id="simulateurs"><h2>Automatisme et régulation</h2><p class="prose">Simulations interactives pour explorer le comportement de systèmes régulés.</p><div class="tool-grid"><article><h3>Simulateur P</h3><p>Régulation proportionnelle.</p>'+link('https://pid-demo-letudx.streamlit.app/','Ouvrir le simulateur P →')+'</article><article><h3>Simulateur PID</h3><p>Régulation proportionnelle, intégrale et dérivée.</p>'+link('https://pid-demo-bmarguet.streamlit.app/','Ouvrir le simulateur PID →')+'</article></div></section>'
    body+='<p class="rights-note">Les outils s’ouvrent sur les services qui les hébergent. Ils ne sont chargés qu’après activation de leur lien.</p>'
    page('outils.html','Outils pédagogiques','Vidéos de mathématiques, jeu Fonction cachée et simulateurs P et PID pour l’enseignement.',body)

def information():
    body=intro('Informations du site','Édition, documents et confidentialité','Je rassemble ici mes enseignements et mes activités scientifiques et pédagogiques.')
    body+='<div class="prose"><section><h2>Édition et contact</h2><p>Je suis Bastien Marguet, responsable des contenus de ce site.</p><p>Contact : '+link('contact.html','Formulaire de contact')+'</p></section><section class="subsection" id="documents"><h2>Documents et réutilisation</h2><p>Les documents conservent les indications de leur édition d’origine. Les dates de session ne sont pas des dates de mise à jour des fichiers.</p><p>Les conditions et les droits propres à chaque support, publication et contenu tiers s’appliquent. La présence d’un fichier téléchargeable ne vaut pas autorisation de modification ou de redistribution. Pour une réutilisation, contactez l’auteur du support concerné.</p></section><section class="subsection" id="confidentialite"><h2>Confidentialité</h2><p>Les pages ne chargent ni outil de mesure d’audience, ni police distante. La recherche dans la bibliothèque est effectuée dans votre navigateur.</p><p>Les lecteurs de vidéos intégrés proviennent de YouTube et de l’Université Lyon 1. Leur chargement peut transmettre des données techniques à ces diffuseurs. Les podcasts et les outils externes s’ouvrent sur leurs services respectifs.</p><p>Le formulaire de contact transmet votre nom, votre adresse de courriel et votre message via FormSubmit, pour permettre de répondre à votre demande. L’hébergeur peut traiter des données techniques nécessaires à l’accès et au fonctionnement du site.</p></section><section class="subsection" id="accessibilite"><h2>Accès aux contenus</h2><p>Les ressources essentielles sont disponibles sans JavaScript. Les pages disposent d’un lien d’accès au contenu, d’une navigation au clavier, de repères de titres et d’une mise en page adaptée aux petits écrans et à l’impression.</p><p>Les PDF conservent leur format d’origine ; leur accessibilité n’a pas été auditée. Pour signaler une difficulté d’accès, indiquez la page ou le document concerné.</p></section></div>'
    page('informations.html','Informations du site','Édition, conditions de réutilisation des documents, confidentialité et accès aux contenus.',body)
    body404=intro('Erreur 404','Page introuvable','Cette adresse ne correspond pas à une page disponible. Retrouvez les ressources à partir des enseignements ou de la bibliothèque.')
    body404+='<div class="actions">'+link('enseignements.html','Voir les enseignements',class_='button')+link('resources.html','Chercher un document')+link('index.html','Revenir à l’accueil')+'</div><p class="rights-note">Un lien ne fonctionne plus ? '+link('contact.html','Signalez-le en indiquant son adresse')+'.</p>'
    page('404.html','Page introuvable','Retrouvez mes enseignements et mes ressources.',body404)
    bodymerci=intro('Contact','Merci pour votre message.','Vous pouvez poursuivre votre visite ou revenir aux ressources pédagogiques.')
    bodymerci+='<p>'+link('contact.html','Formulaire de contact')+'</p><p>'+link('contact.html','Voir la page Contact →')+'</p>'
    page('merci.html','Merci pour votre message','Retour après le formulaire de contact.',bodymerci,current='contact.html')

def validate_data():
    ids=[]
    for course in DATA['courses']:
        ids.append(course['id'])
        assert re.fullmatch('[a-z0-9-]+',course['slug']), 'Slug invalide'
        assert course['level'] in LEVELS
        for resource in course['resources']:
            ids.append(resource['id'])
            assert resource['category'] in CATEGORIES
            if resource.get('year'):
                assert re.fullmatch(r'20\d\d-20\d\d',resource['year']), 'Année scolaire attendue'
                if '-' in resource['year']:
                    a,b=map(int,resource['year'].split('-')); assert b == a+1
            assert resource['url'].startswith('https://')
            if resource.get('local_path'):
                assert '..' not in Path(resource['local_path']).parts
                assert (OUT/resource['local_path']).is_file()
    assert len(ids)==len(set(ids)), 'Identifiants dupliqués'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base-url',help='URL canonique complète, avec / final')
    args=parser.parse_args()
    if args.base_url: CONFIG['base_url']=args.base_url.rstrip('/')+'/'
    OUT.mkdir(exist_ok=True)
    validate_data()
    home(); teaching(); catalogue(); publications(); interventions(); about(); contact(); tools(); information()
    ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    ns='{http://www.sitemaps.org/schemas/sitemap/0.9}'
    sitemap=ET.Element(ns+'urlset')
    for path in PAGES:
        if path in ['404.html','merci.html']:continue
        element=ET.SubElement(sitemap,ns+'url');ET.SubElement(element,ns+'loc').text=urljoin(CONFIG['base_url'],path)
    ET.ElementTree(sitemap).write(OUT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
    (OUT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+urljoin(CONFIG['base_url'],'sitemap.xml')+'\n',encoding='utf-8')
    (OUT/'.nojekyll').write_text('',encoding='utf-8')
    print(json.dumps({'pages':len(PAGES),'courses':len(DATA['courses']),'resources':sum(len(c['resources']) for c in DATA['courses'])},ensure_ascii=False))

if __name__=='__main__': main()
