"use strict";

const CATEGORIES = ["全部", "食", "衣", "住", "行", "育", "樂"];
const ZONES = ["全部地區","台灣・北","中永和","台灣・中","台灣・南","台灣・東","台灣・離島","國外","日本","日本・北海道","日本・東北","日本・關東","日本・中部","日本・關西","日本・中國","日本・四國","日本・九州沖繩"];
const locOf=e=>[e["分區"],e["縣市"],e["地點"],e["地址"]].join(" ");
const isJP=e=>e["區域"]==="日本"||e["分區"]==="日本"||/日本/.test([e["區域"],e["分區"],e["縣市"],e["地點"],e["地址"]].join(" "));
const JP_REGS={"日本・北海道":/北海道|札幌|函館|小樽|旭川|釧路|帶廣|帯広|網走|稚內|稚内|室蘭|苫小牧|富良野|登別|知床|美瑛|定山溪|定山渓|千歲|千歳/,"日本・東北":/東北|青森|岩手|宮城|秋田|山形|福島|仙台|盛岡|郡山|會津|会津|弘前|八戶|八戸|米澤|米沢|宮古市/,"日本・關東":/關東|関東|東京|茨城|栃木|群馬|埼玉|千葉|神奈川|橫濱|横浜|川崎|宇都宮|水戶|水戸|前橋|高崎|鎌倉|橫須賀|横須賀|箱根|成田|日光|大宮|川越|船橋|伊勢崎/,"日本・中部":/中部|新潟|富山|石川|福井|山梨|長野|岐阜|靜岡|静岡|愛知|名古屋|金澤|金沢|甲府|松本|濱松|浜松|熱海|輕井澤|軽井沢|富士山|富士市|富士宮|富士五湖|高山市|飛驒|飛騨|白川鄉|白川郷/,"日本・關西":/關西|関西|近畿|大阪府|(?:^|[^東])大阪|(?:^|[^東])京都|兵庫|奈良|和歌山|滋賀|三重[縣県]|神戶|神戸|姬路|姫路|宇治|伊勢市|伊勢神宮|伊勢志摩|白濱|白浜|高野山|西宮|蘆屋|芦屋|大津/,"日本・中國":/中國地方|中国地方|鳥取|島根|岡山|廣島|広島|山口|松江|出雲|倉敷|尾道|下關|下関|岩國|岩国|宮島|萩/,"日本・四國":/四國|四国|德島|徳島|香川|愛媛|高知|高松|松山|今治|宇和島|鳴門|琴平|道後/,"日本・九州沖繩":/九州|沖繩|沖縄|福岡|佐賀|長崎|熊本|大分|宮崎|鹿兒島|鹿児島|那霸|那覇|博多|北九州|別府|石垣|宮古島|恩納|名護|本部|讀谷|読谷|北谷|糸滿|糸満|嘉手納|久米島|西表|阿蘇|由布院|湯布院|佐世保|唐津|宜野灣|宜野湾|豐見城|豊見城/};
const jpZoneOf=e=>{const s=locOf(e);for(const z of Object.keys(JP_REGS))if(JP_REGS[z].test(s))return z;return ""};
const isJPLike=e=>isJP(e)||(e["區域"]==="國外"&&!!jpZoneOf(e));
const zoneOf=e=>{if(e["區域"]==="台灣")return "台灣・"+e["分區"];if(isJPLike(e))return jpZoneOf(e)||"日本";return "國外"};
const isZYH=e=>/中和區|永和區/.test([e["縣市"],e["地點"],e["地址"]].join(" "));
const zoneMatch=(e,z)=>z==="全部地區"||(z==="中永和"?isZYH(e):z==="國外"?e["區域"]!=="台灣":z==="日本"?isJPLike(e):JP_REGS[z]?isJPLike(e)&&JP_REGS[z].test(locOf(e)):zoneOf(e)===z);

const byId = id => document.getElementById(id);
const asText = value => value == null ? "" : String(value).trim();
const tags = entry => (Array.isArray(entry.專題) ? entry.專題 : [entry.專題]).map(asText).filter(Boolean);
const normalized = value => asText(value).normalize("NFKC").toLowerCase().replace(/臺/g,"台");
const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  return element;
};
function addOptions(select, options) {
  const saved = select.value;
  select.replaceChildren(...options.map(name => {
    const option = node("option",name);
    option.value = name;
    return option;
  }));
  select.value = options.includes(saved) ? saved : options[0];
}
function matches(entry, category, zone, topic, query) {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  const haystack = normalized(Object.values(entry).join(" "));
  return (category === "全部" || entry.類別 === category)
    && zoneMatch(entry, zone)
    && (topic === "全部專題" || tags(entry).includes(topic))
    && terms.every(term => haystack.includes(term));
}
function safeHttp(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value.trim())) return "";
  try {
    const url = new URL(value.trim());
    return url.username || url.password ? "" : url.href;
  } catch { return ""; }
}
function externalLink(label, url) {
  const a = node("a",label);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "action";
  return a;
}
function validate(data) {
  if (!data || !Array.isArray(data.entries)) throw new Error("invalid collection");
  const ids = new Set();
  for (const entry of data.entries) {
    if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 || ids.has(entry.id) || !asText(entry.名稱))
      throw new Error("invalid record");
    ids.add(entry.id);
  }
  return data.entries.slice().sort((a,b) => b.id-a.id);
}

let entries = null, category = "全部", openId = null, busy = false, lastSnapshot = null;
let clearedLegacyPassword = false;
const cats = byId("categories"), zone = byId("zone"), topic = byId("topic"), query = byId("query");
const dialog = byId("detail"), alertBox = byId("alert");
const startingQuery = new URLSearchParams(location.search).get("q");
if (startingQuery) query.value = startingQuery;
addOptions(zone,ZONES);
addOptions(topic,["全部專題","麵類","美國運通"]);

function renderCategories() {
  cats.replaceChildren(...CATEGORIES.map(name => {
    const button = node("button",name);
    button.type = "button";
    button.dataset.category = name;
    button.setAttribute("aria-pressed", String(category === name));
    const n = name === "全部" ? entries.length : entries.filter(e => e.類別 === name).length;
    button.append(node("span",n.toLocaleString("zh-TW")));
    return button;
  }));
}
function row(entry) {
  const tr = node("tr"), cell = node("td"), link = node("button",entry.名稱);
  link.type = "button";
  link.className = "place";
  link.dataset.id = String(entry.id);
  link.setAttribute("aria-haspopup","dialog");
  const location = [entry.縣市, entry.地點].filter(Boolean).join(" ");
  const extra = node("small",[entry.縣市,entry.子類].filter(Boolean).join(" · "));
  extra.className = "town-mobile";
  cell.append(link,extra);
  tr.append(cell);
  for (const [cls,text] of [["category",entry.類別],["region",location || zoneOf(entry)],["type",entry.子類]]) {
    const td = node("td",text || "—");
    td.className = cls;
    tr.append(td);
  }
  return tr;
}
function renderList() {
  if (entries === null) return;
  const filtered = entries.filter(e => matches(e,category,zone.value,topic.value,query.value));
  const narrowed = category !== "全部" || zone.value !== ZONES[0] || topic.value !== "全部專題" || query.value.trim() !== "";
  byId("count").textContent = narrowed ? filtered.length+" / "+entries.length+" 筆" : entries.length+" 筆";
  byId("rows").replaceChildren(...filtered.map(row));
  byId("table").hidden = !filtered.length;
  byId("empty").hidden = !!filtered.length;
  byId("empty").textContent = entries.length ? "找不到符合條件的收藏。" : "目前還沒有收藏。";
  byId("reset").hidden = !narrowed;
}
function detail(entry) {
  openId = entry.id;
  byId("detail-kind").textContent = [entry.類別,entry.子類].filter(Boolean).join(" · ");
  byId("detail-title").textContent = entry.名稱;
  const fields = [
    ["地區",[zoneOf(entry),entry.縣市,entry.地點].filter(Boolean).join(" · ")],
    ["地址",entry.地址],["電話",entry.電話],["營業時間",entry.營業時間],
    ["專題",tags(entry).join("、")],["備註",entry.備註],["資料來源",entry.來源],["加入日期",entry.加入日期],["編號",entry.id]
  ];
  const dl = node("dl"), actions = node("div");
  actions.className = "actions";
  for(const [k,v] of fields) if(asText(v)) dl.append(node("dt",k),node("dd",asText(v)));
  if(entry.地址 || entry.地點) {
    const address = [entry.名稱,entry.地址 || entry.地點].join(" ");
    actions.append(externalLink("在地圖查看","https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address)));
  }
  const tel = asText(entry.電話).match(/\+?\d[\d() -]{6,}\d/);
  if(tel) {
    const a = node("a","打電話");
    a.href = "tel:"+tel[0].replace(/[^+\d]/g,"");
    a.className = "action";
    actions.append(a);
  }
  for(const [label,value] of [["官網",entry.官網],["訂位",entry.訂位]]) {
    const url = safeHttp(value);
    if(url) actions.append(externalLink(label,url));
  }
  byId("detail-body").replaceChildren(dl,actions);
  if(!dialog.open) dialog.showModal();
}
async function reload() {
  if(busy || document.visibilityState === "hidden") return;
  busy = true;
  try {
    const r = await fetch("places.json?v="+Date.now(),{cache:"no-store"});
    if(!r.ok) throw new Error("load failed");
    const raw = await r.text();
    if(raw !== lastSnapshot) {
      const updated = validate(JSON.parse(raw));
      entries = updated;
      lastSnapshot = raw;
      addOptions(topic,["全部專題",...new Set(["麵類","美國運通",...entries.flatMap(tags)])]);
      renderCategories();
      renderList();
      if(dialog.open && openId !== null) {
        const record = entries.find(e => e.id === openId);
        if(record) detail(record); else dialog.close();
      }
    }
    if(!clearedLegacyPassword) {
      try { localStorage.removeItem("tlpw"); } catch { /* Storage may be disabled. */ }
      clearedLegacyPassword = true;
    }
    alertBox.hidden = true;
    byId("retry").hidden = true;
  } catch {
    alertBox.textContent = entries === null ? "暫時無法載入收藏，請重新讀取。" : "暫時無法更新，畫面顯示上次載入的收藏。";
    alertBox.hidden = false;
    byId("retry").hidden = false;
    if(entries === null) byId("count").textContent = "尚未載入";
  } finally { busy = false; }
}
function saveQuery() {
  const u = new URL(location.href);
  if(query.value.trim()) u.searchParams.set("q",query.value.trim());
  else u.searchParams.delete("q");
  if(u.href !== location.href) history.replaceState(null,"",u);
}
cats.addEventListener("click",event => {
  const b = event.target.closest("button[data-category]");
  if(!b || entries === null) return;
  category = b.dataset.category;
  for(const item of cats.querySelectorAll("button")) item.setAttribute("aria-pressed",String(item === b));
  renderList();
});
byId("rows").addEventListener("click",event => {
  const b = event.target.closest("button[data-id]");
  if(b) {
    const record = entries.find(e => e.id === Number(b.dataset.id));
    if(record) detail(record);
  }
});
byId("close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>{openId=null;});
query.addEventListener("input",()=>{saveQuery();renderList();});
zone.addEventListener("change",renderList);
topic.addEventListener("change",renderList);
byId("retry").addEventListener("click",reload);
byId("reset").addEventListener("click",()=>{
  category="全部";zone.value=ZONES[0];topic.value="全部專題";query.value="";
  saveQuery();renderCategories();renderList();query.focus();
});
document.addEventListener("visibilitychange",reload);
window.addEventListener("pageshow",reload);
window.setInterval(reload,60000);
reload();
