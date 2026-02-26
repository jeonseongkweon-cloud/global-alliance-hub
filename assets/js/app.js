// assets/js/app.js
(function(){
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const state = {
    paused: false,
    speed: 0.015, // 회전 속도(낮을수록 느림)
    angle: 0,
    nodes: [],
    links: [],
    active: null,
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
      // fallback
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
        // user canceled or blocked
        return false;
      }
    }
    await copyText(url);
    return true;
  }

  function openModal(item){
    state.active = item;
    $("#mTitle").textContent = safeText(item.name);
    $("#mTag").textContent = safeText(item.tagline);
    $("#mUrl").textContent = safeText(item.url);
    $("#mUrl").scrollLeft = 0;

    $("#mGo").onclick = () => window.open(item.url, "_blank", "noopener,noreferrer");
    $("#mCopy").onclick = () => copyText(item.url);
    $("#mShare").onclick = () => shareUrl(item.name, item.url);

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

  function renderOrbit(links){
    const orbit = $("#orbitNodes");
    orbit.innerHTML = "";

    // 7개면 바깥 링에 7개 배치(안쪽 링은 장식)
    const count = links.length;
    const radius = 220; // px (중심 기준)
    const center = {x: 0, y: 0};

    state.nodes = links.map((item, idx)=>{
      const node = document.createElement("button");
      node.className = "node";
      node.type = "button";
      node.setAttribute("aria-label", `${item.name} 열기`);
      node.dataset.idx = String(idx);

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = safeText(item.badge || "LINK");

      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = safeText(item.name);

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

      // hover/touch pause
      node.addEventListener("mouseenter", ()=> state.paused = true);
      node.addEventListener("mouseleave", ()=> state.paused = false);
      node.addEventListener("touchstart", ()=> state.paused = true, {passive:true});
      node.addEventListener("touchend", ()=> state.paused = false, {passive:true});

      orbit.appendChild(node);

      return { node, idx, item, radius, center, count };
    });
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
      more.innerHTML = `정보/공유 <small>모달</small>`;
      more.onclick = ()=> openModal(item);

      row.appendChild(go);
      row.appendChild(copy);
      row.appendChild(more);

      inner.appendChild(top);
      inner.appendChild(row);

      card.appendChild(inner);
      grid.appendChild(card);
    });

    $("#count").textContent = String(links.length);
  }

  function layoutOrbit(){
    // angle 기준으로 각 node 위치 계산
    const rect = $("#orbitArea").getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    state.nodes.forEach((n)=>{
      const step = (Math.PI * 2) / n.count;
      const a = state.angle + step * n.idx;
      const x = cx + Math.cos(a) * n.radius;
      const y = cy + Math.sin(a) * n.radius;

      // node 중심 정렬
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

    $("#btnCopyHub").addEventListener("click", ()=>{
      copyText(location.href);
    });

    $("#btnShareHub").addEventListener("click", ()=>{
      shareUrl(document.title, location.href);
    });

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
  }

  function init(){
    const links = (window.ALLIANCE_LINKS || []).filter(x=>x && x.url);

    // 기본 문구
    $("#year").textContent = new Date().getFullYear();

    renderOrbit(links);
    renderGrid(links);
    attachModal();
    attachTopActions();

    // orbit interactions
    const orbitArea = $("#orbitArea");
    orbitArea.addEventListener("mouseenter", ()=> state.paused = true);
    orbitArea.addEventListener("mouseleave", ()=> state.paused = false);
    orbitArea.addEventListener("touchstart", ()=> state.paused = true, {passive:true});
    orbitArea.addEventListener("touchend", ()=> state.paused = false, {passive:true});

    // resize
    window.addEventListener("resize", layoutOrbit);

    // reduced motion: 정지 기본
    if(prefersReduced){
      state.paused = true;
      $("#pauseState").textContent = "정지";
    }

    // start
    requestAnimationFrame(()=> {
      layoutOrbit();
      animate();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
