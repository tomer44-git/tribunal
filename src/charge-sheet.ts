// The charge sheet rules from docs/charge-sheet-spec.md, written once.
//
// The browser imports this so a user is told about a missing question at once.
// The server imports the same file and runs it again on every submission, because
// the browser's copy runs on the user's machine and can be skipped. Two copies of
// these rules would drift, and the day they drifted the browser would accept what
// the server refuses.
//
// Nothing here decides whether a charge sheet is any good. These are floors. A
// sheet can satisfy every rule below and still be too vague to argue about, and
// that failure is invisible to code.

/** The two values the package fixes. Never supplied by a user, never varied. */
export const VERDICT_VALUES = ["justified", "not justified"] as const;
export type Verdict = (typeof VERDICT_VALUES)[number];

export type ChargeSheet = {
  accused: string;
  /** A killing has one. Not every act put to the Tribunal does. */
  deceased: string | null;
  act_alleged: string;
  background: string;
  agreed_facts: string[];
  question: string;
};

/** One failing field. A refusal returns every one of them, never just the first. */
export type Problem = { field: keyof ChargeSheet; message: string };

export const LIMITS = {
  actAllegedMinWords: 10,
  backgroundMinWords: 150,
  backgroundMaxWords: 400,
  agreedFactsMin: 3,
  agreedFactMinWords: 8,
} as const;

const words = (value: string): string[] => value.trim().split(/\s+/).filter(Boolean);

/** Lowercased letter-and-digit runs, so that curly apostrophes and commas do not
 *  make two spellings of the same word look different. */
const tokens = (value: string): string[] =>
  value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Every rule the sheet has to satisfy. Returns one problem per failing field and
 * an empty array for a sound sheet. It never throws and never partially accepts.
 */
export function checkChargeSheet(input: unknown): Problem[] {
  const problems: Problem[] = [];
  const sheet = (input ?? {}) as Partial<ChargeSheet>;

  // --- the question ---------------------------------------------------------
  // A sheet that arrives without its question is the one refusal with no
  // exception. There is nothing for seven agents to answer.
  if (!isText(sheet.question)) {
    problems.push({ field: "question", message: "a charge sheet must carry its question" });
  } else {
    const question = sheet.question.trim();
    const marks = (question.match(/\?/g) ?? []).length;
    if (marks !== 1 || !question.endsWith("?")) {
      problems.push({
        field: "question",
        message: "the question must be one question, ending in a single question mark",
      });
    }
  }

  // --- the accused ----------------------------------------------------------
  if (!isText(sheet.accused)) {
    problems.push({ field: "accused", message: "the accused must be named" });
  }

  // --- the act alleged ------------------------------------------------------
  if (!isText(sheet.act_alleged)) {
    problems.push({ field: "act_alleged", message: "the act alleged must be stated" });
  } else {
    if (words(sheet.act_alleged).length < LIMITS.actAllegedMinWords) {
      problems.push({
        field: "act_alleged",
        message: `the act alleged must run to at least ${LIMITS.actAllegedMinWords} words`,
      });
    }
    // The act has to be about the person accused of it. Any part of the name
    // will do: T-001 accuses Jon Snow of an act that names only Jon.
    if (isText(sheet.accused)) {
      const named = tokens(sheet.accused).filter((t) => t.length >= 2);
      const inAct = new Set(tokens(sheet.act_alleged));
      if (named.length > 0 && !named.some((t) => inAct.has(t))) {
        problems.push({
          field: "act_alleged",
          message: "the act alleged must name the accused",
        });
      }
    }
  }

  // --- the background -------------------------------------------------------
  // Too short and the advocates invent facts, because they still have to build an
  // argument. Too long and every word is paid for on all seven calls.
  if (!isText(sheet.background)) {
    problems.push({ field: "background", message: "the background must be given" });
  } else {
    const count = words(sheet.background).length;
    if (count < LIMITS.backgroundMinWords || count > LIMITS.backgroundMaxWords) {
      problems.push({
        field: "background",
        message: `the background must run to between ${LIMITS.backgroundMinWords} and ${LIMITS.backgroundMaxWords} words, and runs to ${count}`,
      });
    }
  }

  // --- the agreed facts -----------------------------------------------------
  const facts = sheet.agreed_facts;
  if (!Array.isArray(facts) || facts.some((f) => typeof f !== "string")) {
    problems.push({ field: "agreed_facts", message: "the agreed facts must be a list" });
  } else if (facts.length < LIMITS.agreedFactsMin) {
    problems.push({
      field: "agreed_facts",
      message: `there must be at least ${LIMITS.agreedFactsMin} agreed facts`,
    });
  } else if (facts.some((f) => !isText(f) || words(f).length < LIMITS.agreedFactMinWords)) {
    problems.push({
      field: "agreed_facts",
      message: `every agreed fact must run to at least ${LIMITS.agreedFactMinWords} words`,
    });
  } else {
    const seen = new Set(facts.map((f) => tokens(f).join(" ")));
    if (seen.size !== facts.length) {
      problems.push({ field: "agreed_facts", message: "no two agreed facts may be the same" });
    }
  }

  // --- the deceased ---------------------------------------------------------
  // Optional, but if it is there it has to say something.
  if (sheet.deceased !== undefined && sheet.deceased !== null && !isText(sheet.deceased)) {
    problems.push({ field: "deceased", message: "the deceased, if named, must be named" });
  }

  return problems;
}
