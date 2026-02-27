/* GLOBAL ALLIANCE HUB - app.js (hardened build)
   - Robust rendering (never stop on null / missing nodes)
   - Search / filter / chips / dock / drawer / orbit / modal
   - Copy / share / emergency script
*/
(() => {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const toastEl = $("#toast");
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("on"), 1500);
  };

  const normalizeUrl = (u) => {
    if (!u) return "";
    let url = String(u).trim();
    if (!url) return "";
    // allow tel:, mailto:, https://, http://
    if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
    // if someone wrote domain only
    return "https://" + url.replace(/^\/+/, "");
  };

  const safeText = (v) => (v == null ? "" : String(v));

  const copyText = async (text) => {
    const t = safeText(text);
    if (!t) return toast("복사할 내용이 없습니다.");
    try {
      await navigator.clipboard.writeText(t);
      toast("복사 완료!");
    } catch (e) {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("복사 완료!");
      } catch (err) {
        toast("복사 실패 (브라우저 권한 확인)");
      } finally {
        ta.remove();
      }
    }
  };

  const shareUrl = async (title, url) => {
    const u = normalizeUrl(url);
    if (!u) return toast("공유할 URL이 없습니다.");
    if (navigator.share) {
      try {
        await navigator.share({ title: safeText(title), url: u });
        return;
      } catch (e) {
        // ignore -> fallback to copy
      }
    }
    await copyText(u);
    toast("공유 대신 링크를 복사했습니다.");
  };

  // -----------------------------
  // Data
  // -----------------------------
  const RAW = Array.isArray(window.ALLIANCE_LINKS) ? window.ALLIANCE_LINKS : [];
  const LINKS = RAW.map((x, idx) => {
    const name = safeText(x.name || x.title || x.short || `SITE ${idx + 1}`);
    const short = safeText(x.short || x.code || name);
    const group = safeText(x.group || x.category || "ALL");
    const tagline = safeText(x.tagline || x.desc || x.description || "");
    const badge = safeText(x.badge || "");
    const url = normalizeUrl(x.url || x.href || "");
    const quick = Array.isArray(x.quick) ? x.quick : [];
    return { idx, name, short, group, tagline, badge, url, quick, raw: x };
  }).filter(x => x.url); // url 없는 건 제외

  // -----------------------------
  // Elements (all optional)
  // -----------------------------
  const yearEl = $("#year");
  const qEl = $("#q");
  const chipsEl = $("#chips");
  const gridEl = $("#grid");
  const countEl = $("#count");
  const statEl = $("#stat");

  const orbitNodesEl = $("#orbitNodes");
  const orbitLinksSvg = $("#orbitLinks");
  const hudNodesEl = $("#hudNodes");

  const btnClear = $("#btnClear");
  const btnCopySelected = $("#btnCopySelected");

  const btnPause = $("#btnPause");
  const pauseState = $("#pauseState");

  const btnCopyHub = $("#btnCopyHub");
  const btnShareHub = $("#btnShareHub");
  const btnEmergencyCopy = $("#btnEmergencyCopy");

  // Drawer (mobile)
  const btnMenu = $("#btnMenu");
  const drawerBack = $("#drawerBack");
  const drawerClose = $("#drawerClose");
  const drawerLinks = $("#drawerLinks");
  const drawerCopyHub = $("#drawerCopyHub");
  const drawerShareHub = $("#drawerShareHub");
  const drawerEmergency = $("#drawerEmergency");

  // Dock
  const dockBtns = $("#dockBtns");
  const dockCopyAll = $("#dockCopyAll");
  const dockTop = $("#dockTop");

  // Modal
  const modalBack = $("#modalBack");
  const mClose = $("#mClose");
  const mTitle = $("#mTitle");
  const mTag = $("#mTag");
  const mUrl = $("#mUrl");
  const mGo = $("#mGo");
  const mCopy = $("#mCopy");
  const mShare = $("#mShare");
  const mQuick = $("#mQuick");

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    q: "",
    group: "ALL",
    paused: false,
    orbitT0: performance.now(),
    orbitAngle: 0,
    orbitR: 0,
    orbitCenter: { x: 0, y: 0 },
    lastRenderKey: ""
  };

  // -----------------------------
  // SEO: set title by query
  // -----------------------------
  const setDocTitle = () => {
    const base = "GLOBAL ALLIANCE HUB | 공식 메인 대문";
    if (state.q) document.title = `${state.q} · ${base}`;
    else document.title = base;
  };

  // -----------------------------
  // Emergency Script
  // -----------------------------
  const emergencyScript = () => {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    return [
      "[긴급 신고 템플릿]",
      `시간: ${stamp}`,
      "장소: (주소/랜드마크/층수/호수)",
      "상황: (사고/실종/폭력/화재/응급/침입 등)",
      "대상: (연령/성별/인상착의/특징)",
      "현재: (의식/호흡/출혈/위험요인)",
      "요청: 112/119 즉시 출동 요청",
      "연락처: (본인 번호)",
    ].join("\n");
  };

  // -----------------------------
  // Group Chips
  // -----------------------------
  const buildGroups = () => {
    const set = new Set(["ALL"]);
    LINKS.forEach(x => set.add(x.group || "ALL"));
    return Array.from(set);
  };

  const renderChips = () => {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    const groups = buildGroups();

    groups.forEach(g => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.group === g ? " on" : "");
      b.textContent = g;
      b.addEventListener("click", () => {
        state.group = g;
        renderAll();
      });
      chipsEl.appendChild(b);
    });
  };

  // -----------------------------
  // Filter
  // -----------------------------
  const filterList = () => {
    const q = state.q.trim().toLowerCase();
    return LINKS.filter(x => {
      const groupOk = (state.group === "ALL") || (x.group === state.group);
      if (!groupOk) return false;
      if (!q) return true;
      const hay = `${x.name} ${x.short} ${x.group} ${x.tagline} ${x.badge}`.toLowerCase();
      return hay.includes(q);
    });
  };

  // -----------------------------
  // Cards
  // -----------------------------
  const openModal = (item) => {
    if (!modalBack) {
      // fallback
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    mTitle && (mTitle.textContent = item.name);
    mTag && (mTag.textContent = item.tagline || item.group);
    mUrl && (mUrl.textContent = item.url);

    if (mGo) mGo.onclick = () => window.open(item.url, "_blank", "noopener,noreferrer");
    if (mCopy) mCopy.onclick = () => copyText(item.url);
    if (mShare) mShare.onclick = () => shareUrl(item.name, item.url);

    if (mQuick) {
      mQuick.innerHTML = "";
      const q = Array.isArray(item.quick) ? item.quick : [];
      if (q.length) {
        q.forEach(qi => {
          if (!qi || !qi.url) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "quickBtn";
          btn.textContent = safeText(qi.label || "Quick");
          btn.addEventListener("click", () => window.open(normalizeUrl(qi.url), "_blank", "noopener,noreferrer"));
          mQuick.appendChild(btn);
        });
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quickBtn";
        btn.textContent = "바로가기";
        btn.addEventListener("click", () => window.open(item.url, "_blank", "noopener,noreferrer"));
        mQuick.appendChild(btn);
      }
    }

    modalBack.classList.add("on");
    modalBack.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    if (!modalBack) return;
    modalBack.classList.remove("on");
    modalBack.setAttribute("aria-hidden", "true");
  };

  const renderCards = (list) => {
    if (!gridEl) return;

    gridEl.innerHTML = "";
    list.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "cardHead";

      const title = document.createElement("b");
      title.className = "cardTitle";
      title.textContent = item.name;

      const meta = document.createElement("div");
      meta.className = "cardMeta";
      meta.textContent = item.tagline || item.group;

      head.appendChild(title);
      head.appendChild(meta);

      const url = document.createElement("div");
      url.className = "cardUrl";
      url.textContent = item.url;

      const row = document.createElement("div");
      row.className = "cardBtns";

      const go = document.createElement("button");
      go.type = "button";
      go.className = "miniBtn primary";
      go.textContent = "바로가기";
      go.addEventListener("click", () => window.open(item.url, "_blank", "noopener,noreferrer"));

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "miniBtn";
      copy.textContent = "복사";
      copy.addEventListener("click", () => copyText(item.url));

      const more = document.createElement("button");
      more.type = "button";
      more.className = "miniBtn";
      more.textContent = "상세";
      more.addEventListener("click", () => openModal(item));

      row.appendChild(go);
      row.appendChild(copy);
      row.appendChild(more);

      card.appendChild(head);
      card.appendChild(url);
      card.appendChild(row);

      gridEl.appendChild(card);
    });
  };

  // -----------------------------
  // Dock + Drawer
  // -----------------------------
  const renderDock = () => {
    if (!dockBtns) return;
    dockBtns.innerHTML = "";

    LINKS.slice(0, 12).forEach(item => {
      const a = document.createElement("button");
      a.type = "button";
      a.className = "dockBtn";
      a.textContent = item.short || item.name;
      a.addEventListener("click", () => window.open(item.url, "_blank", "noopener,noreferrer"));
      dockBtns.appendChild(a);
    });

    if (dockCopyAll) {
      dockCopyAll.onclick = () => {
        const txt = LINKS.map(x => `${x.name} — ${x.url}`).join("\n");
        copyText(txt);
      };
    }
    if (dockTop) {
      dockTop.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openDrawer = () => {
    if (!drawerBack) return;
    drawerBack.classList.add("on");
    drawerBack.setAttribute("aria-hidden", "false");
  };
  const closeDrawer = () => {
    if (!drawerBack) return;
    drawerBack.classList.remove("on");
    drawerBack.setAttribute("aria-hidden", "true");
  };

  const renderDrawer = () => {
    if (!drawerLinks) return;
    drawerLinks.innerHTML = "";
    LINKS.forEach(item => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "drawerBtn";
      b.textContent = item.name;
      b.addEventListener("click", () => window.open(item.url, "_blank", "noopener,noreferrer"));
      drawerLinks.appendChild(b);
    });
  };

  // -----------------------------
  // Orbit
  // -----------------------------
  const computeOrbitGeometry = () => {
    if (!orbitNodesEl) return;
    const area = orbitNodesEl.parentElement; // orbit area container
    if (!area) return;
    const r = area.getBoundingClientRect();
    // center roughly where CORE is
    state.orbitCenter.x = r.width * 0.52;
    state.orbitCenter.y = r.height * 0.50;
    state.orbitR = Math.min(r.width, r.height) * 0.34;
  };

  const renderOrbit = (list) => {
    if (!orbitNodesEl) return;

    orbitNodesEl.innerHTML = "";
    // SVG links reset
    if (orbitLinksSvg) orbitLinksSvg.innerHTML = "";

    const n = list.length;
    if (hudNodesEl) hudNodesEl.textContent = String(n);

    if (!n) return;

    computeOrbitGeometry();
    const cx = state.orbitCenter.x;
    const cy = state.orbitCenter.y;
    const R = state.orbitR;

    // create nodes
    list.forEach((item, i) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "node";
      node.setAttribute("aria-label", item.name);

      // hint text used by cinematic lock HUD script
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = item.short || item.name;

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = item.badge || "LIVE";

      node.appendChild(hint);
      node.appendChild(badge);

      node.addEventListener("click", () => openModal(item));

      orbitNodesEl.appendChild(node);

      // initial pos will be updated by animation tick
      const angle = (Math.PI * 2 * i) / n;
      const x = cx + Math.cos(angle) * R;
      const y = cy + Math.sin(angle) * R;

      node.style.left = x + "px";
      node.style.top = y + "px";
    });

    // draw connecting lines to core (optional)
    if (orbitLinksSvg) {
      orbitLinksSvg.setAttribute("viewBox", `0 0 1000 1000`);
      orbitLinksSvg.setAttribute("preserveAspectRatio", "none");
    }
  };

  const orbitTick = (now) => {
    if (!orbitNodesEl) return requestAnimationFrame(orbitTick);

    const nodes = $$(".node", orbitNodesEl);
    if (!nodes.length) return requestAnimationFrame(orbitTick);

    if (!state.paused) {
      const dt = (now - state.orbitT0) / 1000;
      state.orbitAngle += dt * 0.35; // speed
      state.orbitT0 = now;
    } else {
      state.orbitT0 = now;
    }

    // update geometry occasionally
    // (mobile rotation / address bar changes)
    if (now % 30 < 16) computeOrbitGeometry();

    const cx = state.orbitCenter.x;
    const cy = state.orbitCenter.y;
    const R = state.orbitR;

    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const a = state.orbitAngle + (Math.PI * 2 * i) / n;

      // slight cinematic wobble
      const wob = 1 + Math.sin(now / 900 + i) * 0.015;
      const x = cx + Math.cos(a) * R * wob;
      const y = cy + Math.sin(a) * R * wob;

      nodes[i].style.left = x + "px";
      nodes[i].style.top = y + "px";
    }

    requestAnimationFrame(orbitTick);
  };

  // -----------------------------
  // Render All
  // -----------------------------
  const renderAll = () => {
    // prevent redundant render
    const key = `${state.q}__${state.group}`;
    if (state.lastRenderKey === key) return;
    state.lastRenderKey = key;

    setDocTitle();
    renderChips();

    const list = filterList();

    if (countEl) countEl.textContent = String(list.length);
    if (statEl) statEl.textContent = list.length ? `총 ${list.length}개 표시 중` : "검색 결과가 없습니다.";

    renderCards(list);
    renderOrbit(list);

    // keep dock/drawer stable
    renderDock();
    renderDrawer();
  };

  // -----------------------------
  // Events
  // -----------------------------
  const initEvents = () => {
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // query param ?q=...
    const params = new URLSearchParams(location.search);
    const q0 = safeText(params.get("q")).trim();
    if (qEl && q0) {
      qEl.value = q0;
      state.q = q0;
    }

    // Search
    if (qEl) {
      qEl.addEventListener("input", () => {
        state.q = qEl.value;
        // live render
        state.lastRenderKey = ""; // allow render
        renderAll();
      });
    }

    if (btnClear) {
      btnClear.addEventListener("click", () => {
        state.q = "";
        state.group = "ALL";
        if (qEl) qEl.value = "";
        state.lastRenderKey = "";
        renderAll();
        toast("초기화 완료");
      });
    }

    if (btnCopySelected) {
      btnCopySelected.addEventListener("click", () => {
        const list = filterList();
        const txt = list.map(x => `${x.name} — ${x.url}`).join("\n");
        copyText(txt);
      });
    }

    // Pause orbit
    if (btnPause) {
      btnPause.addEventListener("click", () => {
        state.paused = !state.paused;
        if (pauseState) pauseState.textContent = state.paused ? "정지" : "회전";
        toast(state.paused ? "오비트 정지" : "오비트 재개");
      });
    }

    // Hub link
    const hubUrl = location.href.split("#")[0];
    if (btnCopyHub) btnCopyHub.addEventListener("click", () => copyText(hubUrl));
    if (btnShareHub) btnShareHub.addEventListener("click", () => shareUrl("GLOBAL ALLIANCE HUB", hubUrl));

    // Emergency script
    const doEmergency = () => copyText(emergencyScript());
    if (btnEmergencyCopy) btnEmergencyCopy.addEventListener("click", doEmergency);

    // Drawer
    if (btnMenu) btnMenu.addEventListener("click", openDrawer);
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    if (drawerBack) {
      drawerBack.addEventListener("click", (e) => {
        if (e.target === drawerBack) closeDrawer();
      });
    }
    if (drawerCopyHub) drawerCopyHub.addEventListener("click", () => copyText(hubUrl));
    if (drawerShareHub) drawerShareHub.addEventListener("click", () => shareUrl("GLOBAL ALLIANCE HUB", hubUrl));
    if (drawerEmergency) drawerEmergency.addEventListener("click", doEmergency);

    // Modal
    if (mClose) mClose.addEventListener("click", closeModal);
    if (modalBack) {
      modalBack.addEventListener("click", (e) => {
        if (e.target === modalBack) closeModal();
      });
    }
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "/" && document.activeElement !== qEl) {
        // focus search
        if (qEl) {
          e.preventDefault();
          qEl.focus();
        }
      }
    });

    // Resize => recompute orbit
    window.addEventListener("resize", () => {
      state.lastRenderKey = ""; // force re-render orbit geometry
      renderAll();
    });
  };

  // -----------------------------
  // Boot
  // -----------------------------
  const bootSanity = () => {
    // if links empty, show message
    if (!LINKS.length) {
      toast("links.js 데이터가 비어있습니다. ALLIANCE_LINKS 확인!");
      if (statEl) statEl.textContent = "데이터 없음: assets/data/links.js 확인 필요";
    }
    if (hudNodesEl) hudNodesEl.textContent = String(LINKS.length);
    if (countEl) countEl.textContent = "0";
  };

  // -----------------------------
  // Start
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    try {
      bootSanity();
      initEvents();
      renderAll();
      requestAnimationFrame(orbitTick);
    } catch (e) {
      console.error(e);
      toast("스크립트 오류: app.js 교체 후 새로고침(Ctrl+F5)");
      if (statEl) statEl.textContent = "오류 발생: 캐시 삭제 후 새로고침(Ctrl+F5)";
    }
  });
})();
