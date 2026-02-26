// assets/js/app.js
(function(){
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const state = {
    paused: false,
    speed: 0.015,
    angle: 0,
    nodes: [],
    all: [],
    filtered: [],
    activeGroup: "ALL",
    q: "",
  };

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safeText(s){ return (s ?? "").toString(); }

  function toast(msg){
    const t = $("#toast");
    if(!t) return;
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast._tm);
    toast._tm = setTimeout(()=>t.classList.remove("on"), 1400);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      toast("복사 완료!");
      return true;
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try{
        document.execCommand("copy");
        toast("복사 완료!");
        return true;
      }catch(err){
        toast("복사 실패 (권한/보안 설정 확인)");
        return false;
      }finally{
        ta.remove();
      }
    }
  }

  async function shareUrl(title, url){
    if(navigator.share){
      try{
        await navigator.share({ title, url });
        return true;
      }catch(e){
        return false;
      }
    }
    await copyText(url);
    return true;
  }

  function badgeClass(b){
    const x = safeText(b).toUpperCase();
    if(x === "LIVE") return "badgeLive";
    if(x === "PREP") return "badgePrep";
    if(x === "MAINT") return "badgeMaint";
    return "";
  }

  function makeFallbackLetters(name){
    const s = safeText(name).replace(/\s+/g," ").trim();
    if(!s) return "X";
    const parts = s.split(" ");
    let out = "";
    for(const p of parts){
      if(!p) continue;
      out += p[0];
      if(out.length>=2) break;
    }
    return out.toUpperCase();
  }

  function imgOrFallback(logoUrl, name){
    const img = new Image();
    img.src = logoUrl;
    img.alt = name;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = () => {
      img.replaceWith(Object.assign(document.createElement("div"), {
        className: "fallback",
        textContent: makeFallbackLetters(name),
      }));
    };
    return img;
  }

  function openModal(item){
    $("#mTitle").textContent = safeText(item.name);
    $("#mTag").textContent = safeText(item.tagline);
    $("#mUrl").textContent = safeText(item.url);
    $("#mUrl").scrollLeft = 0;

    $("#mGo").onclick = () => window.open(item.url, "_blank", "noopener,noreferrer");
    $("#mCopy").onclick = () => copyText(item.url);
    $("#mShare").onclick = () => shareUrl(item.name, item.url);

    const quick = Array.isArray(item.quick) ? item.quick : [];
    const qWrap = $("#mQuickWrap");
    const qBox = $("#mQuick");
    qBox.innerHTML = "";
    if(quick.length){
      qWrap.style.display = "block";
      quick.forEach((q)=>{
        if(!q || !q.url) return;
        const b = document.createElement("button");
        b.className = "quickBtn";
        b.type = "button";
        b.textContent = safeText(q.label || "바로가기");
        b.addEventListener("click", ()=> window.open(q.url, "_blank", "noopener,noreferrer"));
        qBox.appendChild(b);
      });
    }else{
      qWrap.style.display = "none";
    }

    $("#modalBack").classList.add("on");
    $("#modalBack").setAttribute("aria-hidden","false");
  }

  function closeModal(){
    $("#modalBack").classList.remove("on");
    $("#modalBack").setAttribute("aria-hidden","true");
  }

  function attachModal(){
    $("#mClose").addEventListener("click", closeModal);
    $("#modalBack").addEventListener("click", (e)=>{
      if(e.target.id === "modalBack") closeModal();
    });
    window.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeModal();
    });
  }

  function renderChips(items){
    const chips = $("#chips");
    chips.innerHTML = "";

    const groups = new Map();
    items.forEach(it=>{
      const g = safeText(it.group || "OTHER").trim() || "OTHER";
      groups.set(g, (groups.get(g) || 0) + 1);
    });

    const ordered = ["ALL", ...Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b))];

    ordered.forEach((g)=>{
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (state.activeGroup === g ? " on" : "");
      c.textContent = g === "ALL" ? `ALL (${items.length})` : `${g} (${groups.get(g)})`;
      c.addEventListener("click", ()=>{
        state.activeGroup = g;
        $$(".chip").forEach(x=>x.classList.remove("on"));
        c.classList.add("on");
        applyFilter();
      });
      chips.appendChild(c);
    });
  }

  function matchQuery(item, q){
    if(!q) return true;
    const hay = `${safeText(item.name)} ${safeText(item.short)} ${safeText(item.tagline)} ${safeText(item.group)} ${safeText(item.badge)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFilter(){
    const items = state.all;

    const byGroup = state.activeGroup === "ALL"
      ? items
      : items.filter(it => safeText(it.group) === state.activeGroup);

    const q = safeText(state.q).trim();
    const filtered = byGroup.filter(it => matchQuery(it, q));

    state.filtered = filtered;

    renderOrbit(filtered);
    renderGrid(filtered);

    $("#count").textContent = String(filtered.length);
    $("#stat").textContent =
      filtered.length === items.length && state.activeGroup === "ALL" && !q
        ? `전체 ${items.length}개 표시 중`
        : `필터/검색 결과 ${filtered.length}개 (전체 ${items.length}개 중)`;
  }

  function renderOrbit(links){
    const orbit = $("#orbitNodes");
    orbit.innerHTML = "";
    state.nodes = [];

    const count = links.length;
    if(count === 0) return;

    const radius = count <= 5 ? 190 : 220;
    links.forEach((item, idx)=>{
      const node = document.createElement("button");
      node.className = "node";
      node.type = "button";
      node.setAttribute("aria-label", `${item.name} 열기`);
      node.dataset.idx = String(idx);

      const badge = document.createElement("div");
      badge.className = `badge ${badgeClass(item.badge)}`;
      badge.textContent = safeText(item.badge || "LINK");

      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = safeText(item.short || item.name);

      node.appendChild(badge);

      if(item.logo){
        node.appendChild(imgOrFallback(item.logo, item.name));
      }else{
        const fb = document.createElement("div");
        fb.className = "fallback";
        fb.textContent = makeFallbackLetters(item.name);
        node.appendChild(fb);
      }

      node.appendChild(hint);

      node.addEventListener("click", ()=> openModal(item));

      node.addEventListener("mouseenter", ()=> state.paused = true);
      node.addEventListener("mouseleave", ()=> state.paused = false);
      node.addEventListener("touchstart", ()=> state.paused = true, {passive:true});
      node.addEventListener("touchend", ()=> state.paused = false, {passive:true});

      orbit.appendChild(node);
      state.nodes.push({ node, idx, item, radius, count });
    });

    requestAnimationFrame(layoutOrbit);
  }

  function renderGrid(links){
    const grid = $("#grid");
    grid.innerHTML = "";

    links.forEach((item)=>{
      const card = document.createElement("div");
      card.className = "card";

      const inner = document.createElement("div");
      inner.className = "cardInner";

      const top = document.createElement("div");
      top.className = "cardTop";

      const logoBox = document.createElement("div");
      logoBox.className = "logoBox";
      if(item.logo){
        const im = imgOrFallback(item.logo, item.name);
        im.style.width = "34px";
        im.style.height = "34px";
        logoBox.appendChild(im);
      }else{
        logoBox.textContent = makeFallbackLetters(item.name);
      }

      const titles = document.createElement("div");
      const h3 = document.createElement("h3");
      h3.textContent = safeText(item.name);

      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = safeText(item.tagline);

      titles.appendChild(h3);
      titles.appendChild(meta);

      top.appendChild(logoBox);
      top.appendChild(titles);

      const row = document.createElement("div");
      row.className = "row";

      const go = document.createElement("button");
      go.className = "smallBtn";
      go.type = "button";
      go.innerHTML = `바로가기 <small>새 창</small>`;
      go.onclick = ()=> window.open(item.url, "_blank", "noopener,noreferrer");

      const copy = document.createElement("button");
      copy.className = "smallBtn";
      copy.type = "button";
      copy.innerHTML = `링크 복사 <small>URL</small>`;
      copy.onclick = ()=> copyText(item.url);

      const more = document.createElement("button");
      more.className = "smallBtn";
      more.type = "button";
      more.innerHTML = `정보/Quick <small>모달</small>`;
      more.onclick = ()=> openModal(item);

      row.appendChild(go);
      row.appendChild(copy);
      row.appendChild(more);

      // Quick buttons (up to 4)
      const quick = Array.isArray(item.quick) ? item.quick : [];
      if(quick.length){
        const qRow = document.createElement("div");
        qRow.className = "quickRow";
        quick.slice(0,4).forEach(q=>{
          if(!q || !q.url) return;
          const qb = document.createElement("button");
          qb.className = "quickBtn";
          qb.type = "button";
          qb.textContent = safeText(q.label || "Quick");
          qb.onclick = ()=> window.open(q.url, "_blank", "noopener,noreferrer");
          qRow.appendChild(qb);
        });
        inner.appendChild(qRow);
      }

      inner.appendChild(top);
      inner.appendChild(row);
      card.appendChild(inner);
      grid.appendChild(card);
    });
  }

  function layoutOrbit(){
    const area = $("#orbitArea");
    const rect = area.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    state.nodes.forEach((n)=>{
      const step = (Math.PI * 2) / n.count;
      const a = state.angle + step * n.idx;
      const x = cx + Math.cos(a) * n.radius;
      const y = cy + Math.sin(a) * n.radius;
      n.node.style.left = `${x - 46}px`;
      n.node.style.top  = `${y - 46}px`;
    });
  }

  function animate(){
    if(!prefersReduced && !state.paused){
      state.angle += state.speed;
    }
    layoutOrbit();
    requestAnimationFrame(animate);
  }

  function attachTopActions(){
    $("#btnPause").addEventListener("click", ()=>{
      state.paused = !state.paused;
      $("#pauseState").textContent = state.paused ? "정지" : "회전";
      toast(state.paused ? "회전 정지" : "회전 재개");
    });

    $("#btnCopyHub").addEventListener("click", ()=> copyText(location.href));
    $("#btnShareHub").addEventListener("click", ()=> shareUrl(document.title, location.href));

    $("#btnEmergencyCopy").addEventListener("click", ()=>{
      const script =
`[긴급 신고 템플릿]
1) 위치: (주소/랜드마크)
2) 상황: (무슨 일이 발생했는지)
3) 위험요소: (불/연기/흉기/추락/의식없음 등)
4) 인원: (성인/어린이, 부상자 수)
5) 연락처: (보호자/신고자)
* 필요 시 112/119 즉시 신고`;
      copyText(script);
    });

    $("#btnClear").addEventListener("click", ()=>{
      state.q = "";
      state.activeGroup = "ALL";
      $("#q").value = "";
      renderChips(state.all);
      applyFilter();
      toast("초기화 완료");
    });

    $("#btnCopySelected").addEventListener("click", ()=>{
      const lines = state.filtered.map(it => `- ${it.name}: ${it.url}`);
      const text = `[HUB 결과요약]\n${lines.join("\n")}`;
      copyText(text);
    });

    $("#q").addEventListener("input", (e)=>{
      state.q = e.target.value || "";
      applyFilter();
    });
  }

  function init(){
    const links = (window.ALLIANCE_LINKS || []).filter(x=>x && x.url);
    state.all = links;

    $("#year").textContent = new Date().getFullYear();

    attachModal();
    attachTopActions();

    renderChips(links);
    applyFilter();

    const orbitArea = $("#orbitArea");
    orbitArea.addEventListener("mouseenter", ()=> state.paused = true);
    orbitArea.addEventListener("mouseleave", ()=> state.paused = false);
    orbitArea.addEventListener("touchstart", ()=> state.paused = true, {passive:true});
    orbitArea.addEventListener("touchend", ()=> state.paused = false, {passive:true});

    window.addEventListener("resize", layoutOrbit);

    if(prefersReduced){
      state.paused = true;
      $("#pauseState").textContent = "정지";
    }

    requestAnimationFrame(()=> {
      layoutOrbit();
      animate();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
