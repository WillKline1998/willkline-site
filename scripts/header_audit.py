"""Header audit: every page x 3 themes x 320-1600px. Flags wrapped titles, pop-art titles past the band or into
the poster circle, elements overlapping/crowding the title, and the pinned theme button covering nav controls.
Run against next start on :3123: ~/JobSearch/.venv/bin/python scripts/header_audit.py  (expect "0 header issues")"""
from playwright.sync_api import sync_playwright
PAGES=["/","/bio","/lab","/recipes","/songbook","/music","/media","/cv","/wall","/dingdong","/cleanup"]
JS="""(()=>{const m=document.querySelector('.site-main').getBoundingClientRect();
const t=document.querySelector('.page-title,.home-title'); if(!t) return {err:'no title'};
const r=t.getBoundingClientRect(); const cs=getComputedStyle(t); const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.1;
const theme=document.documentElement.dataset.theme;
const band=parseFloat(getComputedStyle(document.querySelector('.site-main')).getPropertyValue('--band'))*16;
let nxt=t.nextElementSibling; while(nxt && nxt.getBoundingClientRect().height===0) nxt=nxt.nextElementSibling;
const n=nxt?nxt.getBoundingClientRect():null;
const iss=[];
if(r.height>lh*1.6 && !t.classList.contains('home-title')) iss.push('title wraps ('+Math.round(r.height)+'px)');
if(theme==='pop-art' && !document.querySelector('.bio-layout') && (r.bottom-m.top)>band+1 && window.innerWidth<1080) iss.push('title past band '+Math.round(r.bottom-m.top)+'>'+band);
if(theme==='pop-art' && innerWidth>=768){const cx=m.right-96, cy=m.top+89.6; const dx=Math.max(r.left-cx,0,cx-r.right), dy=Math.max(r.top-cy,0,cy-r.bottom); if(Math.hypot(dx,dy)<64) iss.push('title hits circle');}
if(n && n.top < r.bottom-2 && !(n.left>=r.right||n.right<=r.left)) iss.push('next element overlaps title');
if(n && n.top-r.bottom<4 && theme!=='pop-art' && !(n.left>=r.right||n.right<=r.left)) iss.push('next element crowds title ('+Math.round(n.top-r.bottom)+'px)');
const b=document.querySelector('button.theme-cycler').getBoundingClientRect();
const hit=[...document.querySelectorAll('.site-nav a, .site-nav button')].filter(e=>{const q=e.getBoundingClientRect();return q.height>0&&!(q.right<=b.left||q.left>=b.right||q.bottom<=b.top||q.top>=b.bottom)}).map(e=>e.textContent.trim());
if(hit.length) iss.push('theme button covers nav: '+hit.join('|'));
return {iss, btn:[b.left,b.top,b.width,b.height]};})()"""
out=[]
with sync_playwright() as p:
    br=p.chromium.launch(channel="chrome",headless=True)
    for t in ["pop-art","demo","original"]:
        for vw in [320,390,768,1024,1366,1600]:
            ctx=br.new_context(viewport={"width":vw,"height":800}); ctx.add_init_script(f"localStorage.setItem('wk-theme','{t}')")
            pg=ctx.new_page()
            for path in PAGES:
                pg.goto("http://localhost:3123"+path)
                try: pg.wait_for_load_state("networkidle",timeout=4000)
                except Exception: pass
                pg.wait_for_timeout(300)
                r=pg.evaluate(JS)
                for i in r.get("iss",[r.get("err")]): out.append(f"{t} {vw} {path}: {i}")
            ctx.close()
print("\n".join(out) or "0 header issues")
