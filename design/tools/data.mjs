// Données d'exemple des maquettes : pools, liens, runs, fiche URL.
// Fictives mais réalistes (domaines réels, titres et chemins inventés).
// Champs d'un lien : [titre, url, usage, type, description, vignette]
//   usage : libre | sous-conditions | payant | non-commercial | a-qualifier
//   type  : page | image | video | pdf
//   vignette : nom de scène (tools/thumbs.mjs) | null (pas d'image) | 'broken' (image cassée)
//   titre null : la page n'en a pas, l'URL le remplace.

export const LONG_TITLE =
  "Revue systématique et méta-analyse des interventions brèves de pleine conscience en milieu scolaire et universitaire : effets sur l'anxiété, la régulation émotionnelle, l'attention soutenue et le bien-être subjectif, avec analyse des modérateurs (âge, durée, format en ligne ou présentiel) sur 112 essais contrôlés publiés entre 2010 et 2025";

export const POOLS = [
  { slug: 'lora-foret-textures', label: 'LoRA — textures et ambiances de forêt', items: 412, refreshed: '30 oct. 2026, 21:14', ago: 'il y a 2 h', fresh: true,
    usage: { libre: 168, 'sous-conditions': 121, payant: 22, 'non-commercial': 37, 'a-qualifier': 64 } },
  { slug: 'psychologie-2025', label: 'Psychologie — publications marquantes 2025', items: 187, refreshed: '30 oct. 2026, 06:02', ago: 'il y a 17 h', fresh: true,
    usage: { libre: 58, 'sous-conditions': 31, payant: 49, 'non-commercial': 14, 'a-qualifier': 35 } },
  { slug: 'saint-petersbourg-insolite', label: 'Saint-Pétersbourg insolite', items: 96, refreshed: '27 oct. 2026, 18:40', ago: 'il y a 3 j', fresh: false,
    usage: { libre: 21, 'sous-conditions': 30, payant: 4, 'non-commercial': 12, 'a-qualifier': 29 } },
  { slug: 'creatures-abyssales-references', label: 'Créatures abyssales — références visuelles', items: 254, refreshed: '29 oct. 2026, 23:55', ago: 'il y a 1 j', fresh: true,
    usage: { libre: 97, 'sous-conditions': 64, payant: 18, 'non-commercial': 41, 'a-qualifier': 34 } },
  { slug: 'typographie-vernaculaire', label: 'Typographie vernaculaire et enseignes peintes', items: 133, refreshed: '24 oct. 2026, 10:12', ago: 'il y a 6 j', fresh: false,
    usage: { libre: 40, 'sous-conditions': 38, payant: 9, 'non-commercial': 20, 'a-qualifier': 26 } },
  { slug: 'archives-sonores-urbaines', label: 'Archives sonores urbaines (field recording)', items: 1000, refreshed: '30 oct. 2026, 12:30', ago: 'il y a 11 h', fresh: true,
    usage: { libre: 312, 'sous-conditions': 266, payant: 71, 'non-commercial': 158, 'a-qualifier': 193 } },
  { slug: 'brouillon-cartographie-imaginaire', label: 'Cartographie imaginaire (brouillon)', items: 0, refreshed: null, ago: 'jamais', fresh: false, usage: {} },
];

export const PSY_DOMAINS = [
  ['journals.plos.org', 22], ['frontiersin.org', 19], ['osf.io', 17], ['psycnet.apa.org', 16], ['journals.sagepub.com', 14], ['nature.com', 11], ['theconversation.com', 9], ['cambridge.org', 8],
];

export const PSYCHO = [
  ['Pré-enregistrement et puissance statistique : bilan de dix ans de réplications en psychologie sociale', 'https://osf.io/preprints/psyarxiv/7x4kq_v2', 'libre', 'page', 'Un consortium de 68 laboratoires réanalyse 412 effets classiques ; 41 % se répliquent avec une taille d’effet réduite de moitié.'],
  ['Sleep restriction and next-day emotional reactivity: a multi-site experience-sampling study', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318842', 'libre', 'page', 'Experience sampling across 9 countries links each hour of lost sleep to stronger negative affect the next day.'],
  ['La mémoire de travail se laisse-t-elle entraîner ? Une méta-analyse en réseau', 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1487720/full', 'libre', 'page', 'Transfert proche robuste, transfert lointain quasi nul : 203 études, 14 programmes d’entraînement comparés.'],
  ['Loneliness trajectories after retirement in the English Longitudinal Study of Ageing', 'https://psycnet.apa.org/record/2025-31874-001', 'payant', 'page', 'Three latent trajectories; social participation buffers the steepest decline.'],
  ['Conférence — Biais cognitifs et décision médicale (Collège de France, mars 2025)', 'https://www.youtube.com/watch?v=Qm2v7HfLx0s', 'a-qualifier', 'video', 'Captation de la leçon inaugurale, 1 h 12 min, sous-titres français.'],
  ['Smartphone use and adolescent wellbeing: specification-curve analysis of three national cohorts', 'https://www.nature.com/articles/s41562-025-02174-3', 'sous-conditions', 'page', 'Across 2.3 million specifications the median association is small and highly dependent on analytic choices.'],
  ['Prédire l’abandon thérapeutique dans les TCC en ligne', 'https://journals.sagepub.com/doi/10.1177/21677026251329044', 'payant', 'page', 'Modèle de survie sur 18 400 patients ; l’engagement de la première semaine est le meilleur prédicteur.'],
  ['Why we can’t stop scrolling — the psychology of variable rewards', 'https://theconversation.com/why-we-cant-stop-scrolling-the-psychology-of-variable-rewards-241187', 'sous-conditions', 'page', 'Vulgarisation : renforcement intermittent, boucles d’habitude et design des fils d’actualité.'],
  [LONG_TITLE, 'https://www.cambridge.org/core/journals/psychological-medicine/article/mindfulness-school-university-meta-analysis/9E1B2C0F7A', 'sous-conditions', 'page', 'Méta-analyse de 112 essais contrôlés randomisés.'],
  ['Registered Report: ego depletion revisited with a 40-lab paradigm', 'https://osf.io/w3k9d/', 'libre', 'pdf', 'PDF, 38 pages. Effet nul, intervalle de confiance étroit autour de zéro.'],
  ['Attachement adulte et usage des applications de rencontre', 'https://www.cairn.info/revue-bulletin-de-psychologie-2025-2-page-133.htm', 'payant', 'page', 'Enquête française (n = 2 140) ; l’anxiété d’attachement prédit un usage compulsif.'],
  [null, 'https://osf.io/download/6731f0c2a1b4e2001d9f42c7/', 'libre', 'pdf', null],
  ['Psychedelic-assisted therapy for treatment-resistant depression: 12-month follow-up', 'https://www.nejm.org/doi/full/10.1056/NEJMoa2412803', 'payant', 'page', 'Durability of response after two psilocybin sessions; relapse in 38 % of responders.'],
  ['Inner speech in people with aphantasia: a phenomenological survey', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0321907', 'libre', 'page', 'Participants without visual imagery still report rich inner speech.'],
  ['Méthodes mixtes en psychologie clinique : guide pratique 2025', 'https://hal.science/hal-04873316v1/document', 'libre', 'pdf', 'Document de 64 pages, licence CC BY 4.0.'],
  ['The replication crisis five years on — podcast episode 212', 'https://www.bps.org.uk/research-digest/podcast-replication-crisis-five-years', 'sous-conditions', 'page', 'Entretien avec deux éditeurs de revues sur les Registered Reports.'],
  ['Large language models as research participants? Limits of silicon samples', 'https://www.pnas.org/doi/10.1073/pnas.2501133122', 'payant', 'page', 'Simulated responses reproduce average effects but miss variance and minority patterns.'],
  ['Effets du télétravail sur la fatigue cognitive : étude longitudinale', 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1512088/full', 'libre', 'page', 'Six vagues de mesure, 1 120 salariés ; la fatigue baisse, l’isolement augmente.'],
  ['Neural correlates of awe: an fMRI study with immersive nature scenes', 'https://elifesciences.org/articles/101482', 'libre', 'page', 'Reduced default-mode activity during awe-inducing scenes.'],
  ['Trauma vicariant chez les modérateurs de contenu', 'https://www.researchgate.net/publication/389112406_Trauma_vicariant_moderateurs', 'a-qualifier', 'page', null],
  ['Why do some people never feel bored? A trait perspective', 'https://aeon.co/essays/why-do-some-people-never-feel-bored', 'non-commercial', 'page', 'Essai long format, reproduction non commerciale autorisée.'],
  ['Open dataset: 50 000 daily mood ratings with wearable sleep data', 'https://osf.io/m8fpz/', 'libre', 'page', 'Données ouvertes CC0, dictionnaire des variables inclus.'],
  ['Perfectionnisme et burnout étudiant : rôle médiateur de l’autocritique', 'https://www.cairn.info/revue-psychologie-francaise-2025-1-page-45.htm', 'payant', 'page', null],
  ['Cours — Introduction à la psychométrie bayésienne (12 vidéos)', 'https://www.youtube.com/playlist?list=PLx8u3Vb1tZ0bayes2025', 'a-qualifier', 'video', 'Série de cours, niveau master, code R fourni.'],
  ['Eye-tracking reveals how readers skim misinformation corrections', 'https://journals.sagepub.com/doi/10.1177/09567976251322710', 'payant', 'page', 'Corrections placed above the claim are read 2.4× more often.'],
  ['Santé mentale des 18-24 ans : chiffres clés 2025', 'https://www.santepubliquefrance.fr/maladies-et-traumatismes/sante-mentale/documents/2025/chiffres-cles-18-24', 'a-qualifier', 'pdf', 'Synthèse de 12 pages.'],
  ['Bilingual advantage in executive function: a registered multi-lab test', 'https://www.cambridge.org/core/journals/bilingualism-language-and-cognition/article/bilingual-advantage-multilab/4F5A0B1C2D', 'sous-conditions', 'page', 'No advantage detected across 31 labs (n = 5 970).'],
  ['Groupes de parole en ligne et rétablissement après deuil', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0319555', 'libre', 'page', 'Essai randomisé, 8 séances hebdomadaires en visioconférence.'],
  ['Moral psychology of AI blame attribution', 'https://www.nature.com/articles/s41562-025-02210-2', 'sous-conditions', 'page', 'People blame the company more than the user when an AI system errs.'],
  ['Dossier — Les écrans rendent-ils vraiment nos enfants anxieux ?', 'https://theconversation.com/les-ecrans-rendent-ils-vraiment-nos-enfants-anxieux-243310', 'sous-conditions', 'page', 'Mise au point d’une chercheuse en psychologie du développement.'],
  ['Préprint : effets placebo ouverts sur la douleur chronique', 'https://osf.io/preprints/psyarxiv/qh28a', 'libre', 'page', 'Placebo sans dissimulation, 3 semaines, douleur lombaire.'],
  ['Self-compassion interventions: an umbrella review', 'https://psycnet.apa.org/record/2025-58821-002', 'payant', 'page', 'Seven meta-analyses pooled; moderate effects on depression.'],
  ['Cognition incarnée : où en est-on en 2025 ?', 'https://www.cairn.info/revue-l-annee-psychologique-2025-3-page-301.htm', 'payant', 'page', null],
  ['Default mode network and mind-wandering in ADHD adults', 'https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1460021/full', 'libre', 'page', 'Resting-state connectivity differences, n = 412.'],
  ['Teaching statistics with simulation: an open curriculum', 'https://github.com/openpsychstats/simulation-curriculum', 'libre', 'page', 'Dépôt de cours ouvert, licence MIT et CC BY.'],
  ['Le sentiment d’imposture chez les doctorants', 'https://www.researchgate.net/publication/388450120_Sentiment_imposture_doctorants', 'a-qualifier', 'page', null],
  ['Dataset paper: cross-cultural norms for 2 000 emotional faces', 'https://www.nature.com/articles/s41597-025-04418-7', 'libre', 'page', 'Banque d’images normée dans 14 pays.'],
  ['How stress hormones shape memory consolidation (lecture)', 'https://www.youtube.com/watch?v=t0F9kPz3m8A', 'a-qualifier', 'video', 'Conférence publique, 54 min.'],
  ['Intolérance à l’incertitude et rumination : modèle de réseau', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0320014', 'libre', 'page', 'Analyse de réseau sur 3 200 adultes.'],
  ['Annual Review of Psychology — volume 76 (2025), table des matières', 'https://www.annualreviews.org/content/journals/psych/76/1', 'payant', 'page', 'Sommaire complet, 28 revues de synthèse.'],
];

export const LORA_DOMAINS = [
  ['flickr.com', 58], ['commons.wikimedia.org', 51], ['polyhaven.com', 37], ['ambientcg.com', 31], ['civitai.com', 28], ['europeana.eu', 24], ['pexels.com', 22], ['huggingface.co', 17],
];

export const LORA = [
  ['Brume matinale dans une hêtraie, contre-jour', 'https://www.flickr.com/photos/vosges_light/53810247731/', 'sous-conditions', 'image', 'CC BY-NC 2.0 — 6000×4000, Vosges, octobre.', 'forest'],
  ['Mossy forest floor 01 — PBR texture 4K', 'https://polyhaven.com/a/forest_ground_04', 'libre', 'image', 'CC0, cartes diffuse, normal, roughness et displacement.', 'moss'],
  ['Bark 012 — écorce de chêne', 'https://ambientcg.com/view?id=Bark012', 'libre', 'image', 'CC0, 8K, scan photogrammétrique.', 'bark'],
  ['Forêt primaire de Białowieża, sous-bois en été', 'https://commons.wikimedia.org/wiki/File:Bialowieza_National_Park_understory_2023.jpg', 'sous-conditions', 'image', 'CC BY-SA 4.0 — Wikimedia Commons.', 'forest2'],
  ['Dark fantasy forest LoRA (SDXL) — v3.2', 'https://civitai.com/models/412873/dark-fantasy-forest-sdxl', 'sous-conditions', 'page', 'Modèle communautaire ; licence d’usage du créateur à vérifier.', 'canopy'],
  ['Tutoriel : entraîner un LoRA de textures avec kohya_ss (2025)', 'https://www.youtube.com/watch?v=Lr9kQ2bT0xE', 'a-qualifier', 'video', 'Vidéo de 38 min : jeu de données, légendes, réglages.', 'leaves'],
  ['Fougères au sol, gros plan', 'https://www.pexels.com/photo/fern-leaves-forest-floor-18472301/', 'libre', 'image', 'Licence Pexels.', 'leaves2'],
  ['Forest canopy dataset — 2 400 drone captures', 'https://huggingface.co/datasets/geoforest/canopy-drone-2400', 'non-commercial', 'page', 'CC BY-NC 4.0, annotations par essence.', null],
  ['Lichen sur granite, Bretagne', 'https://www.flickr.com/photos/armorique_macro/53766120184/', 'non-commercial', 'image', null, 'moss2'],
  ['Gravure : La Forêt de Fontainebleau (1860)', 'https://www.europeana.eu/fr/item/9200579/forest_fontainebleau_1860', 'libre', 'image', 'Domaine public, numérisation BnF.', 'engraving'],
  [null, 'https://commons.wikimedia.org/wiki/File:Sequoia_trunk_detail_IMG_4471.jpg', 'sous-conditions', 'image', null, 'bark2'],
  ['Pine needles ground 02', 'https://polyhaven.com/a/pine_needles_ground_02', 'libre', 'image', 'CC0, 4K.', 'broken'],
  ['Forêt de mangroves au crépuscule, Guyane — série de 24 photos haute définition pour jeux de données d’entraînement, avec métadonnées EXIF complètes et autorisation écrite du photographe pour l’usage en apprentissage automatique', 'https://www.flickr.com/photos/amazonie_terrain/albums/72177720312345678', 'sous-conditions', 'image', 'Album de 24 photos.', 'swamp'],
  ['Stock photo: misty pine forest aerial', 'https://www.shutterstock.com/image-photo/misty-pine-forest-aerial-2493318821', 'payant', 'image', 'Licence standard payante.', 'forest3'],
  ['Moss 004 — mousse humide', 'https://ambientcg.com/view?id=Moss004', 'libre', 'image', 'CC0, 4K.', 'moss3'],
  ['Champignons bioluminescents (Mycena), nuit', 'https://commons.wikimedia.org/wiki/File:Mycena_chlorophos_bioluminescence.jpg', 'sous-conditions', 'image', 'CC BY-SA 3.0.', 'glow'],
  ['Concept art — forêt engloutie', 'https://www.artstation.com/artwork/forest-sunken-ruins', 'non-commercial', 'image', 'Œuvre d’artiste : référence uniquement.', 'ruins'],
  ['Leaf litter autumn 01', 'https://polyhaven.com/a/leaf_litter_autumn_01', 'libre', 'image', 'CC0.', 'autumn'],
  ['Reddit r/StableDiffusion — mes réglages pour des troncs réalistes', 'https://www.reddit.com/r/StableDiffusion/comments/1g7x2kq/realistic_tree_trunks_settings/', 'a-qualifier', 'page', null, null],
  ['Roots 03 — racines apparentes', 'https://ambientcg.com/view?id=Roots003', 'libre', 'image', 'CC0.', 'roots'],
  ['Forest LoRA training notes (PDF)', 'https://arxiv.org/pdf/2503.11872', 'libre', 'pdf', 'Rapport technique, 19 pages.', null],
  ['Sentier forestier sous la pluie', 'https://www.pexels.com/photo/forest-path-rain-19920442/', 'libre', 'image', null, 'rain'],
  ['Herbier numérisé — feuilles de chêne (1890)', 'https://www.europeana.eu/fr/item/2048128/herbarium_quercus_1890', 'sous-conditions', 'image', 'CC BY 4.0, Muséum.', 'herbarium'],
  ['Textures écorce premium — pack 120', 'https://www.textures.com/browse/bark/1240', 'payant', 'image', 'Abonnement requis.', 'bark3'],
  ['Old growth forest Olympic NP', 'https://www.flickr.com/photos/pnw_wild/53901133702/', 'sous-conditions', 'image', 'CC BY 2.0.', 'forest4'],
  ['kohya-ss/sd-scripts — scripts d’entraînement LoRA', 'https://github.com/kohya-ss/sd-scripts', 'libre', 'page', 'Apache-2.0.', null],
  ['Moss covered stones river', 'https://commons.wikimedia.org/wiki/File:Moss_covered_stones_river.jpg', 'libre', 'image', 'Domaine public.', 'river'],
  ['Forest fog HDRI 4K', 'https://polyhaven.com/a/forest_fog', 'libre', 'image', 'CC0, HDRI 16K disponible.', 'fog'],
  ['Timelapse : une forêt en automne (4K)', 'https://vimeo.com/912334871', 'a-qualifier', 'video', null, 'autumn2'],
  ['Écorce de bouleau, macro', 'https://www.flickr.com/photos/taiga_macro/53720019944/', 'non-commercial', 'image', 'CC BY-NC-SA 2.0.', 'birch'],
];

export const SPB_DOMAINS = [
  ['commons.wikimedia.org', 18], ['pastvu.com', 11], ['atlasobscura.com', 9], ['ru.wikipedia.org', 8], ['culture.ru', 7], ['youtube.com', 6], ['flickr.com', 6], ['hermitagemuseum.org', 4],
];

export const SPB = [
  ['Le Musée de l’eau (tour du Vodokanal) et ses galeries souterraines', 'https://www.atlasobscura.com/places/universe-of-water-museum', 'a-qualifier', 'page', 'Ancienne tour d’eau de 1863 transformée en musée immersif.', 'tower'],
  ['Cour-puits de la rue Pravdy, vue zénithale', 'https://commons.wikimedia.org/wiki/File:Courtyard_well_Pravdy_street_SPb.jpg', 'sous-conditions', 'image', 'CC BY-SA 4.0.', 'courtyard'],
  ['Le chat Elisseï de la rue Malaïa Sadovaïa', 'https://ru.wikipedia.org/wiki/Кот_Елисей_и_кошка_Василиса', 'sous-conditions', 'page', 'Petites sculptures en bronze posées sur les corniches.', 'cat'],
  ['Photographies anciennes : canal Griboïedov, 1912', 'https://pastvu.com/p/1347290', 'non-commercial', 'image', 'Archive collaborative, usage non commercial.', 'canal_old'],
  ['Le Kunstkamera et son cabinet des curiosités', 'https://www.kunstkamera.ru/en/', 'a-qualifier', 'page', null, 'museum'],
  ['Visite des toits de Saint-Pétersbourg (vidéo)', 'https://www.youtube.com/watch?v=Jx8rP2nV6kA', 'a-qualifier', 'video', 'Promenade filmée, 17 min.', 'roofs'],
  ['Stations de métro les plus profondes du monde : Admiralteïskaïa', 'https://www.atlasobscura.com/places/admiralteyskaya-station', 'a-qualifier', 'page', '86 m sous la surface.', 'metro'],
  ['Maison Singer, coupole de verre, nuit blanche', 'https://www.flickr.com/photos/nevsky_nights/53640112290/', 'sous-conditions', 'image', 'CC BY 2.0.', 'dome'],
  ['Île Nouvelle-Hollande : arche et bassin', 'https://commons.wikimedia.org/wiki/File:New_Holland_arch_SPb.jpg', 'libre', 'image', 'Domaine public.', 'arch'],
  [null, 'https://pastvu.com/p/1092215', 'non-commercial', 'image', null, 'broken'],
  ['Le Jardin d’été en hiver : statues sous leurs boîtes de bois', 'https://commons.wikimedia.org/wiki/File:Summer_Garden_statues_winter_boxes.jpg', 'sous-conditions', 'image', 'CC BY-SA 3.0.', 'garden'],
  ['Musée de la pharmacie du Dr Pel et sa tour aux griffons, l’une des adresses les plus mystérieuses de l’île Vassilievski, entourée de légendes alchimiques et de rumeurs d’expériences nocturnes', 'https://www.culture.ru/institutes/38211/apteka-pelya', 'a-qualifier', 'page', 'Pharmacie du XIXᵉ siècle, cour avec tour en brique.', null],
  ['Ermitage : les chats gardiens du musée', 'https://www.hermitagemuseum.org/wps/portal/hermitage/news/news-item/news/2025/cats', 'sous-conditions', 'page', 'Une soixantaine de chats vivent dans les sous-sols.', 'cat2'],
  ['Église de la Résurrection, mosaïques intérieures', 'https://commons.wikimedia.org/wiki/File:Spas_na_krovi_interior_mosaic.jpg', 'libre', 'image', null, 'mosaic'],
  ['Ponts levants de la Neva : horaires 2026', 'https://www.spb.ru/razvodka-mostov/', 'a-qualifier', 'page', 'Calendrier d’ouverture d’avril à novembre.', null],
  ['Fort Constantin et forts de Kronstadt', 'https://ru.wikipedia.org/wiki/Форт_Константин', 'sous-conditions', 'page', null, 'fort'],
  ['Ancienne usine Krasny Treugolnik, friches', 'https://www.flickr.com/photos/urbex_neva/53588100123/', 'non-commercial', 'image', 'CC BY-NC 2.0.', 'factory'],
  ['Le Loft Etagi : ancienne boulangerie reconvertie', 'https://www.tripadvisor.fr/Attraction_Review-g298507-d4547718-Loft_Project_Etagi', 'payant', 'page', 'Avis et photos d’utilisateurs.', 'loft'],
  ['Cartes postales de Petrograd, 1915-1917', 'https://www.europeana.eu/fr/item/2021672/petrograd_postcards_1915', 'libre', 'image', 'Domaine public.', 'postcard'],
  ['Galerie Pouchkinskaïa 10 : art non conformiste', 'https://www.culture.ru/institutes/10432/pushkinskaya-10', 'a-qualifier', 'page', null, null],
  ['Nuits blanches sur le canal de la Moïka', 'https://commons.wikimedia.org/wiki/File:Moika_white_nights.jpg', 'sous-conditions', 'image', 'CC BY-SA 4.0.', 'canal'],
  ['Brise-glaces musées : le Krassine', 'https://www.youtube.com/watch?v=c6bS1kH9WnQ', 'a-qualifier', 'video', 'Visite guidée, 23 min.', 'ship'],
];

export const RUNS = [
  [4821, 'cycle', 'running', '30/10/2026 23:30', '—', '{"step":"media","done":182,"of":640}'],
  [4820, 'media', 'ok', '30/10/2026 23:02', '4 min', '{"thumbs":418,"favicons":37,"skipped":12,"bytes":"10,4 Mo"}'],
  [4819, 'discover', 'failed', '30/10/2026 22:47', '41 s', 'HTTP 429 Too Many Requests — flickr.com (3 tentatives, reprise à 23:47)'],
  [4818, 'classify', 'ok', '30/10/2026 22:30', '6 min', '{"classified":612,"themes":1408,"low_confidence":37}'],
  [4817, 'normalize', 'ok', '30/10/2026 22:18', '9 min', '{"fetched":640,"redirects":88,"errors":14}'],
  [4816, 'materialize', 'ok', '30/10/2026 21:14', '12,8 s', '{"pools":6,"items":2083,"changed":["lora-foret-textures","psychologie-2025"]}'],
  [4815, 'ingest', 'ok', '30/10/2026 21:02', '2 min', '{"providers":["brave","flickr","europeana"],"new_urls":231,"duplicates":57}'],
  [4814, 'discover', 'ok', '30/10/2026 20:45', '3 min', '{"queries":24,"exhausted":3,"results":1840}'],
  [4813, 'media', 'failed', '30/10/2026 18:02', '1 min', 'ENOSPC: plus d’espace disque dans var/media (quota 2 Go atteint)'],
  [4812, 'classify', 'ok', '30/10/2026 17:30', '5 min', '{"classified":498,"themes":1122,"low_confidence":22}'],
  [4811, 'normalize', 'warn', '30/10/2026 17:14', '11 min', '{"fetched":702,"errors":96,"note":"taux d’erreur 13,7 %"}'],
  [4810, 'cycle', 'ok', '30/10/2026 12:00', '38 min', '{"steps":6,"new_urls":412,"pools_changed":3}'],
];
