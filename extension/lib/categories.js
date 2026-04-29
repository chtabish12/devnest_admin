// Hostname → productivity category. Keep in sync with /lib/activity-categories.ts on the web.

const RULES = [
  // Productive: job platforms + work tools
  { pattern: /(^|\.)(linkedin\.com|indeed\.com|glassdoor\.com|monster\.com|ziprecruiter\.com|wellfound\.com|angel\.co|upwork\.com|fiverr\.com|freelancer\.com|toptal\.com|guru\.com|peopleperhour\.com|remoteok\.com|weworkremotely\.com|stackoverflow\.com|github\.com|gitlab\.com|bitbucket\.org|jobs\.lever\.co|greenhouse\.io|workable\.com|ashbyhq\.com)$/i, category: "productive" },
  { pattern: /(^|\.)(gmail\.com|mail\.google\.com|outlook\.com|outlook\.live\.com|outlook\.office\.com|slack\.com|teams\.microsoft\.com|zoom\.us|meet\.google\.com|calendar\.google\.com|webex\.com|notion\.so|atlassian\.net|trello\.com|asana\.com|clickup\.com|monday\.com|airtable\.com|jira\.com|confluence\.com)$/i, category: "productive" },
  { pattern: /(^|\.)devnest/i, category: "productive" },

  // Distracting: social + entertainment + shopping + news
  { pattern: /(^|\.)(youtube\.com|netflix\.com|hulu\.com|disneyplus\.com|hbomax\.com|primevideo\.com|twitch\.tv|spotify\.com|soundcloud\.com)$/i, category: "distracting" },
  { pattern: /(^|\.)(instagram\.com|tiktok\.com|facebook\.com|fb\.com|twitter\.com|x\.com|reddit\.com|9gag\.com|pinterest\.com|snapchat\.com|tumblr\.com|threads\.net)$/i, category: "distracting" },
  { pattern: /(^|\.)(amazon\.[a-z.]+|ebay\.[a-z.]+|aliexpress\.com|temu\.com|shein\.com|wayfair\.com)$/i, category: "distracting" },
  { pattern: /(^|\.)(news\.ycombinator\.com|hn\.algolia\.com|cnn\.com|bbc\.[a-z.]+|nytimes\.com|theverge\.com|wired\.com|techcrunch\.com)$/i, category: "distracting" },
];

export function categorize(hostname) {
  if (!hostname) return "neutral";
  const h = hostname.toLowerCase();
  for (const rule of RULES) {
    if (rule.pattern.test(h)) return rule.category;
  }
  return "neutral";
}
