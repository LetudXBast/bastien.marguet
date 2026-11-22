# Site de Bastien Marguet

Le site statique suit l’arborescence du dossier de référence `site_bastien_marguet_new__pour s'inspirer`, conservé intact.

## Arborescence

- `index.html` : accueil et accès directs aux formations.
- `enseignements.html` : enseignements par niveau, puis une page par cours dans `enseignements/`.
- `publications.html` : articles et manuscrit de thèse.
- `interventions.html` : chronologie, approche de l’IA, vidéos et podcasts.
- `a-propos.html` : biographie, responsabilités, recherche et parcours.
- `contact.html` : formulaire FormSubmit et contact direct.
- `resources.html` : bibliothèque filtrable par texte, niveau, année et type.
- `outils.html` : vidéos pédagogiques, jeu et simulateurs.
- `informations.html`, `merci.html`, `404.html` : pages complémentaires.

Les présentations, le questionnaire doctoral, les PDF, les vidéos et la page du spectacle conservent leurs fichiers. Les anciennes ancres de l’accueil et de la bibliothèque restent disponibles. La vision de l’éducation n’est pas référencée dans les parcours publics.

## Modifier et reconstruire

Les contenus des cours, documents, publications et interventions sont dans `data/catalogue.json`. L’URL canonique et le point d’envoi du formulaire sont dans `data/site.json`. Les lecteurs multimédias et le formulaire sont conservés dans `data/fragments/`.

Les gabarits sont dans `scripts/build_site.py`, les styles dans `assets/style.css` et les filtres dans `assets/script.js`. Les pages HTML principales et les pages de cours sont générées : modifier leurs sources pour que les changements soient conservés à la prochaine reconstruction.

```powershell
python scripts/build_site.py
python scripts/check_site.py
node --check assets/script.js
```

La génération écrit les pages directement à la racine du site. Elle ne supprime aucun fichier ni document. Aucun téléchargement ni installation de dépendance n’est nécessaire.

Le contrôle vérifie les liens locaux, les ancres, la navigation commune, les titres principaux, les libellés des champs et les signatures des PDF référencés. Il ne soumet pas le formulaire de contact.

La bibliothèque affiche 20 ressources par page avec JavaScript et toutes les ressources sans JavaScript. Les filtres, le tri et la page courante sont conservés dans l’URL. Sur mobile, la recherche reste visible et les filtres secondaires peuvent être dépliés. Le menu mobile est une amélioration facultative : sans JavaScript, les liens de navigation restent visibles.

Les anciennes adresses du poly et des TD d’OM1 sont maintenues grâce à des copies de compatibilité, régénérées depuis leurs fichiers canoniques à chaque construction. Le catalogue référence uniquement les fichiers canoniques. Les décisions et le périmètre des vérifications sont décrits dans `docs/application-referentiel-ux.md`.

## Aperçu local

```powershell
python -m http.server 8000
```

Ouvrir `http://127.0.0.1:8000/`. Les liens relatifs restent compatibles avec l’hébergement GitHub Pages dans le sous-dossier `bastien.marguet`.
