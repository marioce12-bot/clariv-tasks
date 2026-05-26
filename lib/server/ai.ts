const { aiConfig } = require("../../ai.config.js") as {
  aiConfig: { apiKey: string; baseUrl: string; models: { text: string; image: string; video: string } };
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isAiConfigured() {
  return Boolean(aiConfig.apiKey && aiConfig.baseUrl && aiConfig.models.text);
}

export async function generateText(messages: ChatMessage[], temperature = 0.7) {
  if (!isAiConfigured()) {
    throw new Error("AI configuration is incomplete");
  }

  const response = await fetch(chatCompletionsEndpoint(aiConfig.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: aiConfig.models.text,
      messages,
      temperature
    })
  });

  if (!response.ok) {
    throw new Error(`AI text generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function chatCompletionsEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

export async function generatePostFromContext(input: {
  journal: string;
  pseudo?: string;
  brandVoice?: string;
  styleTone?: string;
  recentPosts: string[];
  recommendations?: string;
}) {
  const content = await generateText([
    {
      role: "system",
      content: "Tu es un manager de reseaux sociaux senior. Genere uniquement le post final en francais: hook, corps, CTA, hashtags, signature pseudo."
    },
    {
      role: "user",
      content: JSON.stringify({
        journal_du_jour: input.journal,
        pseudo: input.pseudo,
        style_de_marque: input.brandVoice,
        ton: input.styleTone,
        sept_derniers_posts: input.recentPosts,
        recommandations_stats: input.recommendations
      })
    }
  ]);

  const mediaPrompt = await generateText([
    {
      role: "system",
      content: "Cree un prompt visuel court pour une image ou video social media coherente avec le post. Reponds uniquement avec le prompt."
    },
    { role: "user", content }
  ], 0.8);

  return { text: content, mediaPrompt };
}

export async function generatePseudoProposals(answers: Record<string, string>) {
  if (!isAiConfigured()) return fallbackPseudos(answers);

  const content = await generateText([
    {
      role: "system",
      content: "Genere 5 propositions de pseudo en JSON strict: [{\"pseudo\":\"...\",\"reason\":\"...\"}]."
    },
    { role: "user", content: JSON.stringify(answers) }
  ]);

  try {
    return JSON.parse(content) as Array<{ pseudo: string; reason: string }>;
  } catch {
    return fallbackPseudos(answers);
  }
}

export function fallbackPseudos(answers: Record<string, string>) {
  const base = sanitize(answers.domain || answers.descriptors || "Clariv");
  return [
    { pseudo: `${base}Daily`, reason: "Simple, memorisable, adapte a une prise de parole quotidienne." },
    { pseudo: `By${base}`, reason: "Positionne clairement une marque personnelle identifiable." },
    { pseudo: `${base}Notes`, reason: "Met l'accent sur le journal, les apprentissages et la progression." },
    { pseudo: `${base}Pulse`, reason: "Donne une impression active, actuelle et engageante." },
    { pseudo: `${base}Studio`, reason: "Convient a une presence plus construite et professionnelle." }
  ];
}

function sanitize(value: string) {
  const cleaned = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 18) || "Clariv";
}
