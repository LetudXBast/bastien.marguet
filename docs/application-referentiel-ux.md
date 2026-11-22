# Application du référentiel UX

Référentiel utilisé : « Site personnel d’un enseignant aux activités multiples », version du 13 octobre 2026. Cette note distingue les changements réalisés, les choix conservés et les vérifications restant à faire.

## Inventaire et correspondance

Le périmètre principal comprend 24 pages générées, 13 enseignements, 47 ressources, 5 publications, 8 interventions, 6 capsules de médias et 2 vidéos pédagogiques locales.

| Contenu avant l’ajustement | Destination conservée |
| --- | --- |
| Présentation, accès aux formations, cognition, rôle d’ambassadeur | `index.html` |
| Formations et listes d’enseignements | `enseignements.html` |
| Polycopiés, TD, annales et corrigés d’un enseignement | Page correspondante dans `enseignements/` |
| Catalogue commun des 47 ressources | `resources.html` |
| Articles et manuscrit de thèse | `publications.html` |
| Interventions datées, approche de l’IA, vidéos et podcasts | `interventions.html` |
| Biographie, DU Neuroéducation, responsabilités, recherche et parcours | `a-propos.html` |
| Formulaire de contact | `contact.html` |
| Vidéos pédagogiques, jeu et simulateurs | `outils.html` |
| Informations, retour du formulaire et page introuvable | `informations.html`, `merci.html`, `404.html` |
| Présentations historiques, questionnaire doctoral, spectacle | Fichiers et adresses conservés |
| Anciennes ancres de l’accueil et de la bibliothèque | Points de reprise conservés |
| Ancien poly OM1 et anciens chemins des TD | Copies de compatibilité synchronisées depuis les fichiers canoniques |

Aucune ressource du catalogue n’a été supprimée. Les fichiers canoniques et leurs métadonnées restent dans une source commune. Les trois copies de compatibilité répondent à la contrainte de l’hébergement statique : une ancienne adresse PDF ne peut pas être redirigée par un fichier HTML. Elles sont reconstruites, et ne constituent pas des éditions indépendantes à maintenir.

## Décisions appliquées

- Navigation principale : Accueil, Enseignements, Ressources, Publications, Interventions, À propos, Contact. L’accès au catalogue est désormais explicite sur toutes les pages principales.
- Accueil : accès prioritaire aux ressources, portrait entier et images adaptées à la résolution d’affichage.
- Mobile : bouton Menu, état d’ouverture annoncé, fermeture avec Échap et retour du focus au bouton. Sans JavaScript, la navigation reste visible.
- Bibliothèque : recherche limitée aux titres et métadonnées, filtres par niveau, année scolaire et type, tri explicite et pagination de 20 documents. La sélection et la page sont conservées dans l’URL. Les filtres secondaires sont repliables sur mobile et leur nombre actif est indiqué.
- Recherche vide : message concret et bouton pour effacer les filtres. Le tri n’est jamais présenté comme un classement de pertinence.
- Contact : nom facultatif, adresse de réponse et message obligatoires, libellés persistants, erreurs près des champs et saisie conservée. Le POST FormSubmit existant est conservé. La page de retour n’affiche pas de confirmation d’envoi inventée.
- Médias : lecteurs et podcasts conservés, liens directs de secours sous les vidéos, chargement différé des lecteurs secondaires et préchargement désactivé pour les vidéos locales.
- Liens externes : nouvel onglet conservé conformément à la demande explicite de l’auteur, avec un signe visible et une description accessible du comportement.

## Choix conservés et règles non applicables

L’arborescence du document est une proposition conditionnelle. Les publications conservent leur rubrique propre. Aucune rubrique entrepreneuriale n’est créée à partir de présentations non référencées dans les parcours publics. La vision de l’éducation reste hors de la navigation.

Les textes concernant l’auteur restent à la première personne. Les années des documents pédagogiques restent des années scolaires. L’adresse e-mail personnelle n’est pas affichée dans les pages. Les formes sobres, le portrait sans recadrage et la grille de médias à trois colonnes sur grand écran sont conservés.

Il n’y a ni fenêtre modale, ni carrousel, ni thème sombre, ni suivi de fréquentation à ajouter ou auditer dans ces gabarits. Les liens essentiels restent disponibles sans JavaScript ; aucune nouvelle dépendance n’a été installée.

## Vérifications réalisées

- Contrôle des 24 pages générées et de 714 références locales : fichiers, ancres, identifiants, navigation, libellés, descriptions accessibles et annonces des liens externes.
- Signatures des PDF référencés et égalité des trois fichiers de compatibilité avec leurs sources.
- Syntaxe JavaScript et absence d’erreurs de mise en forme dans les différences Git.
- Dans Edge, via un serveur HTTP local reproduisant le sous-dossier `/bastien.marguet/` : 24 pages à 320, 390, 768 et 1280 pixels CSS, sans débordement général.
- Réglages d’espacement renforcés sur les gabarits accueil, ressources, cours, interventions et contact, aux quatre largeurs.
- Ouverture du menu mobile, fermeture avec Échap et focus de retour ; structure présente dans l’arbre d’accessibilité du navigateur.
- Recherche de statistiques, année 2026-2027, absence de résultat, tri par année, deuxième page, URL partagée et retour par le navigateur.
- Panneau de filtres ouvert et fermé, indication des critères actifs et filtrage, aux quatre largeurs.
- Formulaire : erreur d’adresse, maintien du message saisi, focus sur le champ invalide, validation d’une saisie correcte. Une interception de test a empêché tout envoi réel.
- Sans JavaScript : navigation visible, totalité du catalogue accessible et validation native du formulaire.

### Contrastes calculés

| Usage | Premier plan / fond | Rapport |
| --- | --- | --- |
| Texte principal | `#18232e` / `#f8fafc` | 15,22:1 |
| Texte secondaire | `#465564` / `#f8fafc` | 7,32:1 |
| Liens | `#145a75` / `#f8fafc` | 7,30:1 |
| Bouton principal | `#ffffff` / `#145a75` | 7,64:1 |
| Focus | `#8a4300` / `#ffffff` | 7,28:1 |
| Erreurs | `#932c32` / `#fff1f1` | 7,22:1 |

Ces calculs concernent les couleurs de base, pas un audit exhaustif de tous les états et contenus.

### Optimisation mesurée des fichiers

Le portrait d’origine est conservé (181 389 octets). Les variantes complètes, sans recadrage, pèsent 12 090 octets à 320 pixels, 33 169 octets à 640 pixels et 65 074 octets à 960 pixels. Le navigateur choisit la variante adaptée avec `srcset` et `sizes`.

## Limites de validation

Aucun test d’usage avec des visiteurs représentatifs, audit complet avec lecteur d’écran, test avec clavier virtuel, examen sur plusieurs moteurs de navigateur ou mesure de terrain des Core Web Vitals n’a été réalisé. Les tests de largeur et d’espacement ne remplacent pas un audit de zoom et de réagencement exhaustif.

Les contrastes, la sémantique et les scénarios contrôlés ne constituent pas une certification WCAG ou RGAA. Les PDF, les sous-titres, les transcriptions et les alternatives de tous les médias n’ont pas été audités. Le site indique comment demander une alternative par le formulaire.

La réception d’un message par FormSubmit n’a pas été testée : aucun message réel n’a été envoyé. Une validation de bout en bout devra être effectuée avec l’accord de l’auteur. Aucune disponibilité ni aucun délai de réponse n’est annoncé.

Les références externes peuvent évoluer. Leurs liens et leurs conditions restent à vérifier périodiquement.
