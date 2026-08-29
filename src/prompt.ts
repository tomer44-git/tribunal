// Assembling what a model is sent.
//
// An advocate call is the shared advocate block, then the charge sheet, then that
// advocate's own file. A judge call is the shared judge block, then the charge
// sheet, then the four submissions, then that judge's own file.
//
// The judges are shown the submissions by seat and never by name. Attribution
// belongs on the screen and in the log, not inside a judge's prompt.

import { PROMPTS } from "./prompts.generated.ts";
import { SEAT_OF, type Agent } from "./config.ts";
import type { ChargeSheet } from "./charge-sheet.ts";
import type { Verdict } from "./charge-sheet.ts";

export type Submission = {
  seat: "defence" | "prosecution";
  position: Verdict;
  reasons: string[];
};

const block = (name: string): string => {
  const text = PROMPTS[name];
  if (text === undefined) throw new Error(`no prompt named ${name}`);
  return text;
};

export function renderChargeSheet(sheet: ChargeSheet & { reference?: string }): string {
  const facts = sheet.agreed_facts.map((fact, i) => `${i + 1}. ${fact}`).join("\n");
  return [
    "CHARGE SHEET",
    sheet.reference ? `Case: ${sheet.reference}` : null,
    `Accused: ${sheet.accused}`,
    sheet.deceased ? `Deceased: ${sheet.deceased}` : null,
    "",
    "Act alleged",
    sheet.act_alleged,
    "",
    "Background",
    sheet.background,
    "",
    "Agreed factual record",
    facts,
    "",
    "Question for judgment",
    sheet.question,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** The four submissions as a judge sees them: by seat, in a fixed order, with the
 *  position each author reached and no name anywhere. */
export function renderSubmissions(submissions: Submission[]): string {
  const ordered = [...submissions].sort((a, b) => a.seat.localeCompare(b.seat));
  const parts = ordered.map((s, i) => {
    const reasons = s.reasons.map((reason, n) => `  ${n + 1}. ${reason}`).join("\n");
    return `Submission ${i + 1} — ${s.seat} seat — position: ${s.position}\n${reasons}`;
  });
  return ["SUBMISSIONS FROM THE REPRESENTATIVES", "", parts.join("\n\n")].join("\n");
}

export function advocatePrompt(agent: keyof typeof SEAT_OF, sheet: ChargeSheet): string {
  return [block("_shared-advocate"), renderChargeSheet(sheet), block(`advocate-${nameOf(agent)}`)].join(
    "\n\n---\n\n",
  );
}

export function judgePrompt(
  agent: "barak" | "elon" | "shamgar",
  sheet: ChargeSheet,
  submissions: Submission[],
): string {
  return [
    block("_shared-judge"),
    renderChargeSheet(sheet),
    renderSubmissions(submissions),
    block(`judge-${agent}`),
  ].join("\n\n---\n\n");
}

const FILE_NAME: Record<Agent, string> = {
  jon: "jon-snow",
  tyrion: "tyrion-lannister",
  daenerys: "daenerys-targaryen",
  grey_worm: "grey-worm",
  barak: "barak",
  elon: "elon",
  shamgar: "shamgar",
};

function nameOf(agent: Agent): string {
  return FILE_NAME[agent];
}
