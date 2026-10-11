# Site personnel de Bastien Marguet

Refonte à partir des fichiers fournis, suivant le « Référentiel de conception d’un site web personnel de professeur », version 1.0 du 11 octobre 2026.

La version comprend 24 pages HTML, 13 enseignements, 40 liens pédagogiques, 5 publications, 8 interventions et 6 notices de médias. Les 40 PDF déjà référencés sur le site public ont été récupérés. Les présentations, vidéos et outils extérieurs gardent leurs adresses d’origine.

## Consulter et publier

Le dossier `dist/` contient le site prêt à publier. Son `index.html` peut aussi être ouvert directement dans un navigateur : les liens locaux fonctionnent sans serveur.

Pour remplacer le site GitHub Pages existant, copier **le contenu de `dist/`** à la racine du dépôt publié, en conservant les dossiers historiques `presentations/`, `video/`, `phd-survey/` et les pages qui ne figuraient pas parmi les pièces jointes. Aucun accès au dépôt GitHub d’origine n’a été modifié pendant cette refonte.

Les documents PDF conservent leurs chemins historiques. Les liens `index.html#intro`, `#about`, `#ia`, `#contact`, ainsi que les rubriques et identifiants de cours de `resources.html`, disposent de points de reprise. Les liens externes restent des liens explicites ; ils ne sont pas chargés automatiquement.

`data/site.json` contient l’URL canonique du site public et l’adresse de contact déjà présente dans le formulaire fourni. Ajuster l’URL si le domaine change. La version consultable privée et la future publication GitHub sont deux hébergements distincts.

## Modifier les contenus

La source des cours, ressources, publications et interventions est **`data/catalogue.json`**. L’accueil et les autres gabarits se trouvent dans **`build.py`**. Les styles et le filtre facultatif se trouvent dans **`assets/`**. Les pages HTML de `dist/` sont générées : modifier leurs sources plutôt que chaque copie.

Le dossier `dist/` contient aussi les PDF et la photographie d’origine. **Ne pas effacer `dist/` avant une reconstruction** : le générateur met à jour les pages sans supprimer les documents publics. Ces fichiers font partie de la sauvegarde du projet.

Reconstruction et contrôles, avec Python 3.10 ou plus récent et Node.js pour la vérification syntaxique JavaScript :

```sh
python3 build.py
python3 check.py
node --check assets/script.js
```

Aucun package Python, framework JavaScript, gestionnaire de paquets ou police distante n’est nécessaire au site. Node n’est pas requis pour reconstruire les pages ou pour les consulter.

Pour changer l’URL canonique uniquement lors d’une construction :

```sh
python3 build.py --base-url https://votre-domaine.example/
```

### Ajouter un cours

Ajouter un objet à `courses`, avec un `id` unique, un `slug` stable composé de lettres minuscules ASCII, chiffres et tirets, un titre, le niveau existant, une description factuelle et la liste `resources`. Ne pas réutiliser l’identifiant d’un ancien cours pour un autre enseignement. Un tableau vide affiche « Aucun support public ».

### Ajouter une annale ou un corrigé

Copier le PDF autorisé dans `dist/pdfs/Cours/...`, puis ajouter un objet à `resources` du cours. Préciser `id`, `title`, `category` (`cours`, `support`, `annale` ou `corrige`), `session`, `year`, `format`, `url` et `local_path`. `local_path` est relatif à `dist/`, sans remontée de dossier. `size_bytes` est la taille réelle du fichier.

L’année universitaire s’écrit `2025-2026` ; une date civile disponible peut s’écrire `2026`. Garder `null` si l’information manque. Ne pas inventer date de mise à jour, version, langue ou licence. Un sujet et son corrigé reçoivent des notices séparées. La recherche porte sur les titres et thèmes de cours, pas sur le texte complet des PDF.

### Ajouter une publication ou une intervention

Pour un article : titre exact, auteurs dans l’ordre, année, revue, volume/pages ou identifiant, DOI vérifié, lien de fichier autorisé et type `article`. Pour une thèse : type `these` et notice de soutenance. Les références existantes ont été recoupées avec APS, IOP, ACS et l’Université de Lyon ; leurs DOI sont inclus dans les pages.

Pour une intervention : `date` au format ISO, date lisible, organisme, lieu pertinent, titre et liens réellement disponibles. La chronologie est générée dans l’ordre décroissant. Une nouvelle intervention n’est pas assimilée à une publication scientifique.

## Choix appliqués

- Charte B du référentiel : fond `#F8FAFC`, surface blanche, texte `#18232E`, texte secondaire `#465564`, liens `#145A75`, focus `#8A4300`, bordures `#C5CFD8`.
- Navigation par contenus ; accueil donnant un accès direct aux cours ; une page stable par enseignement ; bibliothèque et pages de cours issues du même catalogue.
- HTML statique, CSS natif et JavaScript facultatif. Liens utilisables sans JavaScript, menu visible sur mobile, lien d’évitement, libellés explicites, états de focus et version imprimable.
- Aucun lecteur tiers, outil de mesure d’audience ou police externe chargé par les pages. Les liens de médias et d’outils s’ouvrent sur leurs diffuseurs.
- Courriel direct à la place de FormSubmit. La page historique `merci.html` présente le contact sans prétendre qu’un message a été envoyé.
- Années conservées telles que fournies ; aucune édition 2026–2027, licence ouverte, objectif pédagogique, prérequis, affiliation ou publication inventés. Le projet de « carte vivante » sans lien disponible n’a pas été présenté comme un outil utilisable.

## Vérification et limites

`check.py` examine les fichiers et ancres locaux, les identifiants, la présence d’un titre principal, les régions, les libellés des champs et les chargements tiers. Les PDF ont été téléchargés depuis les liens existants et leur signature vérifiée ; leur contenu, accessibilité et droits n’ont pas fait l’objet d’un audit. Les éléments non datés restent indiqués comme tels.

Les contrastes des textes, liens et focus ont été calculés. La syntaxe JavaScript et les scénarios de filtrage ont été contrôlés. Aucune certification WCAG/RGAA ni validation par des utilisateurs n’est annoncée. La mise en page et le parcours clavier doivent encore être examinés dans un navigateur : l’environnement de production n’offrait pas le contrôle de navigateur requis. Le statut HTTP d’une adresse inconnue est à vérifier sur l’hébergement public choisi ; une page `404.html` est fournie.

Les rôles et dates de parcours reprennent les contenus fournis. Les informations de rôle actuel, les conditions de réutilisation, les crédits de photographie et les mentions d’hébergement sont à tenir à jour par l’auteur. Aucune licence globale n’est ajoutée aux documents.

## Sauvegarde et retour arrière

Avant une mise à jour, conserver une copie complète du projet, **y compris `dist/pdfs/` et `dist/img/`**, ou un commit Git. Reconstruire puis exécuter les contrôles avant de publier. Pour restaurer : repartir du dossier complet sauvegardé, reconstruire les pages et republier le contenu de `dist/`. Pour GitHub Pages, conserver les fichiers historiques non fournis pendant cette opération.
