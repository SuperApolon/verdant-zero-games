import { CANVAS, CARD, GROUP } from './slots.js';
import * as E from './entry.js';
export const TAGS = ['#EMPATH', '#共鳴'];
export const ENTRY_PHRASE = 'EMPATHはじめる。';
const DEFAULT_EVENT = '言えなかった夜の話';
const DUMMY = [
  { name: 'セツナ', img: 'art/setsuna-portrait-v1.jpg' },
  { name: 'ミナト', img: 'art/avatar-diversity-02-ash-blond-masc.jpg' },
  { name: 'ヒカリ', img: 'art/avatar-diversity-01-warm-brunette.jpg' },
  { name: 'ソラ', img: 'art/avatar-diversity-04-black-hair-masc.jpg' },
  { name: 'ユイ', img: 'art/avatar-diversity-03-lavender.jpg' },
  { name: 'カナタ', img: 'art/profile-avatar.jpg' },
  { name: 'アオ', color: '#7fa6c9' },
].map((p, i) => ({ ...p, id: 'dummy:' + i, dummy: true }));
const COLORS = ['#7fa6c9', '#c99a7f', '#9ac97f', '#b07fc9', '#c97f9e'];
export function caption(names, ev = DEFAULT_EVENT) {
  const others = names.slice(1);
  if (others.length === 0) return '';
  return others.length === 1 ? `${others[0]}さんと、${ev}をして撮った一枚。` : `${others[0]}さんたちと、${ev}をして撮った一枚。`;
}
const cache = {};
const load = src => cache[src] ??= new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = src; });
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
async function drawAvatar(ctx, p, x, y, w, h) {
  if (p.img) return cover(ctx, await load(p.img), x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#fff'); g.addColorStop(1, p.color);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(30,40,80,.75)'; ctx.font = `600 ${h * .38}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name[0], x + w / 2, y + h / 2);
}
export async function drawCard(cv, p) {
  const ctx = cv.getContext('2d'); cv.width = cv.height = CANVAS;
  ctx.drawImage(await load(CARD.bg), 0, 0, CANVAS, CANVAS);
  const a = CARD.avatar; ctx.save(); rr(ctx, a.x, a.y, a.w, a.h, a.r); ctx.clip(); await drawAvatar(ctx, p, a.x, a.y, a.w, a.h); ctx.restore();
  const n = CARD.name; ctx.fillStyle = 'rgba(248,246,255,.97)'; rr(ctx, n.x, n.y, n.w, n.h, n.r); ctx.fill();
  ctx.fillStyle = '#1c2340'; ctx.font = '600 52px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`「${p.name}」`, n.x + n.w / 2, n.y + n.h / 2 + 2);
}
export async function drawGroup(cv, people, ev) {
  const ctx = cv.getContext('2d'); cv.width = cv.height = CANVAS;
  ctx.drawImage(await load(GROUP.bg), 0, 0, CANVAS, CANVAS);
  const ph = GROUP.photo; ctx.save(); rr(ctx, ph.x, ph.y, ph.w, ph.h, ph.r); ctx.clip();
  const sky = ctx.createLinearGradient(0, ph.y, 0, ph.y + ph.h); sky.addColorStop(0, '#bcd6f5'); sky.addColorStop(1, '#fbe3d0');
  ctx.fillStyle = sky; ctx.fillRect(ph.x, ph.y, ph.w, ph.h);
  for (const [i, [cx, cy, r]] of GROUP.layouts[people.length].entries()) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    await drawAvatar(ctx, people[i], cx - r, cy - r, r * 2, r * 2); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1c2340'; ctx.font = '500 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(people[i].name, cx, cy + r + 36);
  }
  ctx.restore();
  const c = GROUP.caption; ctx.fillStyle = 'rgba(250,248,255,.96)'; ctx.fillRect(c.x, c.y, c.w, c.h);
  ctx.fillStyle = '#1c2340'; ctx.textAlign = 'center'; ctx.font = '500 30px serif';
  ctx.fillText(`「${caption(people.map(p => p.name), ev)}」`, CANVAS / 2, c.y + 48, c.w - 30);
  ctx.font = '500 24px sans-serif'; ctx.fillText(TAGS.join(' '), CANVAS / 2, c.y + 98);
}
export function intentUrl(text) {
  return 'https://x.com/intent/post?text=' + encodeURIComponent(`${text}\n${TAGS.join(' ')}`);
}
// ---- UI ----
if (typeof document !== 'undefined' && document.getElementById('pool')) {
  const $ = id => document.getElementById(id);
  const fmt = ms => `${Math.ceil(ms / 60000)}分`;
  // プール = 入場済み（localStorage）＋（トグルONなら）ダミー
  function buildPool() {
    const entered = E.loadPool().map((e, i) => ({ ...e, name: e.displayName, color: COLORS[i % COLORS.length] }));
    const meId = E.getMe();
    let me = entered.find(e => e.id === meId) ?? DUMMY[0];
    if (customImg) me = { ...me, img: customImg };
    const others = [...entered.filter(e => e.id !== me.id), ...(E.demoOn() ? DUMMY.filter(d => d.id !== me.id) : [])];
    return { me, others };
  }
  let picked = [], customImg = null;
  function renderPool() {
    const { me, others } = buildPool();
    $('me').textContent = me.dummy ? `${me.name}（デモ・未入場）` : `${me.name}${me.hasCard ? ' ★優先' : ''}`;
    const ul = $('pool'); ul.innerHTML = '';
    for (const p of others) {
      const li = document.createElement('li');
      li.textContent = `${p.name}${p.hasCard ? ' ★優先' : ''}${p.dummy ? '（デモ）' : ''}`;
      if (p.postUrl) { const a = document.createElement('a'); a.href = p.postUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = ' ポスト'; li.append(a); }
      if (!p.dummy) { const b = document.createElement('button'); b.textContent = '削除'; b.onclick = () => { E.removeEntry(p.id); renderPool(); }; li.append(' ', b); }
      ul.append(li);
    }
    drawCard($('card'), me);
    const w = E.cooldownLeft(); $('cd').textContent = w ? `次の抽選まで あと${fmt(w)}` : '抽選できます';
    $('shuffle').disabled = w > 0 && !$('demoFree').checked;
    if ($('demoFree').checked) $('cd').textContent = 'デモモード：何度でも抽選できます';
  }
  $('demoFree').onchange = renderPool;
  $('demoEnter').onclick = () => {
    const nm = ['あなた', 'ハル', 'ナギ', 'ツムギ'][Math.floor(Math.random() * 4)];
    const e = E.enter({ displayName: nm, postUrl: `https://x.com/empath_demo/status/${Date.now()}`, hasCard: true });
    E.setDemo(true); $('demo').checked = true;
    $('demoMsg').textContent = `入場しました：${e.displayName}（デモ）→ 下の「ランダム接続」へ`; renderPool();
  };
  $('avatarFile').onchange = e => { const f = e.target.files[0]; if (!f) return; customImg = URL.createObjectURL(f); renderPool(); render(); };
  $("entry").href = intentUrl(ENTRY_PHRASE);
  $('demo').checked = E.demoOn(); $('demo').onchange = e => { E.setDemo(e.target.checked); renderPool(); };
  $('enter').onclick = () => {
    try {
      const e = E.enter({ displayName: $('name').value, postUrl: $('url').value, hasCard: $('hasCard').checked });
      $('msg').textContent = `入場しました：${e.displayName}`; $('url').value = ''; renderPool();
    } catch (err) { $('msg').textContent = err.message; }
  };
  $('shuffle').onclick = () => {
    const { me, others } = buildPool();
    const size = +$('size').value, free = $('demoFree').checked;
    const opt = free ? { hist: [], save: false } : {};
    if (size) opt.rand = (() => { let first = true; return () => first ? (first = false, (size - 1 - 0.5) / E.MAX_OTHERS) : Math.random(); })();
    const r = E.draw(me.id, others, opt);
    if (r.wait) { $('cd').textContent = `クールダウン中：あと${fmt(r.wait)}`; return; }
    if (!r.picked.length) { $('cd').textContent = r.reason; return; }
    picked = r.picked; renderPool(); render();
  };
  $('event').value = DEFAULT_EVENT; $('event').oninput = render;
  async function render() {
    const people = [buildPool().me, ...picked];
    $('count').textContent = `${people.length}人`;
    $('picked').textContent = picked.map(p => p.name).join('・') || '—';
    if (people.length < 2) { $('cap').textContent = '「ランダム接続」で相手を引いてください'; $('post').removeAttribute('href'); return; }
    const ev = $('event').value.trim() || DEFAULT_EVENT;
    await drawGroup($('group'), people, ev);
    const t = caption(people.map(p => p.name), ev);
    $('cap').textContent = t; $('post').href = intentUrl(t);
  }
  const dl = (id, name) => () => { const a = document.createElement('a'); a.download = name; a.href = $(id).toDataURL('image/png'); a.click(); };
  $('dlCard').onclick = dl('card', 'empath-card.png'); $('dlGroup').onclick = dl('group', 'empath-group.png');
  setInterval(() => { const w = E.cooldownLeft(); if (w) $('cd').textContent = `次の抽選まで あと${fmt(w)}`; else if ($('shuffle').disabled) renderPool(); }, 30000);
  renderPool(); render();
}
