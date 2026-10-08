// Turns "BOOKING ..." issues into entries in data/bookings.json. Runs inside GitHub Actions.
import { randomBytes } from "node:crypto";
const { GITHUB_TOKEN: T, GITHUB_REPOSITORY: R } = process.env;
const FILE = "data/bookings.json", OPEN = 6, CLOSE = 22, MAXD = 30;
const gh = (p, o = {}) => fetch(`https://api.github.com/repos/${R}${p}`, { ...o, headers: { Authorization: `Bearer ${T}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" } });

const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit" })
  .formatToParts(new Date()).reduce((o, x) => ((o[x.type] = x.value), o), {});
const today = `${p.year}-${p.month}-${p.day}`, nowH = +p.hour;
const price = (h) => (h >= 16 ? 230 : 180);

function validate(b) {
  const name = String(b.name || "").trim().slice(0, 60), phone = String(b.phone || "").trim(), date = String(b.date || "");
  const hours = Array.isArray(b.hours) ? [...new Set(b.hours.map(Number))].sort((x, y) => x - y) : [];
  if (name.length < 2) return "Please enter your name.";
  if (!/^[\d+\-\s()]{7,20}$/.test(phone)) return "Invalid phone number.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00Z")) || date < today || date > addDays(today, MAXD)) return "Date must be within the next 30 days.";
  if (!hours.length || hours.length > 6) return "Choose 1 to 6 hours.";
  if (hours.some((h) => !Number.isInteger(h) || h < OPEN || h >= CLOSE || (date === today && h < nowH))) return "One of those hours is closed or has passed.";
  return { date, hours };
}

for (let attempt = 0; attempt < 5; attempt++) {
  const f = await (await gh(`/contents/${FILE}`)).json();
  const data = JSON.parse(Buffer.from(f.content, "base64").toString());
  const issues = (await (await gh(`/issues?state=open&sort=created&direction=asc&per_page=100`)).json())
    .filter((i) => !i.pull_request && i.title.startsWith("BOOKING"));
  const replies = [];
  for (const i of issues) {
    let res, ref;
    try { res = validate(JSON.parse(/```json\s*([\s\S]*?)```/.exec(i.body || "")[1])); } catch { res = "Could not read the booking details."; }
    if (typeof res === "string") replies.push({ i, ok: false, text: `❌ Not booked: ${res}` });
    else if (res.hours.some((h) => data[`${res.date}/${h}`])) replies.push({ i, ok: false, text: "❌ Sorry, one of those hours was just booked. Please pick again on the website." });
    else {
      ref = randomBytes(4).toString("hex").toUpperCase();
      res.hours.forEach((h) => (data[`${res.date}/${h}`] = { status: "booked", ref, issue: i.number }));
      replies.push({ i, ok: true, text: `✅ Booked ${res.date}, ${res.hours.map((h) => h + ":00").join(", ")}. Ref **${ref}**. Pay ₱${res.hours.reduce((s, h) => s + price(h), 0)} at the court.` });
    }
  }
  if (!issues.length) process.exit(0);
  const put = await gh(`/contents/${FILE}`, { method: "PUT", body: JSON.stringify({ message: "process bookings", sha: f.sha, content: Buffer.from(JSON.stringify(data, null, 1)).toString("base64") }) });
  if (!put.ok) { if (put.status === 409 || put.status === 422) continue; throw new Error("Write failed " + put.status); }
  for (const { i, ok, text } of replies) {
    await gh(`/issues/${i.number}/comments`, { method: "POST", body: JSON.stringify({ body: text }) });
    await gh(`/issues/${i.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: ok ? "completed" : "not_planned" }) });
  }
  process.exit(0);
}
throw new Error("Too many conflicts");
