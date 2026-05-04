const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const BLOCKED_HOST_KEYWORDS = ["medium.com", "substack.com", "wordpress", "blogspot", "algoverseairesearch.org"];
const BLOCKED_PATH_KEYWORDS = ["/blog", "/blogs", "/news", "/article", "/articles"];
const INSTITUTION_HOST_HINTS = [".edu", ".ac.", ".edu.", ".ac.uk", ".gov"];
const INSTITUTION_TEXT_HINTS = ["university", "institute", "college", "school of", "campus", "faculty", "department"];
const OPPORTUNITY_TEXT_HINTS = ["summer school", "research program", "exchange", "fellowship", "internship", "lab", "undergraduate research", "program"];
const BLOCKED_OUTBOUND_HOST_KEYWORDS = ["studyabroad.", "abroad."];
const BLOCKED_OUTBOUND_TEXT_HINTS = [
  "study abroad office",
  "my study abroad",
  "apply via portal",
  "outbound",
  "our students",
  "current students",
  "students from our university",
  "send students abroad",
  "advisors parents",
  "begin application",
  "how to apply my study abroad",
];
const EXTERNAL_FACING_TEXT_HINTS = [
  "visiting students",
  "international students",
  "external students",
  "open to students from other universities",
  "summer school",
  "applications are open",
  "eligibility",
  "program dates",
  "deadline",
];
const RESULT_LIMITS = {
  initialPerQuery: 10,
  topSeedSources: 30,
  hostExpansionCount: 10,
  hostExpansionPerHost: 5,
  preferredTopCount: 10,
  reviewTopCount: 10,
};

function trimSnippet(text, maxLength = 280) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function trimToSentence(text, maxLength = 220) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength);
  const sentenceBoundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (sentenceBoundary >= 80) {
    return slice.slice(0, sentenceBoundary + 1).trim();
  }

  const wordBoundary = slice.lastIndexOf(" ");
  if (wordBoundary >= 80) {
    return `${slice.slice(0, wordBoundary).trim()}...`;
  }

  return `${slice.trim()}...`;
}

function compactPhrase(text, maxLength = 180) {
  const normalized = decodeHtmlEntities(String(text || ""))
    .replace(/\s+/g, " ")
    .replace(/\s+\|\s+/g, " | ")
    .trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength);
  const boundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(", "), slice.lastIndexOf(" "));
  const shortened = (boundary >= 60 ? slice.slice(0, boundary) : slice).trim();
  return shortened.replace(/[,:;|-]+$/, "").trim();
}

function briefSummary(text, maxLength = 260) {
  const normalized = decodeHtmlEntities(String(text || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const sentences = normalized.match(/[^.!?]+[.!?]+/g)?.map((item) => item.trim()).filter(Boolean) || [];
  if (sentences.length >= 2) {
    const combined = `${sentences[0]} ${sentences[1]}`.trim();
    if (combined.length <= maxLength) return combined;
  }
  if (sentences.length >= 1) return sentences[0];

  const clauseBoundary = normalized.match(/^(.{40,150}?)(?:,|;|\s-\s|\s\|\s)/);
  if (clauseBoundary?.[1]) {
    return clauseBoundary[1].trim().replace(/[,:;|-]+$/, "");
  }

  return normalized
    .split(/\s+/)
    .slice(0, 28)
    .join(" ")
    .trim()
    .replace(/[,:;|-]+$/, "");
}

function cleanOpportunityTitle(text, institution = "") {
  const normalized = decodeHtmlEntities(String(text || ""))
    .replace(/\s+/g, " ")
    .replace(/\s+:\s+/g, " : ")
    .replace(/\s+\|\s+/g, " | ")
    .trim();

  const normalizedInstitution = String(institution || "").trim();
  const genericTitle = !normalized || /^(home page|homepage|home|official opportunity page)$/i.test(normalized);
  if (genericTitle) {
    return normalizedInstitution || "Official opportunity page";
  }

  const deduped = normalized.replace(/^(.{3,80}?)\s+\1\b/i, "$1");
  const pipeParts = deduped
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  let primary = pipeParts[0] || deduped;
  const verbMatch = primary.match(/^(.*?)(?:\s+(provides|offers|welcomes|invites|brings|choose|explore|enroll|take)\b.*)$/i);
  if (verbMatch?.[1]) {
    primary = verbMatch[1].trim().replace(/[,:;|-]+$/, "");
  }
  const genericPrimary = /^(home page|homepage|home)$/i.test(primary);
  let title = genericPrimary ? normalizedInstitution || "Official opportunity page" : primary;
  if (normalizedInstitution) {
    const institutionRoot = normalizedInstitution.split(/\s+/)[0]?.toLowerCase();
    if (institutionRoot && !title.toLowerCase().includes(institutionRoot)) {
      title = `${title} - ${normalizedInstitution}`;
    }
  }

  return compactPhrase(title, 110) || "Official opportunity page";
}

function uniq(array) {
  return Array.from(new Set(array.filter(Boolean)));
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (match, code) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function looksLikeDateValue(text) {
  const normalized = String(text || "").trim();
  return (
    /\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s+\d{4}\b/i.test(normalized) ||
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(normalized) ||
    /\brolling(?:\s+admissions?)?\b/i.test(normalized)
  );
}

function looksLikeUsefulTiming(text) {
  const normalized = String(text || "").trim();
  return (
    /\b\d+\s*(?:-|to)\s*\d+\s*weeks?\b/i.test(normalized) ||
    /\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2}[^.;]{0,40}(?:to|-|through)[^.;]{0,40}\d{4}\b/i.test(normalized) ||
    /\b(?:summer|fall|spring|winter)\s+\d{4}\b/i.test(normalized)
  );
}

function finalizeFieldValue(value, fallback, { maxLength = 140, requireDate = false, requireTiming = false } = {}) {
  const compact = compactPhrase(value, maxLength)
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  if (!compact || compact.length < 6) return fallback;
  if (requireDate && !looksLikeDateValue(compact)) return fallback;
  if (requireTiming && !looksLikeUsefulTiming(compact)) return fallback;
  return compact;
}

function stripHtmlToText(html) {
  return decodeHtmlEntities(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html, nameOrProperty) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${nameOrProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${nameOrProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${nameOrProperty}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${nameOrProperty}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match?.[1]) {
      return stripHtmlToText(match[1]);
    }
  }

  return "";
}

function extractSectionHtml(html, tagName) {
  const match = String(html || "").match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] || "";
}

function extractMainLikeHtml(html) {
  const raw = String(html || "");
  const byTag = extractSectionHtml(raw, "main") || extractSectionHtml(raw, "article");
  if (byTag) return byTag;

  const classMatch = raw.match(
    /<(div|section)[^>]+(?:class|id)=["'][^"']*(content|main|article|program|opportunity|summer|research)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i,
  );
  return classMatch?.[3] || "";
}

function extractOpportunityPageText(html) {
  const raw = String(html || "");
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = stripHtmlToText(titleMatch?.[1] || "");
  const metaDescription = extractMetaContent(raw, "description") || extractMetaContent(raw, "og:description");
  const mainHtml = extractMainLikeHtml(raw);
  const bodyHtml = extractSectionHtml(raw, "body");
  const primaryText = stripHtmlToText(mainHtml || bodyHtml || raw);

  const pieces = [title, metaDescription, primaryText].filter(Boolean);
  const deduped = [];

  for (const piece of pieces) {
    if (deduped.some((existing) => existing.includes(piece) || piece.includes(existing))) continue;
    deduped.push(piece);
  }

  return trimSnippet(deduped.join(" "), 7000);
}

function extractJsonBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

function sanitizeJsonLikeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function extractBalancedJsonSlice(text) {
  const raw = String(text || "");
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start >= 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

function safeParseJsonBlock(text) {
  const candidate = sanitizeJsonLikeText(text);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    const balancedSlice = extractBalancedJsonSlice(candidate);
    if (balancedSlice && balancedSlice !== candidate) {
      return JSON.parse(sanitizeJsonLikeText(balancedSlice));
    }
    throw error;
  }
}

async function requestAnthropicText({ systemPrompt, userPrompt, maxTokens = 2200 }) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic discovery request failed with ${response.status}: ${errorBody}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.content)
    ? payload.content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n")
        .trim()
    : "";
}

async function repairDiscoveryJson({ brokenJson, request, searchQueries }) {
  const systemPrompt = [
    "You repair malformed JSON for a university opportunity discovery workflow.",
    "Return valid JSON only.",
    "Do not add commentary or markdown fences.",
    "Preserve the original meaning as closely as possible.",
  ].join(" ");

  const userPrompt = [
    `Office discovery request: ${request}`,
    `Search queries used: ${searchQueries.join(" | ")}`,
    "",
    "The JSON below was returned by another model but is malformed.",
    "Repair it into valid JSON with the same schema and keep only fields supported by the content.",
    "",
    brokenJson,
  ].join("\n");

  const repairedText = await requestAnthropicText({
    systemPrompt,
    userPrompt,
    maxTokens: 2600,
  });

  const repairedJsonBlock = extractJsonBlock(repairedText);
  if (!repairedJsonBlock) {
    throw new Error("Anthropic repair response did not include valid JSON.");
  }

  return safeParseJsonBlock(repairedJsonBlock);
}

function normalizeResultUrl(rawUrl) {
  const candidate = String(rawUrl || "").trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate, "https://html.duckduckgo.com");
    const redirected = parsed.searchParams.get("uddg");
    const value = redirected ? decodeURIComponent(redirected) : parsed.toString();
    if (!/^https?:\/\//i.test(value)) {
      return null;
    }
    return value;
  } catch (_error) {
    return /^https?:\/\//i.test(candidate) ? candidate : null;
  }
}

function parseDuckDuckGoResults(html, maxResults = RESULT_LIMITS.initialPerQuery) {
  const matches = [];
  const resultRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;

  let match;
  while ((match = resultRegex.exec(String(html || ""))) !== null) {
    const url = normalizeResultUrl(match[1]);
    if (!url) continue;

    const title = stripHtmlToText(match[2]);
    const snippet = trimSnippet(stripHtmlToText(match[3]), 260);

    if (!title) continue;
    matches.push({
      title,
      url,
      snippet,
      sourceLabel: new URL(url).hostname.replace(/^www\./, ""),
    });
  }

  const unique = [];
  const seen = new Set();
  for (const item of matches) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    unique.push(item);
  }

  return unique.slice(0, maxResults);
}

async function searchDuckDuckGo(query, maxResults = RESULT_LIMITS.initialPerQuery) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Plaksha-Global-Portal/1.0",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed with ${response.status}.`);
  }

  const html = await response.text();
  return parseDuckDuckGoResults(html, maxResults);
}

async function fetchOpportunityPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Plaksha-Global-Portal/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    const text = extractOpportunityPageText(html);
    return text || null;
  } catch (_error) {
    return null;
  }
}

function scoreInstitutionSource(source) {
  const url = String(source?.url || "");
  const title = String(source?.title || "").toLowerCase();
  const snippet = String(source?.snippet || "").toLowerCase();
  const pageExtract = String(source?.pageExtract || "").toLowerCase();

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return -100;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();
  const combinedText = `${title} ${snippet} ${pageExtract}`;

  let score = 0;

  if (BLOCKED_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword))) {
    score -= 10;
  }

  if (BLOCKED_PATH_KEYWORDS.some((keyword) => pathname.includes(keyword))) {
    score -= 5;
  }

  if (INSTITUTION_HOST_HINTS.some((keyword) => hostname.includes(keyword))) {
    score += 8;
  }

  if (INSTITUTION_TEXT_HINTS.some((keyword) => combinedText.includes(keyword))) {
    score += 4;
  }

  if (OPPORTUNITY_TEXT_HINTS.some((keyword) => combinedText.includes(keyword))) {
    score += 3;
  }

  if (pathname.includes("/admissions") || pathname.includes("/summer") || pathname.includes("/research") || pathname.includes("/exchange")) {
    score += 2;
  }

  if (/visiting students|external students|international students|students from other universities/i.test(combinedText)) {
    score += 4;
  }

  if (/summer school|summer session|reu|research experience for undergraduates/i.test(combinedText)) {
    score += 4;
  }

  if (/undergraduate/i.test(combinedText)) {
    score += 2;
  }

  return score;
}

function hasInstitutionAuthority(source) {
  const url = String(source?.url || "");
  const title = String(source?.title || "").toLowerCase();
  const snippet = String(source?.snippet || "").toLowerCase();
  const pageExtract = String(source?.pageExtract || "").toLowerCase();
  const combinedText = `${title} ${snippet} ${pageExtract}`;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return false;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();

  if (BLOCKED_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword))) {
    return false;
  }

  if (BLOCKED_PATH_KEYWORDS.some((keyword) => pathname.includes(keyword))) {
    return false;
  }

  const strongHostSignal = INSTITUTION_HOST_HINTS.some((keyword) => hostname.includes(keyword));
  const strongTextSignal =
    INSTITUTION_TEXT_HINTS.some((keyword) => combinedText.includes(keyword)) &&
    OPPORTUNITY_TEXT_HINTS.some((keyword) => combinedText.includes(keyword));

  return strongHostSignal && strongTextSignal;
}

function isOutboundStudyAbroadPortal(source) {
  const url = String(source?.url || "");
  const title = String(source?.title || "").toLowerCase();
  const snippet = String(source?.snippet || "").toLowerCase();
  const pageExtract = String(source?.pageExtract || "").toLowerCase();
  const combinedText = `${title} ${snippet} ${pageExtract}`;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return true;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();
  const outboundHost = BLOCKED_OUTBOUND_HOST_KEYWORDS.some((keyword) => hostname.includes(keyword));
  const outboundPath = pathname.includes("studyabroad") || pathname.includes("study-abroad");
  const outboundText = BLOCKED_OUTBOUND_TEXT_HINTS.some((keyword) => combinedText.includes(keyword));

  return outboundHost || outboundPath || outboundText;
}

function isExternalFacingOpportunitySource(source) {
  const title = String(source?.title || "").toLowerCase();
  const snippet = String(source?.snippet || "").toLowerCase();
  const pageExtract = String(source?.pageExtract || "").toLowerCase();
  const combinedText = `${title} ${snippet} ${pageExtract}`;

  return EXTERNAL_FACING_TEXT_HINTS.some((keyword) => combinedText.includes(keyword));
}

function filterPreferredInstitutionSources(sources, request) {
  const normalizedRequest = String(request || "").toLowerCase();
  const explicitlyAskedForExchange =
    normalizedRequest.includes("exchange") ||
    normalizedRequest.includes("semester abroad") ||
    normalizedRequest.includes("study abroad");

  return sources
    .map((source) => ({
      ...source,
      institutionScore: scoreInstitutionSource(source),
    }))
    .filter((source) => {
      if (source.institutionScore < 10 || !hasInstitutionAuthority(source)) return false;
      if (!explicitlyAskedForExchange && isOutboundStudyAbroadPortal(source)) return false;
      if (!isExternalFacingOpportunitySource(source) && !explicitlyAskedForExchange) return false;
      return true;
    })
    .sort((left, right) => right.institutionScore - left.institutionScore);
}

function buildSearchQueries(request) {
  const normalized = String(request || "").trim();
  const lower = normalized.toLowerCase();
  const mentionsAbroad = lower.includes("abroad") || lower.includes("summer abroad");
  const mentionsSummer = lower.includes("summer");
  const mentionsResearch = lower.includes("research");
  const mentionsExchange = lower.includes("exchange");
  const mentionsVisiting =
    lower.includes("visiting") ||
    lower.includes("external students") ||
    lower.includes("students from other universities") ||
    lower.includes("international students");
  const mentionsComputerScience =
    lower.includes("computer science") ||
    /\bcs\b/.test(lower) ||
    lower.includes("computing");

  const baseQueries = [
    normalized,
    `${normalized} official university program site:.edu`,
    `${normalized} official institute program site:.edu`,
    `${normalized} official university opportunity site:.edu`,
    `${normalized} official college program site:.edu`,
  ];

  if (mentionsSummer && !mentionsExchange) {
    baseQueries.push(`${normalized} summer school visiting students site:.edu`);
    baseQueries.push(`${normalized} summer session visiting students site:.edu`);
    baseQueries.push(`${normalized} summer program external students site:.edu`);
  }

  if (mentionsResearch) {
    baseQueries.push(`${normalized} undergraduate research program external students site:.edu`);
    baseQueries.push(`${normalized} research opportunity visiting students site:.edu`);
  }

  if (mentionsAbroad && !mentionsExchange) {
    baseQueries.push(`${normalized} international summer school external students site:.edu`);
    baseQueries.push(`${normalized} visiting students summer program site:.edu`);
  }

  if (mentionsExchange) {
    baseQueries.push(`${normalized} exchange visiting students site:.edu`);
  }

  if (mentionsVisiting) {
    baseQueries.push(`${normalized} open to visiting students site:.edu`);
    baseQueries.push(`${normalized} students from other universities site:.edu`);
  }

  if (mentionsComputerScience) {
    baseQueries.push(`${normalized} school of computer science site:.edu`);
    baseQueries.push(`${normalized} cs department site:.edu`);
  }

  baseQueries.push(`${normalized} application deadline site:.edu`);
  baseQueries.push(`${normalized} eligibility site:.edu`);

  return Array.from(
    new Set(
      baseQueries
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ).slice(0, 14);
}

function getHostRoot(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_error) {
    return null;
  }
}

function clusterInstitutionSources(sources) {
  const byHost = new Map();

  for (const source of sources) {
    const host = getHostRoot(source.url);
    if (!host) continue;

    const existing = byHost.get(host);
    if (!existing || (source.institutionScore || 0) > (existing.institutionScore || 0)) {
      byHost.set(host, source);
    }
  }

  return Array.from(byHost.values()).sort((left, right) => (right.institutionScore || 0) - (left.institutionScore || 0));
}

function buildHostExpansionQueries(request, sources) {
  const normalized = String(request || "").trim();
  const hosts = Array.from(
    new Set(
      sources
        .map((source) => getHostRoot(source.url))
        .filter(Boolean),
    ),
  ).slice(0, RESULT_LIMITS.hostExpansionCount);

  return hosts.flatMap((host) => [
    `${normalized} site:${host}`,
    `${normalized} eligibility site:${host}`,
    `${normalized} deadline site:${host}`,
    `${normalized} visiting students site:${host}`,
  ]);
}

function inferOpportunityType(text) {
  const sourceText = String(text || "");
  if (/summer school/i.test(sourceText)) return "Summer School";
  if (/exchange/i.test(sourceText)) return "Exchange";
  if (/fellowship/i.test(sourceText)) return "Fellowship";
  if (/internship/i.test(sourceText)) return "Internship";
  return "Research";
}

function inferFieldValue(text, patterns, fallback, maxLength = 160) {
  const sourceText = String(text || "");
  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      const cleaned = finalizeFieldValue(match[1], "", { maxLength });

      if (cleaned.length >= 8) {
        return cleaned;
      }
    }
  }
  return fallback;
}

function extractTiming(text) {
  const sourceText = String(text || "");
  const patterns = [
    /\b(\d+\s*(?:-|to)\s*\d+\s*weeks?)\b/i,
    /\b((?:June|July|August|May|September)\s+\d{1,2},?\s+\d{4}\s*(?:to|-|through)\s*(?:June|July|August|May|September)\s+\d{1,2},?\s+\d{4})\b/i,
    /\b((?:Summer|Fall|Spring|Winter)\s+\d{4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      return finalizeFieldValue(match[1], "Not clearly stated", { maxLength: 120, requireTiming: true });
    }
  }

  return "Not clearly stated";
}

function extractDeadline(text) {
  const sourceText = String(text || "");
  const datePattern =
    "((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|rolling(?:\\s+admissions?)?)";
  const patterns = [
    new RegExp(`deadline[:\\s]+${datePattern}`, "i"),
    new RegExp(`apply by\\s+${datePattern}`, "i"),
    new RegExp(`applications? due\\s+${datePattern}`, "i"),
    new RegExp(`registration open through\\s+${datePattern}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match?.[1]) {
      return finalizeFieldValue(match[1], "Not clearly stated", { maxLength: 120, requireDate: true });
    }
  }

  return "Not clearly stated";
}

function extractEligibility(text) {
  return inferFieldValue(
    text,
    [
      /(open to [^.;]{12,160})/i,
      /(visiting undergraduate students[^.;]{0,120})/i,
      /(undergraduate students[^.;]{0,120})/i,
      /(international students[^.;]{0,120})/i,
      /(external students[^.;]{0,120})/i,
    ],
    "See official source",
    140,
  );
}

function buildTerseSummary(source, institution = "") {
  const base = String(source?.snippet || source?.pageExtract || "").replace(/\s+/g, " ").trim();
  if (!base) return "Official university-hosted opportunity page identified for this search.";
  const withoutBoilerplate = base
    .replace(/^(home|program options|summer session|visiting students)\s+/i, "")
    .replace(/\b(click here|learn more|skip to content)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const institutionPrefix = institution || "This program";
  if (/visiting students?|visiting undergraduate/i.test(withoutBoilerplate) && /summer/i.test(withoutBoilerplate) && /course|courses|session/i.test(withoutBoilerplate)) {
    return `${institutionPrefix} offers summer courses for visiting students.`;
  }
  if (/\bresearch\b|\breu\b|\blab\b/i.test(withoutBoilerplate) && /\bsummer\b/i.test(withoutBoilerplate)) {
    return `${institutionPrefix} offers a summer research opportunity for visiting or external students.`;
  }
  if (/summer school/i.test(withoutBoilerplate)) {
    return `${institutionPrefix} offers a summer school opportunity for visiting or external students.`;
  }
  return briefSummary(withoutBoilerplate, 150);
}

function toTitleCase(words) {
  return words
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildInstitutionName(url, fallbackLabel, _sourceText = "") {
  const fallback = String(fallbackLabel || "").trim();
  if (fallback && /university|college|institute|school|academy|polytechnic|CMU|MIT|NTU|NUS|ETH/i.test(fallback)) {
    return fallback;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".").filter(Boolean);
    const ignored = new Set(["www", "summer", "sps", "cs", "school", "program", "programs", "admissions", "apply", "study", "global", "international"]);
    const eduIndex = parts.findIndex((part) => part === "edu");
    const labelCandidates = (eduIndex > 0 ? parts.slice(0, eduIndex) : parts).filter((part) => !ignored.has(part.toLowerCase()));
    const label = labelCandidates[labelCandidates.length - 1] || parts[0] || hostname;
    const acronymMap = {
      cmu: "CMU",
      mit: "MIT",
      ntu: "NTU",
      nus: "NUS",
      caltech: "Caltech",
      eth: "ETH Zurich",
    };
    const normalizedLabel = label.toLowerCase();
    if (acronymMap[normalizedLabel]) return acronymMap[normalizedLabel];
    if (parts.includes("edu")) {
      return `${toTitleCase(label.replace(/-/g, " "))} University`;
    }
    return fallback || hostname;
  } catch (_error) {
    return fallback || "Official source";
  }
}

function confidenceLabelForTier(tier) {
  if (tier === "best_match") return "Best verified match";
  if (tier === "strong_match") return "Strong match";
  return "Needs manual review";
}

function buildFallbackFitReason(request, source) {
  const combinedText = `${source.title} ${source.snippet} ${source.pageExtract || ""}`.toLowerCase();
  const reasons = [];

  if (/computer science|computing|cs\b/i.test(combinedText)) reasons.push("Computer science is a clear subject match.");
  if (/summer/i.test(combinedText)) reasons.push("The page is clearly framed as a summer opportunity.");
  if (/research|reu|lab/i.test(combinedText)) reasons.push("It appears to offer a research-oriented experience.");
  if (/visiting students|external students|international students|students from other universities/i.test(combinedText)) {
    reasons.push("The wording suggests students beyond the home institution may be eligible.");
  }

  if (reasons.length === 0) {
    return `This page appears relevant to the request, but the office should verify eligibility and fit on the official program page.`;
  }

  return reasons.join(" ");
}

function buildSourceDerivedResults({ request, sources, tier, startIndex = 0 }) {
  return sources.map((source, index) => {
    const sourceText = `${source.title} ${source.snippet} ${source.pageExtract || ""}`;
    const inferredType = inferOpportunityType(sourceText);
    const institution = buildInstitutionName(source.url, source.sourceLabel, sourceText);

    return {
      id: `${tier}-${startIndex + index + 1}`,
      title: cleanOpportunityTitle(source.title || "Official opportunity page", institution),
      institution,
      country: "Not clearly stated",
      confidenceTier: tier,
      confidenceLabel: confidenceLabelForTier(tier),
      rankingScore: source.institutionScore || 0,
      opportunityType: inferredType,
      summary: buildTerseSummary(source, institution),
      fitReason: buildFallbackFitReason(request, source),
      eligibility: extractEligibility(sourceText),
      timing: extractTiming(sourceText),
      deadline: extractDeadline(sourceText),
      url: source.url,
      sourceLabel: source.sourceLabel || institution,
      sourceSnippet: buildTerseSummary(source, institution),
      tags: [inferredType.toLowerCase(), "official source"],
      draftProgram: {
        title: cleanOpportunityTitle(source.title || "Official opportunity page", institution),
        university: institution,
        country: "",
        type: inferredType,
        description: buildTerseSummary(source, institution),
        eligibility: extractEligibility(sourceText),
        duration: extractTiming(sourceText),
        startDate: null,
        endDate: null,
        externalLink: source.url,
        tags: [inferredType.toLowerCase(), "discovery"],
      },
    };
  });
}

function buildFallbackDiscoveryResults({ request, searchQueries, strongSources, reviewSources = [] }) {
  const results = [
    ...buildSourceDerivedResults({
      request,
      sources: strongSources.slice(0, 4),
      tier: "strong_match",
    }),
    ...buildSourceDerivedResults({
      request,
      sources: reviewSources.slice(0, 4),
      tier: "needs_manual_review",
      startIndex: strongSources.length,
    }),
  ];

  return {
    normalizedRequest: request,
    overview:
      "I found relevant university-hosted pages for this request. They are ordered from strongest verified match at the top to weaker options that may still be worth manual review lower down.",
    searchedQueries: searchQueries,
    results,
  };
}

function normalizeSynthesizedResult(result, source, request) {
  const sourceText = `${source.title} ${source.snippet} ${source.pageExtract || ""}`;
  const institution = buildInstitutionName(source.url, source.sourceLabel, sourceText);
  const normalizedTitle = cleanOpportunityTitle(String(result?.title || "").trim() || source.title || "Official opportunity page", institution);
  const normalizedInstitutionCandidate = String(result?.institution || "").replace(/\s+/g, " ").trim();
  const normalizedInstitution =
    normalizedInstitutionCandidate &&
    normalizedInstitutionCandidate.length <= 80 &&
    !/[.!?]/.test(normalizedInstitutionCandidate)
      ? normalizedInstitutionCandidate
      : institution;
  const normalizedSummary =
    briefSummary(String(result?.summary || "").trim(), 150) ||
    buildTerseSummary(source, normalizedInstitution);
  const normalizedFitReason = trimSnippet(String(result?.fitReason || "").trim(), 260) || buildFallbackFitReason(request, source);
  const normalizedEligibility =
    String(result?.eligibility || "").trim() && !/^not clearly stated$/i.test(String(result.eligibility))
      ? finalizeFieldValue(String(result.eligibility), "See official source", { maxLength: 140 })
      : extractEligibility(sourceText);
  const normalizedTiming =
    String(result?.timing || "").trim() && !/^not clearly stated$/i.test(String(result.timing))
      ? finalizeFieldValue(String(result.timing), "Not clearly stated", { maxLength: 120, requireTiming: true })
      : extractTiming(sourceText);
  const normalizedDeadline =
    String(result?.deadline || "").trim() && !/^not clearly stated$/i.test(String(result.deadline))
      ? finalizeFieldValue(String(result.deadline), "Not clearly stated", { maxLength: 120, requireDate: true })
      : extractDeadline(sourceText);

  return {
    ...result,
    title: normalizedTitle,
    institution: normalizedInstitution,
    summary: normalizedSummary,
    fitReason: normalizedFitReason,
    eligibility: normalizedEligibility,
    timing: normalizedTiming,
    deadline: normalizedDeadline,
    sourceSnippet: briefSummary(String(result?.sourceSnippet || "").trim() || buildTerseSummary(source, normalizedInstitution), 150),
    draftProgram: {
      ...result.draftProgram,
      title: cleanOpportunityTitle(String(result?.draftProgram?.title || "").trim() || normalizedTitle, institution),
      description: briefSummary(String(result?.draftProgram?.description || "").trim() || normalizedSummary, 150),
      eligibility: finalizeFieldValue(String(result?.draftProgram?.eligibility || "").trim() || normalizedEligibility, "See official source", {
        maxLength: 140,
      }),
      duration: finalizeFieldValue(String(result?.draftProgram?.duration || "").trim() || normalizedTiming, "Not clearly stated", {
        maxLength: 120,
      }),
    },
  };
}

async function synthesizeOpportunityResults({ request, searchQueries, sources }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for opportunity discovery.");
  }

  const systemPrompt = [
    "You are an opportunity discovery analyst for a university Global Engagement Office.",
    "Your job is to review externally retrieved sources and propose opportunities that match the office query.",
    "Only use the provided source material. Do not invent institutions, deadlines, or eligibility.",
    "Return concise, structured results suitable for an admin operations console.",
    "Only return opportunities from official university, college, institute, or clearly institutional pages.",
    "Do not return blog posts, aggregators, commentary pages, or generic advice articles as opportunities.",
    "Use at most one result per source URL.",
    "If only one source is credible, return only one result.",
    "Never derive multiple different opportunities from a single generic article or overview page.",
  ].join(" ");

  const userPrompt = [
    `Office discovery request: ${request}`,
    `Search queries used: ${searchQueries.join(" | ")}`,
    "",
    "Retrieved sources:",
    JSON.stringify(sources, null, 2),
    "",
    "Return JSON with this exact shape:",
    JSON.stringify(
      {
        normalizedRequest: "string",
        overview: "short strategic summary for the office",
        searchedQueries: ["string"],
        results: [
          {
            id: "string-kebab-id",
            title: "program title",
            institution: "institution name",
            country: "country or region if known",
            opportunityType: "Research | Summer School | Exchange | Fellowship | Internship | Other",
            summary: "2-3 sentence summary",
            fitReason: "why it matches the office request",
            eligibility: "eligibility summary or 'Not clearly stated'",
            timing: "duration/timing summary or 'Not clearly stated'",
            deadline: "deadline summary or 'Not clearly stated'",
            url: "source url",
            sourceLabel: "domain or institution",
            sourceSnippet: "short quoted or paraphrased evidence",
            tags: ["tag1", "tag2"],
            draftProgram: {
              title: "title",
              university: "institution",
              country: "country",
              type: "Research",
              description: "description",
              eligibility: "eligibility",
              duration: "duration",
              startDate: null,
              endDate: null,
              externalLink: "url",
              tags: ["ai", "research"]
            }
          }
        ]
      },
      null,
      2,
    ),
    "",
    "Rules:",
    "- Return 1 to 6 high-quality results if available.",
    "- If there are fewer credible opportunities, return fewer rather than inventing.",
    "- If the retrieved sources are not official university/institution opportunity pages, exclude them.",
    "- Keep draftProgram conservative and based on the evidence.",
    "- If dates are unknown, use null for startDate/endDate and 'Not clearly stated' in timing/deadline.",
    "- Output JSON only.",
  ].join("\n");

  const outputText = await requestAnthropicText({
    systemPrompt,
    userPrompt,
    maxTokens: 2200,
  });

  const jsonBlock = extractJsonBlock(outputText);
  if (!jsonBlock) {
    throw new Error("Anthropic discovery response did not include valid JSON.");
  }

  try {
    return safeParseJsonBlock(jsonBlock);
  } catch (error) {
    console.warn("Opportunity discovery JSON parse failed. Attempting repair before fallback.", error);
    try {
      return await repairDiscoveryJson({
        brokenJson: jsonBlock,
        request,
        searchQueries,
      });
    } catch (repairError) {
      console.warn("Opportunity discovery JSON repair failed. Falling back to source-derived results.", repairError);
      return buildFallbackDiscoveryResults({ request, searchQueries, strongSources: sources });
    }
  }
}

async function discoverOpportunities(request) {
  const normalizedRequest = String(request || "").trim();
  if (!normalizedRequest) {
    throw new Error("Please provide a discovery request.");
  }

  const primaryQueries = buildSearchQueries(normalizedRequest);
  const primaryQueryResults = await Promise.allSettled(
    primaryQueries.map((query) => searchDuckDuckGo(query, RESULT_LIMITS.initialPerQuery)),
  );
  const mergedPrimaryResults = primaryQueryResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const uniqueSources = [];
  const seen = new Set();
  for (const source of mergedPrimaryResults) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    uniqueSources.push(source);
  }

  const hostExpansionQueries = buildHostExpansionQueries(normalizedRequest, uniqueSources);
  const hostExpansionResults = await Promise.allSettled(
    hostExpansionQueries.slice(0, RESULT_LIMITS.hostExpansionCount * 4).map((query) =>
      searchDuckDuckGo(query, RESULT_LIMITS.hostExpansionPerHost),
    ),
  );

  for (const source of hostExpansionResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []))) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    uniqueSources.push(source);
  }

  const topSources = uniqueSources.slice(0, RESULT_LIMITS.topSeedSources);
  const sourcePages = await Promise.all(
    topSources.map(async (source) => ({
      ...source,
      pageExtract: await fetchOpportunityPage(source.url),
    })),
  );

  const usableSources = sourcePages.filter((source) => source.pageExtract || source.snippet);
  const rankedInstitutionSources = filterPreferredInstitutionSources(usableSources, normalizedRequest);
  const clusteredInstitutionSources = clusterInstitutionSources(rankedInstitutionSources);
  const preferredInstitutionSources = clusteredInstitutionSources.slice(0, RESULT_LIMITS.preferredTopCount);
  const reviewInstitutionSources = clusteredInstitutionSources.slice(
    RESULT_LIMITS.preferredTopCount,
    RESULT_LIMITS.preferredTopCount + RESULT_LIMITS.reviewTopCount,
  );

  if (preferredInstitutionSources.length === 0) {
    return {
      normalizedRequest,
      overview:
        "I couldn’t find enough official university-hosted opportunity pages that appear to be open to students beyond the home institution. Try narrowing the search by topic, region, or opportunity type.",
      searchedQueries: [...primaryQueries, ...hostExpansionQueries].slice(0, 12),
      results: [],
    };
  }

  const synthesized = await synthesizeOpportunityResults({
    request: normalizedRequest,
    searchQueries: [...primaryQueries, ...hostExpansionQueries].slice(0, 12),
    sources: preferredInstitutionSources,
  });

  const allowedUrls = new Set(preferredInstitutionSources.map((source) => source.url));
  const uniqueResults = [];
  const seenUrls = new Set();

  for (const result of Array.isArray(synthesized.results) ? synthesized.results : []) {
    const url = String(result?.url || "").trim();
    if (!allowedUrls.has(url) || seenUrls.has(url)) continue;
    seenUrls.add(url);
    const matchedSource = preferredInstitutionSources.find((source) => source.url === url);
    uniqueResults.push({
      ...normalizeSynthesizedResult(result, matchedSource || { title: "", snippet: "", pageExtract: "", url }, normalizedRequest),
      confidenceTier: "best_match",
      confidenceLabel: confidenceLabelForTier("best_match"),
      rankingScore: matchedSource?.institutionScore || 0,
    });
  }

  const supplementalReviewResults = buildSourceDerivedResults({
    request: normalizedRequest,
    sources: preferredInstitutionSources.filter((source) => !seenUrls.has(source.url)).slice(0, 3),
    tier: "strong_match",
  });

  const additionalManualReviewResults = buildSourceDerivedResults({
    request: normalizedRequest,
    sources: reviewInstitutionSources.slice(0, 4),
    tier: "needs_manual_review",
    startIndex: uniqueResults.length + supplementalReviewResults.length,
  });

  const orderedResults = [...uniqueResults, ...supplementalReviewResults, ...additionalManualReviewResults]
    .sort((left, right) => {
      const tierOrder = {
        best_match: 3,
        strong_match: 2,
        needs_manual_review: 1,
      };

      const leftRank = tierOrder[left.confidenceTier || "needs_manual_review"];
      const rightRank = tierOrder[right.confidenceTier || "needs_manual_review"];
      if (leftRank !== rightRank) return rightRank - leftRank;
      return (right.rankingScore || 0) - (left.rankingScore || 0);
    });

  return {
    normalizedRequest: synthesized.normalizedRequest || normalizedRequest,
    overview:
      synthesized.overview ||
      "Opportunity discovery results are ordered from strongest verified match at the top to weaker options that may still merit manual review.",
    searchedQueries:
      Array.isArray(synthesized.searchedQueries) && synthesized.searchedQueries.length
        ? synthesized.searchedQueries
        : [...primaryQueries, ...hostExpansionQueries].slice(0, 12),
    results: orderedResults,
  };
}

module.exports = {
  discoverOpportunities,
};
