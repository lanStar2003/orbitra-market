// addons/usage/core/analysis.js
var num = (v) => Number(v) || 0;
var pad = (n) => String(n).padStart(2, "0");
var dayOf = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
var addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return dayOf(new Date(y, m - 1, d + n).getTime());
};
var daysBetween = (a, b) => {
  const out = [];
  for (let d = a; d <= b && out.length < 1200; d = addDays(d, 1)) out.push(d);
  return out;
};
var DAY = /^\d{4}-\d{2}-\d{2}$/;
var parse = (v, fallback) => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
var SOURCES = Object.freeze({ conductor: "\u603B\u6307\u6325", agent: "Agent", subagent: "\u5B50 Agent", evolve: "\u81EA\u8FDB\u5316", reviewer: "\u81EA\u52A8\u5BA1\u67E5", "code-review": "\u4EE3\u7801\u5BA1\u67E5", judge: "\u8BB0\u5FC6\u5224\u65AD", retrieval: "\u68C0\u7D22\u6A21\u578B", shadow: "\u5F71\u5B50\u91CD\u653E", direct: "\u76F4\u63A5\u4F7F\u7528" });
var SHELLS = /* @__PURE__ */ new Set(["pwsh", "bash", "shell", "powershell", "sh", "exec"]);
var EDITS = /* @__PURE__ */ new Set(["edit", "write", "multi_edit"]);
var EXPLORE = /* @__PURE__ */ new Set(["read", "grep", "web_fetch", "web_search", "read_image", "glob", "mnemon_document_search"]);
var DELEGATE = /* @__PURE__ */ new Set(["subagent", "send_message", "dispatch_tasks", "tell_task", "request_evolution"]);
var KINDS = { coding: "\u5199\u4EE3\u7801", debugging: "\u4FEE\u95EE\u9898", feature: "\u65B0\u529F\u80FD", refactor: "\u91CD\u6784", testing: "\u8DD1\u6D4B\u8BD5", exploration: "\u67E5\u8D44\u6599", planning: "\u89C4\u5212", delegation: "\u6D3E\u6D3B", git: "Git", build: "\u6784\u5EFA\u53D1\u5E03", brainstorm: "\u51FA\u4E3B\u610F", conversation: "\u804A\u5929", general: "\u5176\u4ED6" };
function kindOf({ title = "", tools = [], commands = [] }) {
  const has = (set) => tools.some((t) => set.has(t));
  const says = (re) => re.test(title);
  if (!tools.length) return says(/设计|方案|想法|怎么样|要不要|是否|brainstorm|what if/i) ? "brainstorm" : "conversation";
  if (commands.some((c) => /^(npm|pnpm|yarn) (run )?test|^node --test|^pytest|^vitest|^jest/.test(c)) && !has(EDITS)) return "testing";
  if (commands.some((c) => /^git (push|commit|merge|rebase|tag)/.test(c)) && !has(EDITS)) return "git";
  if (commands.some((c) => /^(npm (run )?build|docker |pm2 |node scripts\/build)/.test(c)) && !has(EDITS)) return "build";
  if (has(EDITS)) {
    if (says(/报错|修复|修好|修一下|错误|失败|崩|不行|bug|fix|error/i)) return "debugging";
    if (says(/重构|重命名|简化|整理|refactor|rename|simplify/i)) return "refactor";
    if (says(/新增|加一个|做一个|实现|创建|插件|add|create|implement/i)) return "feature";
    return "coding";
  }
  if (has(DELEGATE)) return "delegation";
  if (tools.includes("todo_write")) return "planning";
  if (has(EXPLORE) || has(SHELLS)) return "exploration";
  return "general";
}
function hadRetry(calls) {
  const edited = /* @__PURE__ */ new Set();
  const touchedSinceRun = /* @__PURE__ */ new Set();
  for (const c of calls) {
    if (SHELLS.has(c.name)) {
      for (const f of touchedSinceRun) edited.add(f);
      touchedSinceRun.clear();
    } else if (EDITS.has(c.name) && c.detail) {
      if (edited.has(c.detail)) return true;
      touchedSinceRun.add(c.detail);
    }
  }
  return false;
}
var median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
var percentile = (list, p) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
var hitOf = (r) => {
  const whole = num(r.input) + num(r.cache_read) + num(r.cache_write);
  return whole ? num(r.cache_read) / whole : 0;
};
var TOTALS = `COUNT(*) AS steps, COUNT(DISTINCT COALESCE(job_id, id)) AS jobs, SUM(input) AS input, SUM(output) AS output, SUM(cache_read) AS cache_read, SUM(cache_write) AS cache_write,
  COALESCE(SUM(cost), 0) AS cost, COALESCE(SUM(saved), 0) AS saved, COALESCE(SUM(off_saving), 0) AS off_saving, SUM(cost IS NULL) AS unpriced`;
var totalsView = (r) => ({
  steps: num(r?.steps),
  jobs: num(r?.jobs),
  input: num(r?.input),
  output: num(r?.output),
  cacheRead: num(r?.cache_read),
  cacheWrite: num(r?.cache_write),
  tokens: num(r?.input) + num(r?.output) + num(r?.cache_read) + num(r?.cache_write),
  cost: num(r?.cost),
  saved: num(r?.saved),
  offSaving: num(r?.off_saving),
  unpriced: num(r?.unpriced),
  cacheHit: hitOf(r ?? {})
});
function createAnalysis({ db, now = Date.now, get = () => null }) {
  const has = (table) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
  const today = () => dayOf(now());
  const agentName = (id) => {
    try {
      return get("agents")?.get?.(id)?.name ?? id;
    } catch {
      return id;
    }
  };
  const providerNames = () => {
    if (!has("model_providers")) return {};
    return Object.fromEntries(db.prepare("SELECT id, name FROM model_providers").all().map((r) => [r.id, r.name]));
  };
  function filterOf(query) {
    const get_ = (k) => {
      const v = query?.get ? query.get(k) : query?.[k];
      return v === null || v === void 0 || v === "" ? null : String(v);
    };
    const end = today();
    const from = DAY.test(get_("from") ?? "") ? get_("from") : addDays(end, -29);
    const to = DAY.test(get_("to") ?? "") ? get_("to") : end;
    return { from, to, model: get_("model"), agent: get_("agent"), source: get_("source"), provider: get_("provider"), conversation: get_("conversation") };
  }
  function whereOf(f, { dated = true } = {}) {
    const parts = [];
    const args = [];
    if (dated) {
      parts.push("day >= ? AND day <= ?");
      args.push(f.from, f.to);
    }
    if (f.model) {
      parts.push("model = ?");
      args.push(f.model);
    }
    if (f.agent === "*") parts.push("source = 'conductor'");
    else if (f.agent) {
      parts.push("agent_id = ?");
      args.push(f.agent);
    }
    if (f.source) {
      parts.push("source = ?");
      args.push(f.source);
    }
    if (f.provider) {
      parts.push("provider_id = ?");
      args.push(f.provider);
    }
    if (f.conversation) {
      parts.push("conversation_id = ?");
      args.push(f.conversation);
    }
    return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", args };
  }
  const andRange = (w, from, to) => ({ sql: `${w.sql ? `${w.sql} AND` : "WHERE"} day >= ? AND day <= ?`, args: [...w.args, from, to] });
  const totals = (w) => totalsView(db.prepare(`SELECT ${TOTALS} FROM ledger_steps ${w.sql}`).get(...w.args));
  const notesWhere = (f) => {
    const parts = ["n.day >= ? AND n.day <= ?"];
    const args = [f.from, f.to];
    if (f.agent === "*") parts.push("n.agent_id IS NULL");
    else if (f.agent) {
      parts.push("n.agent_id = ?");
      args.push(f.agent);
    }
    if (f.conversation) {
      parts.push("n.conversation_id = ?");
      args.push(f.conversation);
    }
    return { sql: `WHERE ${parts.join(" AND ")}`, args };
  };
  function jobsOf(f) {
    const w = whereOf(f);
    const rows = db.prepare(`SELECT job_id, ${TOTALS}, MAX(agent_id) AS agent_id, MAX(source) AS source FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} job_id IS NOT NULL GROUP BY job_id`).all(...w.args);
    if (!rows.length) return [];
    const titles = /* @__PURE__ */ new Map();
    for (const r of db.prepare(`SELECT id, title, status FROM jobs WHERE id IN (SELECT DISTINCT job_id FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} job_id IS NOT NULL)`).all(...w.args)) titles.set(r.id, r);
    const calls = /* @__PURE__ */ new Map();
    const n = notesWhere(f);
    for (const r of db.prepare(`SELECT n.job_id, n.name, n.detail FROM ledger_notes n ${n.sql} AND n.kind = 'tool' AND n.job_id IS NOT NULL ORDER BY n.at`).all(...n.args)) {
      const list = calls.get(r.job_id) ?? [];
      list.push(r);
      calls.set(r.job_id, list);
    }
    const outcomes = /* @__PURE__ */ new Map();
    if (has("tasks")) for (const r of db.prepare("SELECT job_id, status, outcome FROM tasks WHERE job_id IS NOT NULL").all()) outcomes.set(r.job_id, { status: r.status, outcome: parse(r.outcome)?.state ?? null });
    return rows.map((r) => {
      const list = calls.get(r.job_id) ?? [];
      const job = titles.get(r.job_id);
      const tools2 = [...new Set(list.map((c) => c.name))];
      const commands = list.filter((c) => SHELLS.has(c.name) && c.detail).map((c) => c.detail);
      const edits = list.filter((c) => EDITS.has(c.name)).length;
      return { id: r.job_id, ...totalsView(r), agentId: r.agent_id, source: r.source, title: job?.title ?? "", status: job?.status ?? "done", task: outcomes.get(r.job_id) ?? null, kind: kindOf({ title: job?.title ?? "", tools: tools2, commands }), edits, retried: edits > 0 && hadRetry(list) };
    });
  }
  function daily(w, f) {
    const rows = new Map(db.prepare(`SELECT day, ${TOTALS},
      COALESCE(SUM(input * json_extract(price, '$.input')), 0) / 1e6 AS cost_input, COALESCE(SUM(output * json_extract(price, '$.output')), 0) / 1e6 AS cost_output,
      COALESCE(SUM(cache_read * json_extract(price, '$.cacheRead')), 0) / 1e6 AS cost_cache, COALESCE(SUM(cache_write * json_extract(price, '$.cacheWrite')), 0) / 1e6 AS cost_write
      FROM ledger_steps ${w.sql} GROUP BY day`).all(...w.args).map((r) => [r.day, r]));
    return daysBetween(f.from, f.to).map((day) => {
      const r = rows.get(day);
      return { day, ...totalsView(r), costInput: num(r?.cost_input), costOutput: num(r?.cost_output), costCache: num(r?.cost_cache), costWrite: num(r?.cost_write) };
    });
  }
  function overview(f) {
    const w = whereOf(f);
    const u = whereOf(f, { dated: false });
    const end = today();
    const monthStart = `${end.slice(0, 7)}-01`;
    const dayNo = Number(end.slice(8));
    const [y, m] = end.split("-").map(Number);
    const inMonth = new Date(y, m, 0).getDate();
    const lastStart = dayOf(new Date(y, m - 2, 1).getTime());
    const lastEnd = dayOf(new Date(y, m - 2, Math.min(dayNo, new Date(y, m - 1, 0).getDate())).getTime());
    const lastWhole = dayOf(new Date(y, m - 1, 0).getTime());
    const week = totals(andRange(u, addDays(end, -7), addDays(end, -1)));
    const fortnight = totals(andRange(u, addDays(end, -13), end));
    const month = totals(andRange(u, monthStart, end));
    const period = totals(w);
    const days = daily(w, f);
    const jobs = jobsOf(f);
    const edited = jobs.filter((j) => j.edits > 0);
    const oneShot = edited.length ? edited.filter((j) => !j.retried).length / edited.length : null;
    const wasted = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").reduce((n, j) => n + j.cost, 0);
    const wasteShare = period.cost ? wasted / period.cost : 0;
    const parts = [[period.cacheHit, 40], ...oneShot === null ? [] : [[oneShot, 30]], [1 - wasteShare, 30]];
    const score = Math.round(parts.reduce((n, [v, k]) => n + v * k, 0) / parts.reduce((n, [, k]) => n + k, 0) * 100);
    const active = days.filter((d) => d.cost > 0);
    const peak = active.reduce((best, d) => d.cost > (best?.cost ?? -1) ? d : best, null);
    const heat = db.prepare(`SELECT dow, hour, COALESCE(SUM(cost), 0) AS cost, COUNT(*) AS steps FROM ledger_steps ${w.sql} GROUP BY dow, hour`).all(...w.args);
    const tier = db.prepare(`SELECT tier, COALESCE(SUM(cost), 0) AS cost FROM ledger_steps ${w.sql} GROUP BY tier`).all(...w.args);
    return {
      from: f.from,
      to: f.to,
      today: end,
      period,
      todayTotals: totals(andRange(u, end, end)),
      yesterday: totals(andRange(u, addDays(end, -1), addDays(end, -1))),
      weekAvg: week.cost / 7,
      month: { ...month, last: totals(andRange(u, lastStart, lastEnd)).cost, lastWhole: totals(andRange(u, lastStart, lastWhole)).cost, projected: month.cost + fortnight.cost / 14 * (inMonth - dayNo), dayNo, inMonth, left: inMonth - dayNo },
      days,
      peak: peak ? { day: peak.day, cost: peak.cost } : null,
      activeDays: active.length,
      avgPerActiveDay: active.length ? period.cost / active.length : 0,
      heat,
      tier: Object.fromEntries(tier.map((r) => [r.tier ?? "none", r.cost])),
      score: { value: score, cacheHit: period.cacheHit, oneShot, wasteShare, wasted, edited: edited.length },
      composition: days.reduce((o, d) => ({ input: o.input + d.costInput, output: o.output + d.costOutput, cache: o.cache + d.costCache, write: o.write + d.costWrite }), { input: 0, output: 0, cache: 0, write: 0 })
    };
  }
  const DIMENSIONS = {
    model: { column: "model", label: (id) => id ?? "\u672A\u77E5" },
    provider: { column: "provider_id", label: (id, names) => names[id] ?? id ?? "\u672A\u77E5" },
    agent: { column: "CASE WHEN agent_id IS NOT NULL THEN agent_id WHEN source = 'conductor' THEN '*' ELSE source END", label: (id) => id === "*" ? "\u603B\u6307\u6325" : SOURCES[id] ?? agentName(id) },
    source: { column: "source", label: (id) => SOURCES[id] ?? id },
    conversation: { column: "conversation_id", label: (id, _, extra) => extra.get(id) ?? (id ? "\u5DF2\u5220\u9664\u7684\u5BF9\u8BDD" : "\u4E0D\u5C5E\u4E8E\u5BF9\u8BDD") },
    plan: { column: "plan_id", label: (id, _, extra) => extra.get(id) ?? (id ? "\u5DF2\u5220\u9664\u7684\u4EFB\u52A1\u56FE" : "\u4E0D\u5C5E\u4E8E\u4EFB\u52A1\u56FE") },
    task: { column: "task_id", label: (id, _, extra) => extra.get(id) ?? (id ? "\u5DF2\u5220\u9664\u7684\u4EFB\u52A1" : "\u4E0D\u5C5E\u4E8E\u4EFB\u52A1") },
    project: { column: "cwd", label: (id) => projectName(id) },
    effort: { column: "effort", label: (id) => ({ off: "\u5173\u95ED", low: "\u4F4E", medium: "\u4E2D", high: "\u9AD8", max: "\u6700\u9AD8", xhigh: "\u8D85\u9AD8" })[id] ?? id ?? "\u9ED8\u8BA4" },
    tier: { column: "tier", label: (id) => ({ peak: "\u9AD8\u5CF0", off: "\u4F4E\u8C37" })[id] ?? "\u4E0D\u5206\u65F6\u6BB5" },
    price: { column: "price_source", label: (id) => ({ owner: "\u4F60\u586B\u7684\u4EF7", official: "\u5B98\u65B9\u4EF7", library: "\u6A21\u578B\u5E93", "library-other": "\u6A21\u578B\u5E93\uFF08\u5176\u4ED6\u7EBF\u8DEF\uFF09", none: "\u6CA1\u6709\u4EF7\u683C" })[id] ?? id },
    hour: { column: "hour", label: (id) => `${pad(id)}:00` },
    dow: { column: "dow", label: (id) => `\u5468${"\u65E5\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D"[id]}` }
  };
  const projectName = (cwd) => {
    if (!cwd) return "\u4E0D\u5728\u5DE5\u4F5C\u533A";
    const p = String(cwd).replace(/\\/g, "/");
    const agent = /\/workspaces\/agents\/([^/]+)/.exec(p);
    if (/\/workspaces\/agents\/evolve\/code\//.test(p)) return "\u81EA\u8FDB\u5316\u7684\u6E90\u7801\u526F\u672C";
    if (agent) return `${agentName(agent[1])} \u7684\u5DE5\u4F5C\u533A`;
    if (/\/workspaces\/conductor/.test(p)) return "\u603B\u6307\u6325\u7684\u5DE5\u4F5C\u533A";
    return p.split("/").filter(Boolean).slice(-2).join("/");
  };
  const titlesOf = (by) => {
    if (by === "conversation" && has("conversations")) return new Map(db.prepare("SELECT id, title FROM conversations").all().map((r) => [r.id, r.title]));
    if (by === "plan" && has("plans")) return new Map(db.prepare("SELECT id, goal FROM plans").all().map((r) => [r.id, r.goal]));
    if (by === "task" && has("tasks")) return new Map(db.prepare("SELECT id, title FROM tasks").all().map((r) => [r.id, r.title]));
    return /* @__PURE__ */ new Map();
  };
  function breakdown(f, by = "model") {
    if (by === "kind") {
      const groups = /* @__PURE__ */ new Map();
      for (const j of jobsOf(f)) {
        const g = groups.get(j.kind) ?? { key: j.kind, label: KINDS[j.kind], cost: 0, tokens: 0, steps: 0, jobs: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, saved: 0, edited: 0, retried: 0 };
        g.cost += j.cost;
        g.tokens += j.tokens;
        g.steps += j.steps;
        g.jobs++;
        g.input += j.input;
        g.output += j.output;
        g.cacheRead += j.cacheRead;
        g.cacheWrite += j.cacheWrite;
        g.saved += j.saved;
        if (j.edits) {
          g.edited++;
          if (j.retried) g.retried++;
        }
        groups.set(j.kind, g);
      }
      const rows2 = [...groups.values()].sort((a, b) => b.cost - a.cost).map((g) => ({ ...g, cacheHit: hitOf({ input: g.input, cache_read: g.cacheRead, cache_write: g.cacheWrite }), oneShot: g.edited ? 1 - g.retried / g.edited : null }));
      return { by, total: rows2.reduce((n, r) => n + r.cost, 0), rows: rows2 };
    }
    const d = DIMENSIONS[by] ?? DIMENSIONS.model;
    const w = whereOf(f);
    const names = providerNames();
    const extra = titlesOf(by);
    const rows = db.prepare(`SELECT ${d.column} AS key, ${TOTALS}, COALESCE(SUM(ms), 0) AS ms FROM ledger_steps ${w.sql} GROUP BY key ORDER BY cost DESC, steps DESC LIMIT 300`).all(...w.args).map((r) => ({ key: r.key, label: d.label(r.key, names, extra), ...totalsView(r), speed: r.ms ? num(r.output) * 1e3 / r.ms : null }));
    return { by, total: rows.reduce((n, r) => n + r.cost, 0), rows };
  }
  function facets(f) {
    const w = whereOf({ ...f, model: null, agent: null, source: null, provider: null });
    const col = (c, label) => db.prepare(`SELECT ${c} AS key, COALESCE(SUM(cost), 0) AS cost FROM ledger_steps ${w.sql} GROUP BY key ORDER BY cost DESC`).all(...w.args).filter((r) => r.key !== null).map((r) => ({ key: r.key, label: label(r.key), cost: r.cost }));
    const names = providerNames();
    return { models: col("model", (k) => k), agents: col(DIMENSIONS.agent.column, (k) => DIMENSIONS.agent.label(k)), sources: col("source", (k) => SOURCES[k] ?? k), providers: col("provider_id", (k) => names[k] ?? k) };
  }
  function sessions(f, { sort = "cost", limit = 50, offset = 0, q = null } = {}) {
    const w = whereOf(f);
    const order = sort === "recent" ? "last DESC" : sort === "tokens" ? "tokens DESC" : "cost DESC";
    const rows = db.prepare(`SELECT root_session AS id, MIN(at) AS first, MAX(at) AS last, ${TOTALS}, SUM(input + output + cache_read + cache_write) AS tokens, MAX(conversation_id) AS conversation_id, MAX(agent_id) AS agent_id, MAX(model) AS model, COUNT(DISTINCT session_id) AS session_count, MIN(source) AS source
      FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} root_session IS NOT NULL GROUP BY root_session ORDER BY ${order}`).all(...w.args);
    const convo = titlesOf("conversation");
    const jobTitle = db.prepare("SELECT title, kind, status FROM jobs WHERE session_id = ? ORDER BY created_at LIMIT 1");
    const view = rows.map((r) => {
      const job = jobTitle.get(r.id);
      return { id: r.id, first: r.first, last: r.last, ...totalsView(r), conversationId: r.conversation_id, title: convo.get(r.conversation_id) ?? job?.title ?? r.id, status: job?.status ?? null, agent: r.agent_id ? agentName(r.agent_id) : "\u603B\u6307\u6325", model: r.model, subagents: Math.max(0, r.session_count - 1) };
    }).filter((r) => !q || r.title.includes(q) || r.agent.includes(q));
    return { total: view.length, sessions: view.slice(offset, offset + Math.min(limit, 200)) };
  }
  function session(id) {
    const steps = db.prepare("SELECT * FROM ledger_steps WHERE root_session = ? ORDER BY at, id LIMIT 3000").all(String(id));
    if (!steps.length) return null;
    const titles = /* @__PURE__ */ new Map();
    const jobOf = db.prepare("SELECT id, title, status, kind, agent_id FROM jobs WHERE id = ?");
    const turns = /* @__PURE__ */ new Map();
    for (const s of steps) {
      const key = `${s.session_id}.${s.turn}`;
      if (s.job_id && !titles.has(s.job_id)) titles.set(s.job_id, jobOf.get(s.job_id));
      const t = turns.get(key) ?? { key, session: s.session_id, sub: s.source === "subagent", turn: s.turn, jobId: s.job_id, title: titles.get(s.job_id)?.title ?? "", status: titles.get(s.job_id)?.status ?? null, first: s.at, steps: [], cost: 0, tokens: 0 };
      const tokens = s.input + s.output + s.cache_read + s.cache_write;
      t.steps.push({ id: s.id, at: s.at, step: s.step, model: s.model, effort: s.effort, input: s.input, output: s.output, cacheRead: s.cache_read, cacheWrite: s.cache_write, cost: s.cost, tier: s.tier, tools: parse(s.tools, []), ms: s.ms, context: s.input + s.cache_read + s.cache_write, price: parse(s.price, null) });
      t.cost += num(s.cost);
      t.tokens += tokens;
      turns.set(key, t);
    }
    const notes = db.prepare("SELECT kind, name, ok, ms, detail FROM ledger_notes WHERE root_session = ? ORDER BY at").all(String(id));
    const conversationId = steps.find((s) => s.conversation_id)?.conversation_id ?? null;
    const job = steps.find((s) => s.job_id);
    return {
      id,
      conversationId,
      title: titlesOf("conversation").get(conversationId) ?? titles.get(job?.job_id)?.title ?? id,
      agent: job?.agent_id ? agentName(job.agent_id) : "\u603B\u6307\u6325",
      totals: totalsView(db.prepare(`SELECT ${TOTALS} FROM ledger_steps WHERE root_session = ?`).get(String(id))),
      first: steps[0].at,
      last: steps.at(-1).at,
      turns: [...turns.values()],
      context: steps.filter((s) => s.source !== "subagent").map((s) => s.input + s.cache_read + s.cache_write),
      notes: { tools: notes.filter((n) => n.kind === "tool").length, failed: notes.filter((n) => n.kind === "tool" && !n.ok).length, retries: notes.filter((n) => n.kind === "retry").length, approvals: notes.filter((n) => n.kind === "approval").length, approvalMs: notes.filter((n) => n.kind === "approval").reduce((m, n) => m + num(n.ms), 0) },
      truncated: steps.length === 3e3
    };
  }
  function tools(f) {
    const n = notesWhere(f);
    const w = whereOf(f);
    const list = db.prepare(`SELECT n.name, COUNT(*) AS calls, SUM(n.ok = 0) AS failed, COALESCE(SUM(n.ms), 0) AS ms FROM ledger_notes n ${n.sql} AND n.kind = 'tool' GROUP BY n.name ORDER BY calls DESC`).all(...n.args);
    const durations = /* @__PURE__ */ new Map();
    for (const r of db.prepare(`SELECT n.name, n.ms FROM ledger_notes n ${n.sql} AND n.kind = 'tool' AND n.ms IS NOT NULL`).all(...n.args)) {
      const d = durations.get(r.name) ?? [];
      d.push(r.ms);
      durations.set(r.name, d);
    }
    const shares = /* @__PURE__ */ new Map();
    let toolless = 0;
    for (const s of db.prepare(`SELECT tools, cost FROM ledger_steps ${w.sql}`).all(...w.args)) {
      const names = parse(s.tools, []);
      if (!names.length) {
        toolless += num(s.cost);
        continue;
      }
      for (const name of names) shares.set(name, (shares.get(name) ?? 0) + num(s.cost) / names.length);
    }
    const top = (kind, names, limit = 12) => db.prepare(`SELECT n.detail, COUNT(*) AS calls, COALESCE(SUM(n.ms), 0) AS ms, SUM(n.ok = 0) AS failed FROM ledger_notes n ${n.sql} AND n.kind = 'tool' AND n.name IN (${names.map(() => "?").join(", ")}) AND n.detail IS NOT NULL GROUP BY n.detail ORDER BY calls DESC LIMIT ?`).all(...n.args, ...names, limit);
    const approvals = db.prepare(`SELECT n.name, COUNT(*) AS asked, SUM(n.ok = 0) AS denied, COALESCE(SUM(n.ms), 0) AS ms FROM ledger_notes n ${n.sql} AND n.kind = 'approval' GROUP BY n.name ORDER BY asked DESC`).all(...n.args);
    const retries = db.prepare(`SELECT n.name, n.detail, COUNT(*) AS times, COALESCE(SUM(n.ms), 0) AS ms FROM ledger_notes n ${n.sql} AND n.kind = 'retry' GROUP BY n.name, n.detail ORDER BY times DESC`).all(...n.args);
    return {
      tools: list.map((r) => ({ name: r.name, calls: r.calls, failed: num(r.failed), ms: r.ms, avgMs: r.calls ? r.ms / r.calls : 0, p95Ms: percentile(durations.get(r.name) ?? [], 0.95), cost: shares.get(r.name) ?? 0 })),
      toolless,
      commands: top("tool", [...SHELLS]),
      files: top("tool", ["read", "read_image"]),
      edited: top("tool", [...EDITS]),
      approvals,
      approvalMs: approvals.reduce((m, r) => m + r.ms, 0),
      retries
    };
  }
  function efficiency(f) {
    const w = whereOf(f);
    const jobs = jobsOf(f);
    const period = totals(w);
    const edited = jobs.filter((j) => j.edits > 0);
    const finished = jobs.filter((j) => j.task);
    const costs = finished.map((j) => j.cost);
    const group = (name, list) => ({ name, jobs: list.length, cost: list.reduce((n2, j) => n2 + j.cost, 0) });
    const state = (j) => j.task?.outcome ?? j.task?.status ?? j.status;
    const byAgent = /* @__PURE__ */ new Map();
    for (const j of jobs) {
      const key = j.agentId ?? (j.source === "conductor" ? "*" : j.source);
      const a = byAgent.get(key) ?? { key, label: DIMENSIONS.agent.label(key), jobs: 0, cost: 0, edited: 0, retried: 0, failed: 0, input: 0, cacheRead: 0, cacheWrite: 0, steps: 0 };
      a.jobs++;
      a.cost += j.cost;
      a.input += j.input;
      a.cacheRead += j.cacheRead;
      a.cacheWrite += j.cacheWrite;
      a.steps += j.steps;
      if (j.edits) {
        a.edited++;
        if (j.retried) a.retried++;
      }
      if (j.status === "failed" || j.status === "cancelled") a.failed++;
      byAgent.set(key, a);
    }
    const n = notesWhere(f);
    const retries = db.prepare(`SELECT n.day, COUNT(*) AS times, COALESCE(SUM(n.ms), 0) AS ms FROM ledger_notes n ${n.sql} AND n.kind = 'retry' GROUP BY n.day`).all(...n.args);
    const context = db.prepare(`SELECT MAX(input + cache_read + cache_write) AS biggest, AVG(input + cache_read + cache_write) AS average FROM ledger_steps ${w.sql}`).get(...w.args);
    const speed = db.prepare(`SELECT model, SUM(output) AS output, SUM(ms) AS ms, AVG(ms) AS avg_ms, COUNT(*) AS steps FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} ms IS NOT NULL AND ms > 0 GROUP BY model ORDER BY steps DESC`).all(...w.args);
    const days = daily(w, f).filter((d) => d.steps > 0).map((d) => ({ day: d.day, cacheHit: d.cacheHit, cost: d.cost, tokens: d.tokens }));
    return {
      period,
      oneShot: edited.length ? { rate: edited.filter((j) => !j.retried).length / edited.length, jobs: edited.length, retried: edited.filter((j) => j.retried).length } : null,
      waste: {
        failed: group("\u5931\u8D25", jobs.filter((j) => j.status === "failed")),
        cancelled: group("\u88AB\u505C\u6B62", jobs.filter((j) => j.status === "cancelled")),
        blocked: group("\u53D7\u963B", finished.filter((j) => state(j) === "blocked")),
        dropped: group("\u4E0D\u7528\u505A", finished.filter((j) => state(j) === "dropped")),
        share: period.cost ? jobs.filter((j) => j.status === "failed" || j.status === "cancelled").reduce((s, j) => s + j.cost, 0) / period.cost : 0
      },
      tasks: { count: finished.length, average: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0, median: median(costs), biggest: costs.length ? Math.max(...costs) : 0, top: finished.sort((a, b) => b.cost - a.cost).slice(0, 8).map((j) => ({ id: j.id, title: j.title, cost: j.cost, state: state(j) })) },
      retries: { times: retries.reduce((c, r) => c + r.times, 0), ms: retries.reduce((c, r) => c + r.ms, 0), byDay: retries },
      context: { biggest: num(context?.biggest), average: num(context?.average) },
      speed: speed.map((r) => ({ model: r.model, tokensPerSecond: r.ms ? r.output * 1e3 / r.ms : 0, avgMs: num(r.avg_ms), steps: r.steps })),
      agents: [...byAgent.values()].sort((a, b) => b.cost - a.cost).map((a) => ({ ...a, cacheHit: hitOf({ input: a.input, cache_read: a.cacheRead, cache_write: a.cacheWrite }), oneShot: a.edited ? 1 - a.retried / a.edited : null })),
      days
    };
  }
  function compare(f, a, b, by = "model") {
    const side = (range) => {
      const g = { ...f, ...range };
      const w = whereOf(g);
      const jobs = jobsOf(g);
      const edited = jobs.filter((j) => j.edits > 0);
      return { ...range, days: daysBetween(range.from, range.to).length, ...totals(w), oneShot: edited.length ? 1 - edited.filter((j) => j.retried).length / edited.length : null, costPerJob: jobs.length ? jobs.reduce((n, j) => n + j.cost, 0) / jobs.length : 0, rows: breakdown(g, by).rows };
    };
    const left = side(a);
    const right = side(b);
    const keys = /* @__PURE__ */ new Map();
    for (const r of left.rows) keys.set(r.key, { key: r.key, label: r.label, a: r.cost, b: 0 });
    for (const r of right.rows) {
      const k = keys.get(r.key) ?? { key: r.key, label: r.label, a: 0, b: 0 };
      k.b = r.cost;
      keys.set(r.key, k);
    }
    const { rows: _a, ...aView } = left;
    const { rows: _b, ...bView } = right;
    return { a: aView, b: bView, by, movers: [...keys.values()].map((k) => ({ ...k, change: k.b - k.a })).sort((x, y) => Math.abs(y.change) - Math.abs(x.change)).slice(0, 12) };
  }
  function compareModels(f, modelA, modelB) {
    const side = (model) => {
      const g = { ...f, model };
      const w = whereOf(g);
      const t = totals(w);
      const jobs = jobsOf(g);
      const edited = jobs.filter((j) => j.edits > 0);
      const speed = db.prepare(`SELECT SUM(output) AS output, SUM(ms) AS ms FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} ms IS NOT NULL AND ms > 0`).get(...w.args);
      return { model, ...t, costPerStep: t.steps ? t.cost / t.steps : 0, costPerJob: jobs.length ? t.cost / jobs.length : 0, oneShot: edited.length ? 1 - edited.filter((j) => j.retried).length / edited.length : null, failed: jobs.length ? jobs.filter((j) => j.status === "failed").length / jobs.length : 0, tokensPerSecond: speed?.ms ? num(speed.output) * 1e3 / speed.ms : null };
    };
    return { a: side(modelA), b: side(modelB) };
  }
  function tips(f) {
    const out = [];
    const add = (t) => out.push(t);
    const w = whereOf(f);
    const period = totals(w);
    const yuan = (n2) => Math.round(n2 * 100) / 100;
    if (period.steps === 0) return { period, tips: [] };
    if (period.unpriced) add({ id: "unpriced", level: "serious", title: `${period.unpriced} \u6B65\u6CA1\u6709\u4EF7\u683C\uFF0C\u82B1\u8D39\u7B97\u5C11\u4E86`, detail: "\u8FD9\u4E9B\u6B65\u9AA4\u7684\u6A21\u578B\u4E0D\u5728\u5B98\u65B9\u4EF7\u8868\u548C\u6A21\u578B\u5E93\u91CC\uFF0C\u6CA1\u7B97\u8FDB\u603B\u989D\u3002\u5230\u300C\u4EF7\u683C\u300D\u9875\u586B\u4E0A\uFF0C\u65E7\u8D26\u4F1A\u4E00\u8D77\u91CD\u7B97\u3002", saving: null, action: { label: "\u53BB\u586B\u4EF7\u683C", view: "prices" } });
    const other = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(cost), 0) AS cost FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} price_source = 'library-other'`).get(...w.args);
    if (other.n) add({ id: "guess", level: "warning", title: `${other.n} \u6B65\u7528\u7684\u662F\u522B\u5BB6\u7EBF\u8DEF\u7684\u4EF7\u683C`, detail: `\u8FD9\u4E9B\u6B65\u9AA4\uFF08\u7EA6 \xA5${yuan(other.cost)}\uFF09\u4F60\u8D70\u7684\u7EBF\u8DEF\u67E5\u4E0D\u5230\u4EF7\uFF0C\u6682\u65F6\u7528\u4E86\u6A21\u578B\u5E93\u91CC\u522B\u7684\u7EBF\u8DEF\u7684\u4EF7\u3002\u5230\u300C\u4EF7\u683C\u300D\u9875\u6309\u4F60\u7684\u8D26\u5355\u586B\u4E0A\u66F4\u51C6\u3002`, saving: null, action: { label: "\u53BB\u6539\u4EF7\u683C", view: "prices" } });
    if (period.offSaving >= 0.01 && period.cost && period.offSaving / period.cost >= 0.05) {
      const worst = db.prepare(`SELECT source, COALESCE(SUM(off_saving), 0) AS saving FROM ledger_steps ${w.sql} GROUP BY source ORDER BY saving DESC LIMIT 1`).get(...w.args);
      add({ id: "off-peak", level: "info", title: "\u6709\u7684\u6D3B\u53EF\u4EE5\u632A\u5230\u4F4E\u8C37\u65F6\u6BB5", detail: `\u8FD9\u6BB5\u65F6\u95F4\u9AD8\u5CF0\u65F6\u6BB5\u6BD4\u4F4E\u8C37\u591A\u82B1\u4E86 \xA5${yuan(period.offSaving)}\uFF0C\u5176\u4E2D\u300C${SOURCES[worst.source] ?? worst.source}\u300D\u6700\u591A\u3002\u4E0D\u6025\u7684\u6D3B\uFF08\u5B9A\u65F6\u4EFB\u52A1\u3001\u81EA\u8FDB\u5316\uFF09\u653E\u5230\u4F4E\u8C37\u8DD1\uFF0C\u5355\u4EF7\u662F\u4E00\u534A\u3002`, saving: period.offSaving, action: null });
    }
    const lowCache = db.prepare(`SELECT ${DIMENSIONS.agent.column} AS key, ${TOTALS}, AVG(json_extract(price, '$.input') - json_extract(price, '$.cacheRead')) AS gap FROM ledger_steps ${w.sql} GROUP BY key`).all(...w.args).map((r) => ({ ...r, hit: hitOf(r), label: DIMENSIONS.agent.label(r.key) })).filter((r) => r.hit < 0.8 && num(r.input) > 5e4);
    for (const r of lowCache) {
      const whole = num(r.input) + num(r.cache_read) + num(r.cache_write);
      const moved = Math.max(0, whole * 0.9 - num(r.cache_read));
      add({ id: `cache-${r.key}`, level: "warning", title: `\u300C${r.label}\u300D\u7684\u7F13\u5B58\u547D\u4E2D\u7387\u53EA\u6709 ${Math.round(r.hit * 100)}%`, detail: "\u7F13\u5B58\u9760\u63D0\u793A\u8BCD\u5F00\u5934\u4E0D\u53D8\u3002\u6BCF\u8F6E\u90FD\u53D8\u7684\u5185\u5BB9\uFF08\u65F6\u95F4\u3001\u5217\u8868\uFF09\u653E\u5728\u524D\u9762\u4F1A\u8BA9\u6574\u6BB5\u7F13\u5B58\u5931\u6548\uFF1B\u653E\u5230\u540E\u9762\uFF0C\u547D\u4E2D\u7387\u80FD\u5230 90% \u5DE6\u53F3\u3002", saving: moved * num(r.gap) / 1e6, action: { label: "\u770B\u5B83\u7684\u8D26", view: "breakdown", by: "agent" } });
    }
    const n = notesWhere(f);
    const rereads = db.prepare(`SELECT n.detail, n.job_id, COUNT(*) AS times FROM ledger_notes n ${n.sql} AND n.kind = 'tool' AND n.name = 'read' AND n.detail IS NOT NULL AND n.job_id IS NOT NULL GROUP BY n.detail, n.job_id HAVING times >= 5 ORDER BY times DESC LIMIT 5`).all(...n.args);
    if (rereads.length) add({ id: "rereads", level: "info", title: "Agent \u5728\u53CD\u590D\u8BFB\u540C\u4E00\u4E2A\u6587\u4EF6", detail: rereads.slice(0, 3).map((r) => `${r.detail.split(/[\\/]/).pop()} \u5728\u4E00\u4E2A\u4EFB\u52A1\u91CC\u8BFB\u4E86 ${r.times} \u6B21`).join("\uFF1B") + "\u3002\u591A\u534A\u662F\u4E0D\u77E5\u9053\u4E1C\u897F\u5728\u54EA\uFF1A\u628A\u4F4D\u7F6E\u5199\u8FDB Agent \u7684\u8BF4\u660E\uFF0C\u6216\u8005\u8BA9\u5B83\u5148\u8BFB\u7D22\u5F15\u3002", saving: null, action: { label: "\u770B\u5DE5\u5177", view: "tools" } });
    const retry = db.prepare(`SELECT n.name, COUNT(*) AS times, COALESCE(SUM(n.ms), 0) AS ms FROM ledger_notes n ${n.sql} AND n.kind = 'retry' GROUP BY n.name ORDER BY times DESC LIMIT 1`).get(...n.args);
    if (retry && retry.times >= 10) add({ id: "retries", level: "warning", title: `\u6A21\u578B\u8C03\u7528\u91CD\u8BD5\u4E86 ${retry.times} \u6B21${retry.name === "RATE_LIMIT" ? "\uFF08\u88AB\u9650\u6D41\uFF09" : ""}`, detail: `\u5149\u7B49\u5F85\u5C31\u82B1\u4E86 ${Math.round(retry.ms / 1e3)} \u79D2\u3002${retry.name === "RATE_LIMIT" ? "\u540C\u65F6\u8DD1\u7684 Agent \u592A\u591A\u4F1A\u649E\u4E0A\u9650\u6D41\uFF1A\u8C03\u4F4E \u8BBE\u7F6E \u203A \u8D44\u6E90\u4E0E\u5E76\u53D1\uFF0C\u6216\u8005\u6362\u9650\u989D\u66F4\u9AD8\u7684\u7EBF\u8DEF\u3002" : "\u7EBF\u8DEF\u4E0D\u7A33\uFF1A\u770B\u770B\u4F9B\u5E94\u5546\u7684\u72B6\u6001\uFF0C\u6216\u8005\u6362\u4E00\u6761\u7EBF\u8DEF\u3002"}`, saving: null, action: { label: "\u770B\u6548\u7387", view: "efficiency" } });
    const jobs = jobsOf(f);
    const wasted = jobs.filter((j) => j.status === "failed" || j.status === "cancelled");
    const wastedCost = wasted.reduce((s, j) => s + j.cost, 0);
    if (wastedCost >= 0.05) add({ id: "wasted", level: "warning", title: `${wasted.length} \u4E2A\u5931\u8D25\u6216\u88AB\u505C\u6B62\u7684\u4EFB\u52A1\u82B1\u4E86 \xA5${yuan(wastedCost)}`, detail: "\u8FD9\u4E9B\u94B1\u6CA1\u6362\u6765\u7ED3\u679C\u3002\u70B9\u8FDB\u53BB\u770B\u5361\u5728\u54EA\u4E00\u6B65\uFF0C\u5E38\u89C1\u7684\u662F\u8981\u6C42\u4E0D\u6E05\u695A\uFF0C\u6216\u8005\u7F3A\u4E1C\u897F\u5374\u4E00\u76F4\u8BD5\u3002", saving: wastedCost, action: { label: "\u770B\u6548\u7387", view: "efficiency" } });
    const blocked = jobs.filter((j) => j.task?.outcome === "blocked");
    const blockedCost = blocked.reduce((s, j) => s + j.cost, 0);
    if (blocked.length && blockedCost >= 0.05) add({ id: "blocked", level: "info", title: `${blocked.length} \u4E2A\u53D7\u963B\u7684\u4EFB\u52A1\u82B1\u4E86 \xA5${yuan(blockedCost)}`, detail: "\u6D3E\u6D3B\u524D\u628A\u6587\u4EF6\u3001\u8D26\u53F7\u8FD9\u4E9B Agent \u62FF\u4E0D\u5230\u7684\u4E1C\u897F\u5148\u5907\u597D\uFF0C\u53EF\u4EE5\u7701\u4E0B\u8FD9\u4E00\u8D9F\u3002", saving: null, action: { label: "\u770B\u6548\u7387", view: "efficiency" } });
    const edited = jobs.filter((j) => j.edits > 0);
    if (edited.length >= 5) {
      const rate = 1 - edited.filter((j) => j.retried).length / edited.length;
      if (rate < 0.5) add({ id: "one-shot", level: "info", title: `\u6539\u4EE3\u7801\u4E00\u6B21\u6210\u529F\u7387\u53EA\u6709 ${Math.round(rate * 100)}%`, detail: "\u6539\u5B8C\u8DD1\u4E00\u4E0B\u53C8\u6539\u540C\u4E00\u4E2A\u6587\u4EF6\u7B97\u4E00\u6B21\u8FD4\u5DE5\u3002\u8FD4\u5DE5\u591A\u901A\u5E38\u662F\u8BF4\u660E\u4E0D\u591F\u6E05\u695A\uFF0C\u6216\u8005\u8BE5\u5148\u8BFB\u7684\u6CA1\u8BFB\u3002", saving: null, action: { label: "\u6309\u7C7B\u578B\u770B", view: "breakdown", by: "kind" } });
    }
    const biggest = db.prepare(`SELECT root_session AS id, COALESCE(SUM(cost), 0) AS cost FROM ledger_steps ${w.sql}${w.sql ? " AND" : "WHERE"} root_session IS NOT NULL GROUP BY root_session ORDER BY cost DESC LIMIT 1`).get(...w.args);
    if (biggest && period.cost >= 1 && biggest.cost / period.cost >= 0.4) add({ id: "one-session", level: "info", title: `\u4E00\u4E2A\u4F1A\u8BDD\u5360\u4E86 ${Math.round(biggest.cost / period.cost * 100)}% \u7684\u82B1\u8D39`, detail: `\xA5${yuan(biggest.cost)} \u82B1\u5728\u4E00\u4E2A\u4F1A\u8BDD\u4E0A\u3002\u4F1A\u8BDD\u8D8A\u957F\u6BCF\u6B65\u8981\u5E26\u7684\u4E0A\u4E0B\u6587\u8D8A\u591A\uFF0C\u5927\u6D3B\u62C6\u6210\u51E0\u4E2A\u4EFB\u52A1\u901A\u5E38\u66F4\u7701\u3002`, saving: null, action: { label: "\u770B\u8FD9\u4E2A\u4F1A\u8BDD", view: "sessions", session: biggest.id } });
    const context = db.prepare(`SELECT ${DIMENSIONS.agent.column} AS key, AVG(input + cache_read + cache_write) AS average, COUNT(*) AS steps FROM ledger_steps ${w.sql} GROUP BY key HAVING steps >= 20 ORDER BY average DESC LIMIT 1`).get(...w.args);
    if (context && context.average >= 15e4) add({ id: "context", level: "info", title: `\u300C${DIMENSIONS.agent.label(context.key)}\u300D\u6BCF\u6B65\u5E73\u5747\u5E26 ${Math.round(context.average / 1e3)}k \u4E0A\u4E0B\u6587`, detail: "\u4E0A\u4E0B\u6587\u8D8A\u5927\uFF0C\u6BCF\u4E00\u6B65\u7684\u7F13\u5B58\u8D39\u8D8A\u9AD8\u3002\u628A\u957F\u6587\u4EF6\u8BFB\u53D6\u6362\u6210\u6309\u9700\u641C\u7D22\uFF0C\u6216\u8005\u628A\u5927\u6D3B\u62C6\u5F00\u3002", saving: null, action: { label: "\u770B\u4F1A\u8BDD", view: "sessions" } });
    try {
      const usedTools = new Set(db.prepare(`SELECT DISTINCT n.name FROM ledger_notes n ${n.sql} AND n.kind = 'tool'`).all(...n.args).map((r) => r.name));
      const plugins = get("plugins")?.list?.() ?? [];
      const idle = plugins.filter((p) => p.kind === "tool" && p.enabled !== false && Array.isArray(p.tools) && p.tools.length && !p.tools.some((t) => usedTools.has(t.name ?? t)));
      if (idle.length) add({ id: "idle-tools", level: "info", title: `${idle.length} \u4E2A\u5DE5\u5177\u63D2\u4EF6\u8FD9\u6BB5\u65F6\u95F4\u6CA1\u88AB\u7528\u8FC7`, detail: `${idle.slice(0, 4).map((p) => p.name).join("\u3001")}\uFF1A\u5DE5\u5177\u7684\u8BF4\u660E\u6BCF\u4E00\u6B65\u90FD\u8981\u5E26\u4E0A\u3002\u7528\u4E0D\u5230\u5C31\u5728\u63D2\u4EF6\u9875\u5173\u6389\u3002`, saving: null, action: null });
    } catch {
    }
    const rank = { serious: 0, warning: 1, info: 2 };
    return { period, tips: out.sort((a, b) => rank[a.level] - rank[b.level] || num(b.saving) - num(a.saving)) };
  }
  function exportRows(f) {
    const w = whereOf(f);
    return db.prepare(`SELECT at, day, source, agent_id, conversation_id, job_id, task_id, plan_id, session_id, provider_id, model, effort, tier, price_source, input, output, cache_read, cache_write, cost, saved, off_saving, ms, tools FROM ledger_steps ${w.sql} ORDER BY at LIMIT 200000`).all(...w.args);
  }
  return { filterOf, overview, breakdown, facets, sessions, session, tools, efficiency, compare, compareModels, tips, exportRows };
}
var csvCell = (v) => {
  const s = v === null || v === void 0 ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(rows) {
  if (!rows.length) return "\uFEFF";
  const head = Object.keys(rows[0]);
  return `\uFEFF${[head.join(","), ...rows.map((r) => head.map((k) => csvCell(r[k])).join(","))].join("\r\n")}\r
`;
}

// addons/usage/core/index.js
function start(ctx) {
  const a = createAnalysis({ db: ctx.store.db, get: ctx.get });
  const read = (path, fn) => ctx.http.route({ method: "GET", path, access: "admin", handler: ({ query, params }) => fn(a.filterOf(query), query, params) });
  read("/overview", (f) => a.overview(f));
  read("/facets", (f) => a.facets(f));
  read("/breakdown", (f, q) => a.breakdown(f, q.get("by") ?? "model"));
  read("/sessions", (f, q) => a.sessions(f, { sort: q.get("sort") ?? "cost", limit: Number(q.get("limit")) || 50, offset: Number(q.get("offset")) || 0, q: q.get("q") }));
  read("/sessions/:id", (_, __, params) => {
    const s = a.session(params.id);
    if (!s) throw ctx.httpError(404, "\u6CA1\u6709\u8FD9\u4E2A\u4F1A\u8BDD\u7684\u8BB0\u5F55");
    return s;
  });
  read("/tools", (f) => a.tools(f));
  read("/efficiency", (f) => a.efficiency(f));
  read("/compare", (f, q) => a.compare(f, { from: q.get("aFrom"), to: q.get("aTo") }, { from: q.get("bFrom"), to: q.get("bTo") }, q.get("by") ?? "model"));
  read("/compare-models", (f, q) => a.compareModels(f, q.get("a"), q.get("b")));
  read("/tips", (f) => a.tips(f));
  ctx.http.route({
    method: "GET",
    path: "/export",
    access: "admin",
    handler: ({ query, res }) => {
      const f = a.filterOf(query);
      const rows = a.exportRows(f);
      const json = query.get("format") === "json";
      const body = json ? JSON.stringify({ from: f.from, to: f.to, unit: "\u5143\uFF0Ctokens", rows }, null, 1) : toCsv(rows);
      res.writeHead(200, { "content-type": json ? "application/json; charset=utf-8" : "text/csv; charset=utf-8", "content-disposition": `attachment; filename="orbitra-usage-${f.from}-${f.to}.${json ? "json" : "csv"}"` });
      res.end(body);
    }
  });
}
export {
  start
};
