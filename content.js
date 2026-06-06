/* ============================================================
   content.js — OdyssIA · DONNÉES & CONFIG (aucune dépendance)
   Expose : window.ODYSSIA_CONTENT, window.VARK, window.MATHS_MODES, window.SUBJECTS
   ============================================================ */
(function (root) {
  "use strict";

  const VARK = {
    visuel:        { letter:"V", label:"Visuel",        accent:"#ff9f1c", icon:"visibility", title:"L'Œil du Calcul",      desc:"QCM avec un schéma à observer.", maxXP:30 },
    auditif:       { letter:"A", label:"Auditif",       accent:"#2ec4b6", icon:"hearing",    title:"L'Oreille des Nombres", desc:"Écoute l'énoncé, puis réponds.", maxXP:30 },
    lire:          { letter:"R", label:"Lire / Écrire", accent:"#e71d36", icon:"menu_book",  title:"Le Grimoire des Maths", desc:"Texte à trous et définitions.", maxXP:30 },
    kinesthesique: { letter:"K", label:"Kinesthésique", accent:"#4343d5", icon:"drag_pan",   title:"La Main Agile",         desc:"Glisse-dépose pour ranger.", maxXP:40 },
  };
  const MATHS_MODES = ["visuel","auditif","lire","kinesthesique"];

  const SUBJECTS = {
    maths:    { name:"Tour des étoiles", matiere:"Maths",        color:"#9b51e0", icon:"calculate",    playable:true,  pos:{x:15, y:34} },
    histgeo:  { name:"Château",          matiere:"Hist-Géo",     color:"#f2994a", icon:"castle",       playable:false, pos:{x:39, y:24} },
    svt:      { name:"Forêt",            matiere:"SVT",          color:"#27ae60", icon:"park",         playable:false, pos:{x:64, y:27} },
    pc:       { name:"Labo",             matiere:"Phys-Chimie",  color:"#00b4d8", icon:"science",      playable:false, pos:{x:86, y:37} },
    francais: { name:"Bibliothèque",     matiere:"Français",     color:"#4361ee", icon:"auto_stories", playable:false, pos:{x:29, y:66} },
    langues:  { name:"Taverne",          matiere:"Langues",      color:"#ef476f", icon:"translate",    playable:false, pos:{x:55, y:69} },
    techno:   { name:"Atelier",          matiere:"Techno",       color:"#4a4e69", icon:"build",        playable:false, pos:{x:81, y:63} },
  };

  const ODYSSIA_CONTENT = {
    varkQuiz: [
      { q:"Pour réviser une nouvelle leçon, tu préfères…", options:[
        { text:"Regarder un schéma, un dessin ou une vidéo qui explique.", vark:"visuel" },
        { text:"Écouter quelqu'un l'expliquer ou te la lire à voix haute.", vark:"auditif" },
        { text:"Lire ton cours et recopier l'essentiel dans un cahier.", vark:"lire" },
        { text:"Manipuler des objets ou refaire l'exercice toi-même.", vark:"kinesthesique" } ] },
      { q:"Quand tu veux retrouver le chemin vers un endroit, tu préfères…", options:[
        { text:"Regarder une carte ou un plan avec des couleurs.", vark:"visuel" },
        { text:"Qu'on t'explique le trajet à voix haute.", vark:"auditif" },
        { text:"Lire les indications écrites étape par étape.", vark:"lire" },
        { text:"Y aller une fois pour mémoriser en marchant.", vark:"kinesthesique" } ] },
      { q:"Pour apprendre une poésie par cœur, tu…", options:[
        { text:"Imagines des images dans ta tête pour chaque vers.", vark:"visuel" },
        { text:"La répètes à voix haute plusieurs fois.", vark:"auditif" },
        { text:"La recopies en entier sur une feuille.", vark:"lire" },
        { text:"Marches ou bouges en la récitant.", vark:"kinesthesique" } ] },
      { q:"Pendant un cours, ce qui t'aide le plus à comprendre, c'est…", options:[
        { text:"Les schémas et les couleurs au tableau.", vark:"visuel" },
        { text:"Les explications du professeur que tu écoutes.", vark:"auditif" },
        { text:"Le texte de la leçon que tu lis dans ton manuel.", vark:"lire" },
        { text:"Les expériences ou les exercices à faire avec les mains.", vark:"kinesthesique" } ] },
      { q:"Pour montrer à un copain comment faire un exercice, tu…", options:[
        { text:"Lui dessines un schéma clair.", vark:"visuel" },
        { text:"Lui expliques en parlant.", vark:"auditif" },
        { text:"Lui écris les étapes sur une feuille.", vark:"lire" },
        { text:"Le fais avec lui, geste par geste.", vark:"kinesthesique" } ] }
    ],
    maths: {
      visuel: [
        { schemaType:"fraction", schemaData:{num:3,den:4}, q:"Quelle fraction est représentée par la partie coloriée ?", options:["3/4","1/4","4/3","3/7"], answer:0, explain:"3 parts coloriées sur 4 parts égales : c'est 3/4." },
        { schemaType:"fraction", schemaData:{num:2,den:5}, q:"Quelle fraction est représentée par la partie coloriée ?", options:["5/2","2/5","2/3","3/5"], answer:1, explain:"2 parts coloriées sur 5 parts égales : c'est 2/5." },
        { schemaType:"shape", schemaData:{kind:"rectangle",w:6,h:3,labels:{top:"6 cm",side:"3 cm"}}, q:"Quel est le périmètre de ce rectangle ?", options:["9 cm","18 cm","12 cm","24 cm"], answer:1, explain:"Périmètre = 2 × (longueur + largeur) = 2 × (6 + 3) = 18 cm." },
        { schemaType:"shape", schemaData:{kind:"carre",w:4,h:4,labels:{top:"4 cm",side:"4 cm"}}, q:"Quelle est l'aire de ce carré ?", options:["8 cm²","12 cm²","16 cm²","4 cm²"], answer:2, explain:"Aire du carré = côté × côté = 4 × 4 = 16 cm²." },
        { schemaType:"angle", schemaData:{degrees:90}, q:"Comment s'appelle cet angle ?", options:["Angle aigu","Angle droit","Angle obtus","Angle plat"], answer:1, explain:"Un angle qui mesure 90° est un angle droit." },
        { schemaType:"angle", schemaData:{degrees:40}, q:"Comment s'appelle cet angle ?", options:["Angle aigu","Angle droit","Angle obtus","Angle plat"], answer:0, explain:"Un angle plus petit que 90° (ici 40°) est un angle aigu." },
        { schemaType:"numberline", schemaData:{min:0,max:10,point:7}, q:"Quel nombre est marqué par le point sur la droite graduée ?", options:["6","7","8","70"], answer:1, explain:"Le point est sur la 7e graduation : c'est le nombre 7." },
        { schemaType:"numberline", schemaData:{min:0,max:2,point:1.5}, q:"Quel nombre décimal est marqué par le point ?", options:["0,5","1","1,5","2"], answer:2, explain:"Le point est entre 1 et 2, à la moitié : c'est 1,5." }
      ],
      auditif: [
        { speak:"Lucas achète trois cahiers à deux euros chacun. Combien paie-t-il en tout ?", q:"Trois cahiers à 2 € chacun : combien Lucas paie-t-il ?", options:["5 €","6 €","8 €","9 €"], answer:1, explain:"3 × 2 = 6, donc Lucas paie 6 €." },
        { speak:"Calcule de tête : quarante-cinq plus trente-sept.", q:"Combien font 45 + 37 ?", options:["72","82","78","92"], answer:1, explain:"45 + 37 = 82." },
        { speak:"Une bouteille contient un litre et demi de jus. Combien cela fait-il en millilitres ?", q:"1,5 litre, c'est combien de millilitres ?", options:["150 mL","15 mL","1500 mL","15000 mL"], answer:2, explain:"1 litre = 1000 mL, donc 1,5 L = 1500 mL." },
        { speak:"Quel est le double du nombre douze virgule cinq ?", q:"Quel est le double de 12,5 ?", options:["24","25","24,5","25,5"], answer:1, explain:"Le double de 12,5 est 12,5 × 2 = 25." },
        { speak:"Un film commence à quatorze heures et dure une heure trente. À quelle heure se termine-t-il ?", q:"Le film commence à 14 h et dure 1 h 30 : à quelle heure finit-il ?", options:["15 h","15 h 30","16 h","16 h 30"], answer:1, explain:"14 h + 1 h 30 = 15 h 30." }
      ],
      lire: [
        { text:"Le périmètre d'un carré de côté 5 cm est égal à ___ cm.", options:["20","25","10","15"], answer:0, explain:"Périmètre du carré = 4 × côté = 4 × 5 = 20 cm." },
        { text:"Dans la fraction 3/4, le nombre du bas (4) s'appelle le ___.", options:["numérateur","dénominateur","quotient","diviseur"], answer:1, explain:"Le nombre du bas d'une fraction est le dénominateur." },
        { text:"Une figure possède un axe de symétrie quand on peut la plier en deux parties qui se ___.", options:["superposent","additionnent","soustraient","multiplient"], answer:0, explain:"Par une symétrie axiale, les deux parties se superposent exactement." },
        { text:"L'aire d'un rectangle se calcule en faisant longueur ___ largeur.", options:["plus","moins","fois","divisé par"], answer:2, explain:"Aire du rectangle = longueur × largeur." },
        { text:"Un nombre qui est dans la table de 5 (comme 10, 15, 20) est un ___ de 5.", options:["diviseur","multiple","carré","double"], answer:1, explain:"10, 15 et 20 sont des multiples de 5 car ils sont dans la table de 5." }
      ],
      kinesthesique: {
        instruction:"Range les fractions dans l'ordre croissant (la plus petite en haut).",
        items:[ {display:"1/2",value:0.5},{display:"3/4",value:0.75},{display:"1/4",value:0.25},{display:"2/3",value:0.6667},{display:"1/3",value:0.3333},{display:"5/6",value:0.8333} ]
      }
    },
    frises: {
      maths:{ subject:"Mathématiques", building:"Tour des étoiles", items:[
        {titre:"Nombres entiers et décimaux",desc:"Lire, écrire, comparer et ranger les nombres décimaux."},
        {titre:"Les quatre opérations",desc:"Addition, soustraction, multiplication et division."},
        {titre:"Fractions",desc:"Comprendre et utiliser les fractions simples du quotidien."},
        {titre:"Grandeurs et mesures",desc:"Longueurs, durées, périmètres et aires."},
        {titre:"Géométrie",desc:"Droites, angles, cercles et figures usuelles."},
        {titre:"Symétrie axiale",desc:"Reconnaître et construire l'image d'une figure par symétrie."} ] },
      histgeo:{ subject:"Histoire-Géographie", building:"Château", items:[
        {titre:"La Préhistoire",desc:"Les premiers humains, le feu et les débuts de l'agriculture."},
        {titre:"Premiers États et écritures",desc:"La Mésopotamie et l'Égypte des pharaons."},
        {titre:"La Grèce antique",desc:"Cités grecques, mythes, Athènes et la démocratie."},
        {titre:"Rome",desc:"De la fondation de Rome à l'Empire romain."},
        {titre:"Judaïsme et christianisme",desc:"Premières grandes religions de la Méditerranée."},
        {titre:"Habiter la Terre",desc:"Où et comment vivent les hommes sur la planète."} ] },
      svt:{ subject:"Sciences de la Vie et de la Terre", building:"Forêt", items:[
        {titre:"L'environnement proche",desc:"Observer le peuplement d'un milieu au fil des saisons."},
        {titre:"Le vivant et sa diversité",desc:"Classer les êtres vivants et reconnaître les espèces."},
        {titre:"L'alimentation",desc:"Besoins alimentaires et origine de ce que nous mangeons."},
        {titre:"Le sol et le recyclage",desc:"Décomposeurs et transformation de la matière organique."},
        {titre:"La vie des végétaux",desc:"Lumière, eau et croissance des plantes."} ] },
      pc:{ subject:"Physique-Chimie", building:"Labo", items:[
        {titre:"Les états de la matière",desc:"Solide, liquide et gaz, et leurs changements d'état."},
        {titre:"L'eau dans tous ses états",desc:"Fusion, solidification, ébullition et cycle de l'eau."},
        {titre:"Mélanges et solutions",desc:"Mélanges, dissolution et techniques de séparation."},
        {titre:"Les circuits électriques",desc:"Pile, lampe, interrupteur et circuit qui fonctionne."},
        {titre:"Lumières et ombres",desc:"Sources de lumière, propagation et formation des ombres."} ] },
      francais:{ subject:"Français", building:"Bibliothèque", items:[
        {titre:"Récits de création et mythes",desc:"Découvrir comment les peuples expliquaient le monde."},
        {titre:"Contes et récits merveilleux",desc:"Lire des contes et leur structure."},
        {titre:"Fables et morales",desc:"Les fables, notamment celles de Jean de La Fontaine."},
        {titre:"L'Odyssée d'Homère",desc:"Suivre le long voyage de retour d'Ulysse."},
        {titre:"Récits d'aventures",desc:"Héros, péripéties et grands voyages."},
        {titre:"Grammaire et écriture",desc:"Classes de mots, conjugaison et rédaction."} ] },
      langues:{ subject:"Langues vivantes", building:"Taverne", items:[
        {titre:"Se présenter",desc:"Dire son nom, son âge et d'où l'on vient."},
        {titre:"La famille et les amis",desc:"Parler des personnes proches et les décrire."},
        {titre:"L'école et le quotidien",desc:"Décrire sa journée, les matières et les horaires."},
        {titre:"Les goûts et les loisirs",desc:"Exprimer ce que l'on aime et ce que l'on n'aime pas."},
        {titre:"Culture et fêtes",desc:"Découvrir les traditions des pays de la langue étudiée."} ] },
      techno:{ subject:"Technologie", building:"Atelier", items:[
        {titre:"Les objets techniques",desc:"À quoi sert un objet et comment il est fait."},
        {titre:"Besoins et fonctions",desc:"Identifier le besoin auquel répond un objet."},
        {titre:"Matériaux",desc:"Reconnaître et choisir les matériaux d'un objet."},
        {titre:"Les moyens de transport",desc:"Étudier l'évolution des objets qui nous déplacent."},
        {titre:"Initiation à la programmation",desc:"Donner des instructions simples à une machine."} ] }
    }
  };

  root.VARK = VARK;
  root.MATHS_MODES = MATHS_MODES;
  root.SUBJECTS = SUBJECTS;
  root.ODYSSIA_CONTENT = ODYSSIA_CONTENT;
})(window);
