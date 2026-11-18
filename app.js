const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "noir_tasks_v2";
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { tasks = []; }

const priorityLabel = { normal: "通常", important: "重要", top: "最優先" };
const pad = n => String(n).padStart(2, "0");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  render();
}
function dateText() {
  const d = new Date();
  $("today").textContent = `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}  ${["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()]}`;
}
function ordered(list) {
  return [...list].sort((a,b) => {
    const rank = {top:0, important:1, normal:2};
    return (rank[a.priority]-rank[b.priority]) || ((a.time || "99:99").localeCompare(b.time || "99:99")) || (a.created-b.created);
  });
}
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function render() {
  const active = tasks.filter(t => !t.done);
  const top = ordered(active.filter(t => t.priority === "top")).slice(0,3);
  $("priority-count").textContent = `${pad(top.length)} / 03`;
  const priority = $("priority-list");
  priority.replaceChildren();
  if (!top.length) priority.append(el("p","empty","最優先に設定した未完了タスクがここに表示されます。"));
  top.forEach((task,i) => {
    const card = el("div","priority-card");
    card.append(el("span","priority-number",`0${i+1}`));
    card.append(el("div","priority-title",task.title));
    if (task.time) card.append(el("span","priority-time",task.time));
    priority.append(card);
  });

  $("all-count").textContent = `${tasks.length} ITEMS`;
  const list = $("task-list");
  list.replaceChildren();
  if (!tasks.length) list.append(el("p","empty","タスクを追加すると、ここに表示されます。"));
  ordered(tasks).forEach(task => {
    const row = el("div",`task${task.done ? " done" : ""}`);
    const check = el("input","check");
    check.type = "checkbox"; check.checked = task.done;
    check.setAttribute("aria-label","完了にする");
    check.addEventListener("change", () => { task.done = check.checked; save(); });
    row.append(check);
    row.append(el("span","task-name",task.title));
    const meta = el("div","task-meta");
    if (task.time) meta.append(el("span","task-time",task.time));
    meta.append(el("span",`tag ${task.priority}`,priorityLabel[task.priority]));
    const del = el("button","delete","×");
    del.type = "button"; del.setAttribute("aria-label","削除");
    del.addEventListener("click", () => { tasks = tasks.filter(t => t.id !== task.id); save(); });
    meta.append(del); row.append(meta); list.append(row);
  });
}
$("task-form").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("task-title").value.trim();
  if (!title) return;
  tasks.push({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title, time:$("task-time").value, priority:$("task-priority").value, done:false, created:Date.now()});
  $("task-title").value = ""; $("task-time").value = ""; $("task-priority").value = "normal";
  save();
});
dateText();
render();
