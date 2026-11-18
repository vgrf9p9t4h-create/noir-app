const $ = id => document.getElementById(id);
const STORAGE_KEY = "noir_tasks_v2"; // Keep the original key so existing data remains.
const priorityLabel = {normal:"通常",important:"重要",top:"最優先"};
const pad = n => String(n).padStart(2,"0");
const todayKey = () => {const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
let tasks = [];
try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(saved))tasks=saved;} catch(e){console.warn("Stored data could not be loaded",e);}
// Old NOIR entries had no date; treat them as today's tasks when upgrading.
tasks=tasks.filter(t=>t && typeof t.title==="string").map(t=>({...t,date:/^\d{4}-\d{2}-\d{2}$/.test(t.date||"")?t.date:todayKey(),priority:priorityLabel[t.priority]?t.priority:"normal",done:!!t.done}));
let filter="today";
let selectedDay=null;
let editingId=null;
const addDays=(key,days)=>{const d=new Date(key+"T12:00:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const daysBetween=(a,b)=>Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const makeId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
function generateRepeats(){
 const today=todayKey(),end=addDays(today,14);
 let changed=false;
 for(const base of [...tasks]){
  if(!["daily","weekly"].includes(base.repeat)||base.repeatParent)continue;
  const interval=base.repeat==="daily"?1:7;
  const elapsed=Math.max(1,Math.ceil(daysBetween(base.date,today)/interval));
  for(let day=addDays(base.date,elapsed*interval);day<=end;day=addDays(day,interval)){
   if(day<today)continue;
   if(tasks.some(t=>t.repeatParent===base.id&&t.date===day))continue;
   tasks.push({...base,id:makeId(),date:day,done:false,repeat:"none",repeatParent:base.id,created:Date.now()});
   changed=true;
  }
 }
 if(changed)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));}catch(e){console.warn(e);}
}
function renderWeek(){
 const host=$("week-strip");host.replaceChildren();
 const today=todayKey();
 for(let i=0;i<7;i++){
  const day=addDays(today,i),d=new Date(day+"T12:00:00");
  const btn=el("button","week-day"+(selectedDay===day?" selected":""));
  btn.type="button";
  btn.append(el("span","week-dow",["日","月","火","水","木","金","土"][d.getDay()]),el("strong","week-num",String(d.getDate())));
  const n=tasks.filter(t=>t.date===day&&!t.done).length;
  btn.append(el("small","week-tasks",n?`${n}件`:"—"));
  btn.setAttribute("aria-pressed",String(selectedDay===day));
  btn.addEventListener("click",()=>{selectedDay=selectedDay===day?null:day;render();});
  host.append(btn);
 }
 $("week-reset").hidden=!selectedDay;
}
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const sorted=items=>[...items].sort((a,b)=>a.date.localeCompare(b.date)||((Number.isFinite(a.order)||Number.isFinite(b.order))?(Number.isFinite(a.order)?a.order:999999)-(Number.isFinite(b.order)?b.order:999999):0)||(a.time||"99:99").localeCompare(b.time||"99:99")||({top:0,important:1,normal:2}[a.priority]-{top:0,important:1,normal:2}[b.priority])||(a.created||0)-(b.created||0));
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));}catch(e){alert("保存できませんでした。ブラウザの空き容量や設定を確認してください。");}render();}
function updateDate(){const d=new Date();$("today").textContent=`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}  ${["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()]}`;}
function resetForm(){editingId=null;$("task-form").reset();$("task-date").value=todayKey();$("task-repeat").value="none";$("form-heading").textContent="タスクを追加";$("submit-task").textContent="追加 ＋";$("cancel-edit").hidden=true;}
function editTask(t){editingId=t.id;$("task-title").value=t.title;$("task-date").value=t.date;$("task-time").value=t.time||"";$("task-priority").value=t.priority;$("task-repeat").value=t.repeat||"none";$("form-heading").textContent="タスクを編集";$("submit-task").textContent="変更を保存";$("cancel-edit").hidden=false;$("task-form").scrollIntoView({behavior:"smooth",block:"center"});$("task-title").focus();}
function renderFocus(){
 const today=todayKey();
 const todayTasks=sorted(tasks.filter(t=>t.date===today&&t.priority==="top")).slice(0,3);
 $("focus-date").textContent=new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"short"}).format(new Date());
 const host=$("focus-items");host.replaceChildren();
 for(let i=0;i<3;i++){
  const task=todayTasks[i],row=el("div","focus-item"+(task?.done?" focus-done":""));
  row.append(el("span","focus-index",String(i+1).padStart(2,"0")));
  if(task){
   const title=el("span","focus-task-title",task.title);
   row.append(title);
   if(task.time)row.append(el("span","focus-task-time",task.time));
   const btn=el("button","focus-check",task.done?"✓":"○");
   btn.type="button";btn.setAttribute("aria-label",task.done?`${task.title}を未完了にする`:`${task.title}を完了にする`);
   btn.addEventListener("click",()=>{task.done=!task.done;persist();});
   row.append(btn);
  }else row.append(el("span","focus-placeholder","最優先タスクを追加しよう"));
  host.append(row);
 }
 $("focus-progress").textContent=`${todayTasks.filter(t=>t.done).length} / ${todayTasks.length} 完了`;
}
const focusScreen=$("hero-focus");
const regularSections=[...document.querySelectorAll(".app > header, .app > section:not(.hero-focus):not(.priority-section), .app > footer")];
$("priority-section").hidden=true;
function setScreen(focus){
 document.body.classList.toggle("focus-mode",focus);
 focusScreen.hidden=!focus;
 regularSections.forEach(node=>{node.hidden=focus;});
 document.querySelectorAll(".nav-button").forEach(btn=>btn.classList.toggle("nav-active",focus&&btn.dataset.jump==="focus"||!focus&&btn.dataset.jump==="tasks"));
}
function goTo(target){
 const focus=target==="focus";
 setScreen(focus);
 if(focus){window.scrollTo({top:0,behavior:"smooth"});return;}
 if(target==="tasks"){
  // Always show the beginning of the schedule instead of jumping to the task list.
  window.scrollTo({top:0,left:0,behavior:"instant"});
  requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"instant"}));
  return;
 }
 const node=$(target==="wallpaper"?"wallpaper-section":"add-section");
 requestAnimationFrame(()=>{node.scrollIntoView({behavior:"smooth",block:"start"});if(target==="add")$("task-title").focus({preventScroll:true});});
}
document.querySelectorAll("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>goTo(btn.dataset.jump)));
$("focus-exit").addEventListener("click",()=>goTo("tasks"));

function wallpaperTasks(){
 const includeDone=$("wallpaper-include-done").checked;
 return sorted(tasks.filter(t=>t.date===todayKey()&&t.priority==="top"&&(includeDone||!t.done))).slice(0,3);
}
function wallpaperRounded(ctx,x,y,w,h,r){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function wallpaperText(ctx,text,x,y,maxWidth,fontSize=64){
 ctx.font=`700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
 // Break long titles across up to two lines while preserving Japanese glyphs.
 const chars=Array.from(text),lines=[];let line="";
 for(const ch of chars){
  if(ctx.measureText(line+ch).width>maxWidth&&line){lines.push(line);line=ch;}
  else line+=ch;
 }
 if(line)lines.push(line);
 ctx.fillText(lines[0]||"",x,y);
 if(lines.length>1)ctx.fillText(lines.length>2?lines[1].slice(0,-1)+"…":lines[1],x,y+74);
}
function renderWallpaper(){
 const canvas=$("wallpaper-canvas");if(!canvas)return;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 const W=canvas.width,H=canvas.height;
 ctx.fillStyle="#080808";ctx.fillRect(0,0,W,H);
 if($("wallpaper-style").value==="gradient"){
  const g=ctx.createRadialGradient(580,920,100,580,920,1250);
  g.addColorStop(0,"#351116");g.addColorStop(1,"#080808");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 }
 // Keep top 580px empty for iOS lock-screen clock and widgets.
 ctx.textBaseline="alphabetic";
 ctx.fillStyle="#f6f6f6";ctx.font='800 78px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';
 ctx.fillText("NOIR",76,680);
 ctx.fillStyle="#e63838";ctx.fillText(".",290,680);
 ctx.fillStyle="#a0a0a0";ctx.font='600 28px -apple-system, BlinkMacSystemFont, sans-serif';
 ctx.fillText("TODAY'S PRIORITIES",76,780);
 ctx.fillStyle="#f6f6f6";ctx.font='700 68px -apple-system, BlinkMacSystemFont, "Noto Sans JP", sans-serif';
 ctx.fillText("今日、やること。",76,892);
 const ts=wallpaperTasks();
 for(let i=0;i<3;i++){
  const y=990+i*270;
  ctx.fillStyle="#191919";wallpaperRounded(ctx,76,y,1027,225,32);
  ctx.fillStyle="#e63838";ctx.font='700 37px -apple-system, sans-serif';ctx.fillText(String(i+1).padStart(2,"0"),112,y+113);
  ctx.fillStyle=ts[i]?"#f6f6f6":"#777";
  wallpaperText(ctx,ts[i]?.title||"最優先タスクを追加しよう",200,y+112,835,ts[i]?54:39);
 }
 ctx.fillStyle="#737373";ctx.font='400 30px -apple-system, sans-serif';
 const date=new Intl.DateTimeFormat("ja-JP",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
 ctx.fillText(date,76,1945);
 ctx.fillStyle="#e63838";ctx.fillRect(76,2000,105,5);
 ctx.fillStyle="#555";ctx.font='500 24px -apple-system, sans-serif';
 ctx.fillText("LESS NOISE. MORE FOCUS.",76,2075);
}
async function wallpaperBlob(){
 const canvas=$("wallpaper-canvas");
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("画像の作成に失敗しました")),"image/png"));
}
function wallpaperStatus(message){$("wallpaper-status").textContent=message;}
$("wallpaper-style").addEventListener("change",renderWallpaper);
$("wallpaper-include-done").addEventListener("change",renderWallpaper);
$("wallpaper-save").addEventListener("click",async()=>{
 try{
  const blob=await wallpaperBlob();
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`NOIR-wallpaper-${todayKey()}.png`;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  wallpaperStatus("画像を保存しました。iPhoneでは「ファイル」アプリのダウンロードを確認してね。");
 }catch(e){wallpaperStatus(e.message);}
});
$("wallpaper-shortcut").addEventListener("click",async()=>{
 const btn=$("wallpaper-shortcut");btn.disabled=true;
 try{
  const blob=await wallpaperBlob();
  const file=new File([blob],`NOIR-wallpaper-${todayKey()}.png`,{type:"image/png"});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   wallpaperStatus("共有メニューで「NOIR 壁紙変更」を選んでね。初回は下の設定手順を確認してね。");
   await navigator.share({files:[file]});
  }else{
   wallpaperStatus("この環境では画像の共有が使えません。Safariから開くか、「壁紙画像を保存」を利用してね。");
  }
 }catch(e){if(e.name!=="AbortError")wallpaperStatus("共有できませんでした。Safariから試すか、画像保存を利用してね。");}
 finally{btn.disabled=false;}
});
$("wallpaper-share").addEventListener("click",async()=>{
 try{
  const blob=await wallpaperBlob();
  const file=new File([blob],`NOIR-wallpaper-${todayKey()}.png`,{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:"NOIRの壁紙"});
   wallpaperStatus("共有メニューを開きました。「画像を保存」などを選んでね。");
  }else{
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download=file.name;a.click();
   setTimeout(()=>URL.revokeObjectURL(url),15000);
   wallpaperStatus("共有に未対応のため画像をダウンロードしました。");
  }
 }catch(e){if(e.name!=="AbortError")wallpaperStatus("共有できませんでした。画像を保存するボタンを試してね。");}
});

function render(){
  generateRepeats();updateDate();renderWeek();renderFocus();renderWallpaper();
  const today=todayKey();
  const top=sorted(tasks.filter(t=>!t.done&&t.priority==="top"&&t.date===today)).slice(0,3);
  $("priority-count").textContent=`${pad(top.length)} / 03`;
  const priority=$("priority-list");priority.replaceChildren();
  if(!top.length)priority.append(el("p","empty","今日の最優先タスクはありません。"));
  top.forEach((t,i)=>{const c=el("div","priority-card");c.append(el("span","priority-number",`0${i+1}`),el("div","priority-title",t.title));if(t.time)c.append(el("span","priority-time",t.time));priority.append(c);});
  const shown=sorted(tasks.filter(t=>selectedDay?t.date===selectedDay:(filter==="all"||(filter==="today"?t.date===today:t.date>today))));
  $("all-count").textContent=`${shown.length} ITEMS`;
  const completed=shown.filter(t=>t.done).length;
  $("progress-fill").style.width=`${shown.length?Math.round(completed/shown.length*100):0}%`;
  $("progress-text").textContent=`${completed} / ${shown.length} 完了`;
  document.querySelectorAll(".filter").forEach(b=>{b.classList.toggle("active",b.dataset.filter===filter);b.setAttribute("aria-pressed",String(b.dataset.filter===filter));});
  const list=$("task-list");list.replaceChildren();
  if(!shown.length)list.append(el("p","empty",filter==="today"?"今日のタスクはありません。":"表示するタスクはありません。"));
  shown.forEach(t=>{
    const row=el("div",`task${t.done?" done":""}${!t.done&&t.date<today?" overdue":""}`);
    const check=el("input","check");check.type="checkbox";check.checked=t.done;check.setAttribute("aria-label",`${t.title}を完了にする`);check.addEventListener("change",()=>{t.done=check.checked;persist();});row.append(check);
    const main=el("div","task-main");main.append(el("div","task-name",t.title));const info=el("div","task-sub",`${t.date}${t.time?" · "+t.time:""}${t.repeat==="daily"?" · 毎日":t.repeat==="weekly"?" · 毎週":""}${t.repeatParent?" · 繰り返し":""}${!t.done&&t.date<today?" · 期限切れ":""}`);main.append(info);row.append(main);
    const meta=el("div","task-meta");meta.append(el("span",`tag ${t.priority}`,priorityLabel[t.priority]));
    const move=(direction)=>{
      const peers=sorted(tasks.filter(x=>x.date===t.date));
      const idx=peers.findIndex(x=>x.id===t.id),other=peers[idx+direction];
      if(!other)return;
      [peers[idx],peers[idx+direction]]=[peers[idx+direction],peers[idx]];
      peers.forEach((item,i)=>{item.order=i;});
      persist();
    };
    const up=el("button","icon-btn","↑");up.type="button";up.title="上に移動";up.setAttribute("aria-label",`${t.title}を上へ`);up.addEventListener("click",()=>move(-1));meta.append(up);
    const down=el("button","icon-btn","↓");down.type="button";down.title="下に移動";down.setAttribute("aria-label",`${t.title}を下へ`);down.addEventListener("click",()=>move(1));meta.append(down);
    const edit=el("button","icon-btn","編集");edit.type="button";edit.setAttribute("aria-label",`${t.title}を編集`);edit.addEventListener("click",()=>editTask(t));meta.append(edit);
    const del=el("button","delete","×");del.type="button";del.setAttribute("aria-label",`${t.title}を削除`);del.addEventListener("click",()=>{if(confirm(`「${t.title}」を削除しますか？`)){tasks=tasks.filter(x=>x.id!==t.id);if(editingId===t.id)resetForm();persist();}});meta.append(del);row.append(meta);list.append(row);
  });
}
$("task-form").addEventListener("submit",e=>{
  e.preventDefault();const title=$("task-title").value.trim();if(!title)return;
  const data={title,date:$("task-date").value||todayKey(),time:$("task-time").value,priority:$("task-priority").value,repeat:$("task-repeat").value};
  if(editingId){const t=tasks.find(t=>t.id===editingId);if(t)Object.assign(t,data);}
  else tasks.push({...data,id:makeId(),done:false,created:Date.now()});
  resetForm();persist();
});
$("cancel-edit").addEventListener("click",resetForm);
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{selectedDay=null;filter=b.dataset.filter;render();}));
$("week-reset").addEventListener("click",()=>{selectedDay=null;render();});
$("export-data").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({app:"NOIR",version:3,exportedAt:new Date().toISOString(),tasks},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`NOIR-backup-${todayKey()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
$("import-data").addEventListener("click",()=>$("import-file").click());
$("import-file").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw Error("ファイルが大きすぎます。");
    const data=JSON.parse(await file.text());if(data.app!=="NOIR"||!Array.isArray(data.tasks)||data.tasks.length>10000)throw Error("NOIRのバックアップではありません。");
    if(!data.tasks.every(t=>t&&typeof t.title==="string"&&t.title.length<=80&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&priorityLabel[t.priority]&&typeof t.done==="boolean"))throw Error("バックアップの形式が正しくありません。");
    if(confirm("現在のタスクをバックアップの内容で置き換えます。続けますか？")){
      tasks=data.tasks.map(t=>({id:String(t.id||`${Date.now()}-${Math.random()}`),title:t.title,date:t.date,time:typeof t.time==="string"?t.time:"",priority:t.priority,done:t.done,created:Number(t.created)||Date.now(),repeat:["daily","weekly"].includes(t.repeat)?t.repeat:"none",repeatParent:typeof t.repeatParent==="string"?t.repeatParent:null,order:Number.isFinite(t.order)?t.order:null}));
      resetForm();persist();alert("読み込みが完了しました。");
    }
  }catch(err){alert(`読み込めませんでした: ${err.message}`);}finally{e.target.value="";}
});
resetForm();render();
// Refresh today's view when returning to the app after midnight.
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});

// Open in focus mode for a quick glance on iPhone; tasks remain accessible via the bottom navigation.
setScreen(true);
