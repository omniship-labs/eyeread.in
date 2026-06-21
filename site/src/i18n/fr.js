/* eyeread.in · marketing site — French (fr). Mirrors en.js. */

export default {
  meta: {
    title: 'eyeread.in — Regardez l’objectif.',
    description:
      'Téléprompteur open source. Fait flotter votre script sur n’importe quel écran, invisible pour tout enregistreur. Suivi vocal intégré. Gratuit.',
  },

  nav: {
    cta: 'Télécharger gratuitement',
    githubLabel: 'GitHub',
  },

  hero: {
    eyebrow: 'Invisible au partage d’écran',
    star: 'Star sur GitHub',
    headline: ['Regardez l’objectif.', { emphasis: 'Pas vos notes.' }],
    subhead:
      'eyeread.in fait flotter votre script sur n’importe quel écran sous forme de calque en verre. Il suit votre voix — et n’apparaît jamais dans un enregistrement.',
    note: 'Gratuit pour toujours · AGPL-3.0 · Aucun compte requis',
    primaryCta: 'Télécharger pour macOS et Windows',
    secondaryCta: 'Voir sur GitHub',
  },

  demo: {
    cameraBadge: 'Caméra · eyeread.in masqué de l’enregistrement',
    invisibleBadge: 'Masqué de tous les logiciels de partage d’écran',
    slide: {
      eyebrow: 'Réunion plénière T3 · Acme Corp',
      heading: ['Bâtir pour les', 'dix prochaines années'],
    },
    overlay: {
      timer: '01:24',
      tag: 'Invisible',
      spoken: 'Nous avons une équipe incroyable et une ',
      active: 'feuille de route',
      upcoming:
        ' claire — ce qu’il nous faut maintenant, c’est de la concentration, pas seulement de la vitesse. Laissons les résultats parler.',
    },
  },

  features: {
    eyebrow: 'Ce qui fait la différence',
    heading: 'Conçu pour la façon dont les gens présentent vraiment.',
    items: [
      {
        title: 'Invisible pour tous les enregistreurs',
        body: 'eyeread.in s’affiche hors du cadre capturé. Zoom, Loom, OBS, QuickTime — aucun ne le voit. Votre public ne voit que le contenu.',
        tag: 'Sûr en partage d’écran',
      },
      {
        title: 'Suivi vocal',
        body: 'Parlez, et le script suit. Le mot en cours s’illumine. Ce que vous avez dit s’estompe. Aucun clic, aucune pédale — parlez, c’est tout.',
        tag: 'Défilement auto',
      },
      {
        title: 'Près de la caméra',
        body: 'Le calque s’ancre juste sous votre webcam. Votre regard se pose naturellement sur l’objectif — pas dans un coin de l’écran. Vous paraissez présent.',
        tag: 'Contact visuel',
      },
    ],
  },

  how: {
    eyebrow: 'Comment ça marche',
    heading: 'Ouvrez-le. Collez votre script. Parlez.',
    steps: [
      {
        title: 'Collez ou tapez votre script',
        body: 'Mettez-y n’importe quoi — un discours, un script YouTube, des points clés, des réponses d’entretien. eyeread.in fonctionne avec du texte brut.',
      },
      {
        title: 'Positionnez le calque',
        body: 'Faites-le glisser près de votre caméra. Ajustez la taille de police, l’opacité et la vitesse. Il flotte au-dessus de toutes les autres fenêtres.',
      },
      {
        title: 'Commencez à parler',
        body: 'La détection vocale prend le relais. Le mot actif est mis en évidence. Le texte défile pendant que vous parlez. Lancez l’enregistrement quand vous êtes prêt.',
      },
    ],
    preview: {
      header: 'Suivi vocal actif · 00:42',
      spoken: 'Merci à tous d’être présents aujourd’hui. Je veux parler de quelque chose qui ',
      active: 'compte',
      upcoming:
        ' plus que n’importe quel chiffre trimestriel — les gens que nous servons et la confiance qu’ils nous accordent.',
      caption: '↑ Le calque — vous seul pouvez le voir',
    },
  },

  oss: {
    heading: 'Gratuit, open source, et honnête à ce sujet.',
    body: 'eyeread.in est entièrement open source. Lisez le code, auditez-le, forkez-le, contribuez. Aucun pistage, aucune télémétrie, aucun abonnement. S’il vous aide — faites un don volontaire.',
    guarantees: [
      {
        title: 'Aucun compte requis',
        body: 'Téléchargez et utilisez immédiatement — sans inscription, sans e-mail',
      },
      {
        title: 'Aucune télémétrie',
        body: 'Rien ne quitte votre machine. Vos scripts restent privés.',
      },
      {
        title: 'macOS et Windows · app native',
        body: 'Invisibilité garantie par l’OS sur macOS et Windows. Linux est expérimental.',
      },
      {
        title: 'Soutenu par les dons',
        body: 'Si eyeread.in vous aide, transmettez — sans pression',
      },
    ],
  },

  compat: {
    eyebrow: 'Vérifié par la communauté',
    heading: 'Quelles versions sont prises en charge — et qui l’a confirmé',
    subhead:
      'macOS et Windows offrent une invisibilité garantie par l’OS ; Linux est au mieux-effort et dépend de votre compositeur. Voici ce que les testeurs ont vérifié sur chacun — ajoutez le vôtre.',
    cols: {
      version: 'Version de l’OS',
      environment: 'Environnement',
      result: 'Partage d’écran',
      verifiedBy: 'Vérifié par',
      appVersion: 'App',
    },
    status: {
      hidden: 'Masqué',
      partial: 'Partiel',
      visible: 'Visible',
      untested: 'Non testé',
    },
    guaranteed: 'Garanti par l’OS',
    bestEffort: 'au mieux-effort',
    untestedLabel: 'Testeurs recherchés',
    ctaLabel: 'Vérifier votre config →',
  },

  sponsors: {
    eyebrow: 'Soutenu par la communauté',
    heading: 'Contributeurs et sponsors',
    subhead:
      'eyeread.in est entièrement financé par des gens qui croient aux outils honnêtes et ouverts. Voici les humains qui le maintiennent gratuit.',
    ctaLabel: 'Devenir contributeur',
    loadingMessage: 'Chargement des contributeurs…',
    emptyMessage: 'Soyez le premier à soutenir eyeread.in →',
    errorMessage:
      'Impossible de charger les contributeurs pour l’instant. Voyez-les sur Open Collective →',
    sponsorsLabel: 'Sponsors',
    backersLabel: 'Contributeurs',
  },

  footer: {
    links: ['GitHub', 'Docs', 'Discord', 'AGPL-3.0'],
    copy: 'Gratuit pour toujours',
  },

  switcher: {
    label: 'Langue',
  },
};
