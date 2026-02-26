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
    preferReduced: false,
    orbitRect: null,
  };

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
        // ignore
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

  function badgeDockClass(b){
    const x = safeText(b).toUpperCase();
    if(x === "LIVE") return "dockBadge";
    if(x === "PREP") return "dockBadge prep";
    if(x === "MAINT") return "dockBadge maint";
    return "dockBadge";
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

    const hudNodes = $("#hudNodes");
    if(hudNodes) hudNodes.textContent = String(filtered.length);
  }

  function renderDock(items){
    const dock = $("#dockBtns");
    const drawer = $("#drawerLinks");
    if(dock) dock.innerHTML = "";
    if(drawer) drawer.innerHTML = "";

    // 허브 자신(HUB 그룹) 포함/제외 선택: 포함하되 맨 앞
    const ordered = [...items].sort((a,b)=>{
      const ag = safeText(a.group).toUpperCase();
      const bg = safeText(b.group).toUpperCase();
      if(ag === "HUB" && bg !== "HUB") return -1;
      if(bg === "HUB" && ag !== "HUB") return 1;
      return safeText(a.name).localeCompare(safeText(b.name));
    });

    ordered.forEach((it)=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dockBtn";
      btn.innerHTML = `<span class="dockDot" aria-hidden="true"></span><span>${safeText(it.short || it.name)}</span><span class="${badgeDockClass(it.badge)}">${safeText(it.badge || "LINK")}</span>`;
      btn.addEventListener("click", ()=> window.open(it.url, "_blank", "noopener,noreferrer"));
      btn.addEventListener("contextmenu", (e)=>{ e.preventDefault(); copyText(it.url); });
      dock && dock.appendChild(btn);

      const d = document.createElement("button");
      d.type = "button";
      d.className = "drawerBtn";
      d.textContent = safeText(it.name);
      d.addEventListener("click", ()=> window.open(it.url, "_blank", "noopener,noreferrer"));
      drawer && drawer.appendChild(d);
    });

    $("#dockCopyAll")?.addEventListener("click", ()=>{
      const lines = state.all.map(it => `- ${it.name}: ${it.url}`);
      copyText(lines.join("\n"));
    });
    $("#dockTop")?.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));
  }

  function renderOrbit(links){
    const orbit = $("#orbitNodes");
    const svg = $("#orbitLinks");
    orbit.innerHTML = "";
    svg.innerHTML = "";
    state.nodes = [];

    const count = links.length;
    if(count === 0) return;

    const radius = count <= 5 ? 190 : 220;

    links.forEach((item, idx)=>{
      const node = document.createElement("button");
      node.className = "node";
      node.type = "button";
      node.setAttribute("aria-label", `${item.name} 열기`);

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

    requestAnimationFrame(()=> {
      layoutOrbit();
      drawOrbitLinks();
    });
  }

  function layoutOrbit(){
    const area = $("#orbitArea");
    const rect = area.getBoundingClientRect();
    state.orbitRect = rect;

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

  function drawOrbitLinks(){
    const svg = $("#orbitLinks");
    if(!svg || !state.orbitRect) return;

    const w = state.orbitRect.width;
    const h = state.orbitRect.height;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const cx = w/2, cy = h/2;

    // Gradients
    svg.innerHTML = `
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(56,232,255,.38)"/>
          <stop offset="100%" stop-color="rgba(215,184,106,.22)"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge>
            <feMergeNode in="b"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;

    // lines from each node to center
    state.nodes.forEach((n)=>{
      const r = n.node.getBoundingClientRect();
      const ar = $("#orbitArea").getBoundingClientRect();

      const nx = (r.left - ar.left) + r.width/2;
      const ny = (r.top - ar.top) + r.height/2;

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", nx);
      line.setAttribute("y1", ny);
      line.setAttribute("x2", cx);
      line.setAttribute("y2", cy);
      line.setAttribute("stroke", "url(#g1)");
      line.setAttribute("stroke-width", "1");
      line.setAttribute("opacity", "0.35");
      line.setAttribute("filter","url(#glow)");
      svg.appendChild(line);
    });

    // center ring
    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", 70);
    c.setAttribute("fill","none");
    c.setAttribute("stroke","rgba(56,232,255,.22)");
    c.setAttribute("stroke-width","1");
    c.setAttribute("opacity","0.75");
    svg.appendChild(c);
  }

  function attachParallax(){
    const area = $("#orbitArea");
    if(!area) return;

    const onMove = (e)=>{
      const rect = area.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;  // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      const mx = (x - 0.5);
      const my = (y - 0.5);

      // store to CSS vars for HUD lighting
      document.documentElement.style.setProperty("--mx", mx.toFixed(3));
      document.documentElement.style.setProperty("--my", my.toFixed(3));

      // subtle tilt for orbit area
      area.style.transform = `perspective(900px) rotateX(${(-my*6).toFixed(2)}deg) rotateY(${(mx*6).toFixed(2)}deg)`;
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", ()=>{
      area.style.transform = "none";
      document.documentElement.style.setProperty("--mx", "0");
      document.documentElement.style.setProperty("--my", "0");
    });
  }

  function attachDrawer(){
    const open = ()=>{
      $("#drawerBack").classList.add("on");
      $("#drawerBack").setAttribute("aria-hidden","false");
    };
    const close = ()=>{
      $("#drawerBack").classList.remove("on");
      $("#drawerBack").setAttribute("aria-hidden","true");
    };
    $("#btnMenu")?.addEventListener("click", open);
    $("#drawerClose")?.addEventListener("click", close);
    $("#drawerBack")?.addEventListener("click", (e)=>{ if(e.target.id === "drawerBack") close(); });

    $("#drawerCopyHub")?.addEventListener("click", ()=> copyText(location.href));
    $("#drawerShareHub")?.addEventListener("click", ()=> shareUrl(document.title, location.href));
    $("#drawerEmergency")?.addEventListener("click", ()=> {
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

    window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") close(); });
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

  function animate(){
    if(!state.preferReduced && !state.paused){
      state.angle += state.speed;
    }
    layoutOrbit();
    drawOrbitLinks();
    requestAnimationFrame(animate);
  }

  function init(){
    state.preferReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const links = (window.ALLIANCE_LINKS || []).filter(x=>x && x.url);
    state.all = links;

    $("#year").textContent = new Date().getFullYear();

    // query param ?q=
    const url = new URL(location.href);
    const q0 = url.searchParams.get("q");
    if(q0){
      $("#q").value = q0;
      state.q = q0;
    }

    attachModal();
    attachDrawer();
    attachTopActions();
    attachParallax();

    renderDock(links);
    renderChips(links);
    applyFilter();

    const orbitArea = $("#orbitArea");
    orbitArea.addEventListener("mouseenter", ()=> state.paused = true);
    orbitArea.addEventListener("mouseleave", ()=> state.paused = false);
    orbitArea.addEventListener("touchstart", ()=> state.paused = true, {passive:true});
    orbitArea.addEventListener("touchend", ()=> state.paused = false, {passive:true});

    window.addEventListener("resize", ()=>{
      layoutOrbit();
      drawOrbitLinks();
    });

    if(state.preferReduced){
      state.paused = true;
      $("#pauseState").textContent = "정지";
    }

    const hudSync = $("#hudSync");
    if(hudSync) hudSync.textContent = "100%";

    requestAnimationFrame(()=> {
      layoutOrbit();
      drawOrbitLinks();
      animate();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
