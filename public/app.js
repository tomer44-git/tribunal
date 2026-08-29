// The screen.
//
// It checks the charge sheet before posting so that a missing question is said at
// once rather than after a wait, and it imports the very rules the server uses so
// the two cannot disagree. That check is a courtesy. The one that decides runs on
// the server, on every submission, whatever this file did first.
//
// Nothing else here decides anything. The panel runs behind a job and this asks,
// once a second, what the server has written down.

import { checkChargeSheet } from "./shared/charge-sheet.js";

const $ = (selector) => document.querySelector(selector);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const form = $("#sheet");
const problems = $("#problems");
const result = $("#result");
const note = $("#note");

const readForm = () => {
  const data = new FormData(form);
  const facts = String(data.get("agreed_facts") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    accused: String(data.get("accused") || "").trim(),
    deceased: String(data.get("deceased") || "").trim() || null,
    act_alleged: String(data.get("act_alleged") || "").trim(),
    background: String(data.get("background") || "").trim(),
    agreed_facts: facts,
    question: String(data.get("question") || "").trim(),
  };
};

const showProblems = (list) => {
  problems.replaceChildren();
  if (!list.length) return;
  const box = el("div", "problems");
  box.append(el("p", "small", "The charge sheet was refused. Every field that failed is named."));
  const ul = el("ul", "small");
  for (const problem of list) ul.append(el("li", null, `${problem.field} — ${problem.message}`));
  box.append(ul);
  problems.append(box);
};

$("#load").addEventListener("click", async () => {
  const sheet = await fetch("./t001.json").then((r) => r.json());
  form.accused.value = sheet.accused;
  form.deceased.value = sheet.deceased ?? "";
  form.act_alleged.value = sheet.act_alleged;
  form.background.value = sheet.background;
  form.agreed_facts.value = sheet.agreed_facts.join("\n");
  form.question.value = sheet.question;
  showProblems([]);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const sheet = readForm();

  const courtesy = checkChargeSheet(sheet);
  if (courtesy.length) {
    showProblems(courtesy);
    return;
  }
  showProblems([]);

  $("#go").disabled = true;
  note.textContent = "putting the case…";

  try {
    const stored = await post("/api/cases", sheet);
    if (stored.status === 422) {
      showProblems(stored.body.problems ?? []);
      return;
    }
    if (stored.status !== 201) throw new Error(stored.body.error ?? "the case was not stored");

    const run = await post("/api/runs", { caseId: stored.body.id });
    if (run.status !== 201) throw new Error(run.body.error ?? "the run did not start");

    await post("/api/deliberate-background", { runId: run.body.id });
    note.textContent = "the panel is sitting…";
    await follow(run.body.id);
  } catch (error) {
    note.textContent = "";
    problems.replaceChildren(el("div", "banner", String(error.message ?? error)));
  } finally {
    $("#go").disabled = false;
  }
});

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

async function follow(runId) {
  for (;;) {
    const response = await fetch(`/api/runs?id=${encodeURIComponent(runId)}`);
    if (!response.ok) throw new Error("the run could not be read");
    const view = await response.json();
    render(view);
    if (view.finished) {
      note.textContent = "";
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const CROSSES = { defence: "not justified", prosecution: "justified" };

function render(view) {
  result.hidden = false;
  result.replaceChildren();

  if (view.finished && !view.isFinishedResult) {
    const why =
      view.failedAtWave === "advocates"
        ? "A representative never returned an argument in the shape it was asked for, so the judges were never convened."
        : "A judge never returned an opinion in the shape it was asked for. The opinions that did arrive are below, and this run is not a finished result.";
    result.append(el("div", "banner", why));
  }

  result.append(el("h2", null, `The representatives · case ${view.chargeSheet.reference}`));
  const seats = el("div", "seats");
  for (const advocate of view.advocates) {
    const card = el("div", `card ${advocate.status === "complete" ? advocate.seat : "failed"}`);
    card.append(el("div", "seat", `${advocate.seat} seat`));
    card.append(el("h3", null, advocate.name));
    if (advocate.position) {
      const crossed = CROSSES[advocate.seat] === advocate.position;
      card.append(el("div", `position${crossed ? " crossed" : ""}`, advocate.position));
      const list = el("ol", "reasons");
      for (const reason of advocate.reasons ?? []) list.append(el("li", null, reason));
      card.append(list);
    } else {
      card.append(el("div", "failure", advocate.error ?? "no argument arrived"));
    }
    card.append(el("div", "quiet small", advocate.model));
    seats.append(card);
  }
  result.append(seats);
  if (!view.advocates.length) result.append(el("p", "quiet", "waiting for the representatives…"));

  result.append(el("h2", null, "The judges"));
  if (!view.judges.length) {
    result.append(el("p", "quiet", view.finished ? "The judges were never convened." : "waiting for the judges…"));
  } else {
    const opinions = el("div", "opinions");
    for (const judge of view.judges) {
      const card = el("div", `card${judge.status === "complete" ? "" : " failed"}`);
      card.append(el("h3", null, judge.name));
      if (judge.verdict) {
        card.append(el("div", "verdict", judge.verdict));
        card.append(el("div", "ground", judge.controllingGround ?? ""));
        const list = el("ol", "reasons");
        for (const reason of judge.reasons ?? []) list.append(el("li", null, reason));
        card.append(list);
      } else {
        card.append(el("div", "failure", judge.error ?? "no opinion arrived"));
      }
      card.append(el("div", "quiet small", judge.model));
      opinions.append(card);
    }
    result.append(opinions);
  }

  result.append(el("h2", null, "What the run cost"));
  result.append(economics(view));
}

const money = (value) => (value === null ? "—" : `$${value.toFixed(6)}`);
const rate = (value) => (value === null ? "—" : `$${value.toFixed(3)}`);

function economics(view) {
  const wrap = el("div", "scroll");
  const table = el("table");
  const head = el("tr");
  for (const heading of [
    "agent", "model", "in", "out", "$/M in", "$/M out", "cost", "ms",
  ]) head.append(el("th", null, heading));
  table.append(el("thead").appendChild(head).parentNode);

  const body = el("tbody");
  for (const call of [...view.advocates, ...view.judges]) {
    const tr = el("tr");
    const first = el("td");
    first.append(document.createTextNode(call.name));
    if (call.isRetry) first.append(document.createTextNode(" "), el("span", "tag", "retry"));
    if (call.status !== "complete") first.append(document.createTextNode(" "), el("span", "tag", call.status));
    tr.append(first);
    const model = el("td");
    model.append(document.createTextNode(call.model));
    if (call.routedElsewhere) model.append(document.createTextNode(" "), el("span", "tag", "routed"));
    tr.append(model);
    tr.append(el("td", null, String(call.tokensIn)));
    tr.append(el("td", null, String(call.tokensOut)));
    tr.append(el("td", null, rate(call.priceInPerM)));
    tr.append(el("td", null, rate(call.priceOutPerM)));
    tr.append(el("td", null, money(call.costUsd)));
    tr.append(el("td", null, call.latencyMs === null ? "—" : String(call.latencyMs)));
    body.append(tr);
  }
  table.append(body);

  const foot = el("tr");
  foot.append(el("td", null, `${view.economics.calls} calls`));
  foot.append(el("td", null, ""));
  foot.append(el("td", null, String(view.economics.tokensIn)));
  foot.append(el("td", null, String(view.economics.tokensOut)));
  foot.append(el("td", null, ""));
  foot.append(el("td", null, ""));
  foot.append(el("td", null, money(view.economics.costUsd)));
  foot.append(el("td", null, view.economics.wallMs === null ? "—" : String(view.economics.wallMs)));
  table.append(el("tfoot").appendChild(foot).parentNode);

  wrap.append(table);
  return wrap;
}
