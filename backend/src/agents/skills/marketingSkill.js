/**
 * Compétence « marketing » de l'agent Fluxora — rédaction de posts pour les réseaux sociaux.
 *
 * Règles adaptées des skills « content-creation » et « draft-content » du plugin marketing
 * d'Anthropic (anthropics/knowledge-work-plugins, licence Apache-2.0).
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-haiku-4-5-20251001';

const MARKETING_GUIDELINES = `
RÈGLES DE RÉDACTION — POSTS RÉSEAUX SOCIAUX (compétence marketing)
Structure d'un post :
• Accroche — la 1re ligne doit arrêter le défilement : question, affirmation forte, chiffre, mini-histoire.
• Corps — 2 à 4 points concis OU un court récit ; une idée par paragraphe, lignes aérées.
• Appel à l'action — dire au lecteur quoi faire ensuite (commenter, partager, prendre contact, découvrir).
• Hashtags — 3 à 5 hashtags pertinents, regroupés à la fin.

Spécificités LinkedIn :
• Ton professionnel mais humain ; les histoires vécues et les leçons apprises performent le mieux.
• Paragraphes courts séparés par une ligne vide, pour la lisibilité sur mobile.
• ~1 300 caractères idéal (au-delà, le texte est replié derrière « …voir plus ») ; 3 000 caractères maximum.
• Emojis avec parcimonie (0 à 3), jamais en remplacement des mots.
• Voix active, « vous » pour s'adresser au lecteur, pas de jargon inutile.

Formules d'accroche efficaces :
• Chiffre surprenant — « 73 % des freelances perdent 5 h par mois à relancer leurs clients. »
• Contre-pied — « Le meilleur mois de notre année n'était pas celui où l'on a le plus facturé. »
• Question — « Quand avez-vous vérifié votre trésorerie pour la dernière fois ? »
• Scénario — « Imaginez clôturer votre mois en 10 minutes. »
• Récit — « Le trimestre dernier, on passait 20 h par semaine sur l'administratif. Voici ce qu'on a changé. »

Appels à l'action : verbes d'action précis (« Découvrez », « Écrivez-moi », « Partagez votre avis ») ; un seul appel principal.

Règles impératives :
• N'invente JAMAIS de chiffres, clients, résultats ou citations : utilise uniquement les faits fournis (brief ou données Fluxora).
  S'il manque une donnée utile, écris une formulation qui s'en passe.
• Ne nomme pas un client sans que l'utilisateur l'ait demandé explicitement (confidentialité).
• Écris en français, sans guillemets autour du post, prêt à être publié tel quel.
• Pour la photo : propose une requête de recherche Unsplash courte EN ANGLAIS (2 à 4 mots, concrète et visuelle,
  ex. « team meeting office », « laptop coffee desk »).`;

let _anthropic = null;
const getAI = () => {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
};

const DRAFT_TOOL = {
  name: 'submit_linkedin_posts',
  description: 'Renvoie les variantes de post LinkedIn rédigées et la requête photo.',
  input_schema: {
    type: 'object',
    properties: {
      variants: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            angle: { type: 'string', description: 'Angle choisi en 2-4 mots (ex. « Récit personnel »)' },
            text:  { type: 'string', description: 'Post complet prêt à publier, hashtags inclus à la fin' },
          },
          required: ['angle', 'text'],
        },
      },
      image_query: { type: 'string', description: 'Requête Unsplash en anglais, 2 à 4 mots' },
    },
    required: ['variants', 'image_query'],
  },
};

const TONES = {
  professionnel: 'professionnel et crédible',
  inspirant: 'inspirant et positif',
  pedagogique: 'pédagogique, qui apprend quelque chose au lecteur',
  decontracte: 'décontracté et chaleureux',
};

/**
 * Génère jusqu'à 3 variantes de post LinkedIn à partir d'un brief.
 * @returns {{ variants: {angle,text}[], imageQuery: string }}
 */
async function generateLinkedInDrafts({ brief, tone = 'professionnel', audience, orgName, facts }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error('Assistant IA non configuré (ANTHROPIC_API_KEY manquante).'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
  }

  const system = `Tu es le rédacteur marketing de Fluxora, au service de l'entreprise « ${orgName || 'l\'utilisateur'} ».
Tu écris des posts LinkedIn publiés sur le profil personnel du dirigeant (freelance ou PME).
${MARKETING_GUIDELINES}`;

  const userPrompt = [
    `Brief : ${brief}`,
    `Ton souhaité : ${TONES[tone] || tone}`,
    audience ? `Cible : ${audience}` : null,
    facts ? `Faits vérifiés utilisables :\n${facts}` : null,
    'Rédige 3 variantes avec des angles différents (ex. récit, conseils pratiques, annonce), puis la requête photo.',
  ].filter(Boolean).join('\n');

  try {
    const res = await getAI().messages.create({
      model: MODEL,
      max_tokens: 2500,
      system,
      tools: [DRAFT_TOOL],
      tool_choice: { type: 'tool', name: DRAFT_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    });
    const out = res.content.find((b) => b.type === 'tool_use')?.input || {};
    return {
      variants: (out.variants || []).map((v) => ({ angle: v.angle, text: String(v.text || '').slice(0, 3000) })),
      imageQuery: out.image_query || '',
    };
  } catch (err) {
    _anthropic = null;
    if (err.status === 401) throw Object.assign(new Error('Clé API invalide.'), { status: 503, code: 'ASSISTANT_INVALID_KEY' });
    if (err.status === 400 && err.message?.includes('credit')) throw Object.assign(new Error('Crédits IA épuisés.'), { status: 402, code: 'ASSISTANT_NO_CREDITS' });
    throw Object.assign(new Error('L\'IA est temporairement indisponible.'), { status: 503, code: 'ASSISTANT_UNAVAILABLE' });
  }
}

module.exports = { MARKETING_GUIDELINES, generateLinkedInDrafts };
