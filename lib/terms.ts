// lib/terms.ts
//
// The participation terms.
//
// ⚠️ THIS WORDING HAS NOT BEEN REVIEWED BY A LAWYER. It is a reasonable
// starting draft, but a liability waiver is a legal document and its
// enforceability varies — particularly for an activity organised by an
// employer. Have HR or legal review it before the season opens, and
// replace the text below with whatever they approve.
//
// If the wording changes, bump TERMS_VERSION. Everyone is then asked to
// accept again, and the earlier acceptances stay on record showing what
// was agreed and when.

export const TERMS_VERSION = "2026-09-v1";

export type TermsSection = {
  heading: string;
  body: string;
};

export const TERMS: TermsSection[] = [
  {
    heading: "This is voluntary",
    body:
      "Move-Athon Mania is an engagement activity. Taking part is entirely your choice. There is no expectation from the organisers or from management that you participate, and choosing not to take part carries no consequence of any kind.",
  },
  {
    heading: "Move within your own limits",
    body:
      "Every challenge, target and leaderboard in this app is optional. Do only what suits your own fitness and health. The points, streaks and challenges are there to make the event enjoyable — they are not a standard anyone is expected to meet.",
  },
  {
    heading: "Check with a doctor if you're unsure",
    body:
      "If you have any medical condition, are recovering from injury or illness, are pregnant, or have not exercised regularly in some time, please speak to a qualified medical professional before taking part. If you feel unwell, dizzy, or in pain at any point, stop immediately.",
  },
  {
    heading: "Stay safe where you exercise",
    body:
      "Choose safe routes and surfaces, follow traffic rules, wear suitable footwear, stay hydrated, and take account of the weather. Do not use your phone in a way that puts you at risk while moving.",
  },
  {
    heading: "Responsibility",
    body:
      "You take part at your own risk. Any activity you record is undertaken in your own time and by your own choice, and is not performed at the direction of the company. To the extent permitted by law, the organisers, the event committee and the company accept no responsibility for any injury, accident, illness, loss or damage arising from your participation.",
  },
  {
    heading: "What others can see",
    body:
      "Your activities, distances, points and team are visible to other participants in the app. Your weight log is private and is visible only to you. Activity data is read from your Strava account with your permission, and you can disconnect it at any time.",
  },
  {
    heading: "Fair play",
    body:
      "Record your activities honestly. Activities are checked automatically for patterns that suggest a recording error or misuse, and flagged entries are reviewed by a person before any action is taken. Your team captain is informed if an activity of yours is set aside.",
  },
];

/** Shown above the checkbox, as the thing being agreed to. */
export const TERMS_CONSENT_LINE =
  "I have read the above. I am taking part voluntarily, I will exercise within my own limits, and I accept that I do so at my own risk.";
