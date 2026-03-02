(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const $ = (s, p = document) => p.querySelector(s);
  const safe = (v) => (v == null ? "" : String(v)).trim();

  const normalizeUrl = (u) => {
    const url = safe(u);
    if (!url) return "";
    if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
    return "https://" + url.replace(/^\/+/, "");
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  };

  const shareUrl = async ({ title, text, url }) => {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  };

  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(-2px)";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(6px)";
    }, 900);
  };

  // ----------------------------
  // i18n (UI only)
  // ----------------------------
  const I18N = {
    ko: {
      nav_orgs: "단체",
      nav_how: "이용",
      nav_contact: "문의",
      kicker: "OFFICIAL MASTER HUB · Central Gateway",
      headline: "한 화면에서 모든 단체로 즉시 이동합니다.",
      sub:
        "이 페이지는 각 단체/프로젝트의 “첫 관문”입니다. 모바일에서 바로 찾고, 바로 들어가고, 언제든지 다시 이 허브로 돌아오도록 설계했습니다.",
      frameText: "구조 >> 교차원리, 교차원리 기반 무도",
      btn_clear: "초기화",
      btn_copy_all: "전체 링크 복사",
      badge_showing: "표시 중",
      btn_copy_hub: "허브 링크 복사",
      btn_share: "공유",
      btn_emergency: "긴급 스크립트 복사",
      dir_title: "단체 바로가기",
      dir_tip: "모든 카드가 화면에 노출됩니다.\n“바로가기/복사/상세”로 빠르게 처리하세요.",
      how_title: "이 페이지 사용법",
      how_desc: "모바일 기준, 가장 빠르게 이동하는 방법",
      how_1: "상단 검색창에 키워드 입력 → 목록이 즉시 줄어듭니다.",
      how_2: "필터(칩)로 그룹을 좁힌 뒤 “바로가기”를 누르세요.",
      how_3: "“복사”는 카톡/문자 공유에 가장 빠릅니다.",
      how_4: "어디에서든 뒤로가기로 나와도, 상단에 허브가 항상 고정되어 있습니다.",
      contact_title: "문의",
      contact_desc: "허브/링크 오류 신고 및 개선 제안",
      contact_line1: "링크 오류(404)나 단체 추가 요청이 있으면 알려주세요.",
      contact_line2: "이 페이지는 “첫 관문”이므로 가장 빠르게 개선됩니다.",
      btn_back_to_dir: "단체 목록으로",
      foot_1: "운영 원칙: 신뢰 · 안전 · 기록 · 확장",
      foot_2: "구조 >> 교차원리, 교차원리 기반 무도 프레임 적용",
      go: "바로가기",
      copy: "복사",
      detail: "상세",
      no_result: "검색 결과가 없습니다.",
      all: "ALL",
      quick: "빠른 이동",
    },
    en: {
      nav_orgs: "Organizations",
      nav_how: "How",
      nav_contact: "Contact",
      kicker: "OFFICIAL MASTER HUB · Central Gateway",
      headline: "Enter every organization from a single screen.",
      sub:
        "This page is the first gateway to every organization/project. Designed for mobile-first access with search, filter, copy and share.",
      frameText: "Structure >> Cross-Principle, Cross-Principle Based Martial Arts",
      btn_clear: "Reset",
      btn_copy_all: "Copy All Links",
      badge_showing: "Showing",
      btn_copy_hub: "Copy Hub URL",
      btn_share: "Share",
      btn_emergency: "Copy Emergency Script",
      dir_title: "Directory",
      dir_tip: "All links are visible on screen.\nUse Go / Copy / Detail for speed.",
      how_title: "How to use",
      how_desc: "Fastest way on mobile",
      how_1: "Type a keyword in the search bar → list filters instantly.",
      how_2: "Use chips to narrow groups, then tap “Go”.",
      how_3: "“Copy” is best for messaging apps.",
      how_4: "Header stays pinned as your always-available hub entry.",
      contact_title: "Contact",
      contact_desc: "Report link issues & suggest improvements",
      contact_line1: "Let us know if a link is broken (404) or if you want to add a site.",
      contact_line2: "This is the primary gateway, so we improve it quickly.",
      btn_back_to_dir: "Back to directory",
      foot_1: "Principles: Trust · Safety · Record · Scale",
      foot_2: "Frame applied",
      go: "Go",
      copy: "Copy",
      detail: "Detail",
      no_result: "No results.",
      all: "ALL",
      quick: "Quick",
    },
  };

  let lang = "ko";
  const t = (key) => (I18N[lang] && I18N[lang][key]) || key;

  const applyI18n = () => {
    document.documentElement.lang = lang === "ko" ? "ko" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      // 줄바꿈 표현
      el.textContent = String(val).replace(/\n/g, " ");
    });
  };

  // ----------------------------
  // Data (from assets/data/links.js)
  // ----------------------------
  const raw = Array.isArray(window.ALLIANCE_LINKS) ? window.ALLIANCE_LINKS : [];

  // 핵심 단체(전총재님이 주신 주소 기반) — links.js에 없더라도 “기본 세트”로 보장
  const CORE = [
    { name_ko: "메인허브", name_en: "Main Hub", url: "https://jeonseongkweon-cloud.github.io/global-alliance-hub/", group: "HUB", desc_ko: "전체 단체를 연결하는 공식 대문", desc_en: "Official gateway for all organizations" },
    { name_ko: "더블크로스 코리아", name_en: "Double Cross Korea", url: "https://doublecross.kr/", group: "MARTIAL", desc_ko: "공식 프로그램 · 지정도장 네트워크 · 성장 기록", desc_en: "Official program · network · records" },
    { name_ko: "Global News24", name_en: "Global News24", url: "https://news24.ai.kr/", group: "MEDIA", desc_ko: "보도자료 · 기록 · 국제 네트워크 뉴스룸", desc_en: "Press · archives · global newsroom" },
    { name_ko: "어린이안전", name_en: "Safety Hub (Kids)", url: "https://ikg.ai.kr/", group: "SAFETY", desc_ko: "QR 하나로 긴급·교육·대응을 연결하는 안전 허브", desc_en: "QR-based safety & response hub" },
    { name_ko: "국제경찰무도연합회 (IPMA)", name_en: "IPMA", url: "https://ipma.kr/", group: "ALLIANCE", desc_ko: "현장 대응 · 안전 통제 · 윤리 규정 · 국제 네트워크", desc_en: "Field response · safety control · ethics · network" },
    { name_ko: "세계태권검도연맹", name_en: "World Taekwon Kumdo Federation", url: "https://jeonseongkweon-cloud.github.io/taekwonkumdo/", group: "FEDERATION", desc_ko: "국제 보급 · 지도자/지부 체계 · 공인 심사", desc_en: "Global expansion · branches · official exams" },
    { name_ko: "국제공익자격인증재단 (IPCF)", name_en: "IPCF", url: "https://jeonseongkweon-cloud.github.io/ipcf/", group: "CERTIFICATION", desc_ko: "공익 기반 자격 인증 · 검증 · 신뢰 시스템", desc_en: "Public certification · verification · trust" },
    { name_ko: "IPMA 출판사", name_en: "IPMA Publishing", url: "https://jeonseongkweon-cloud.github.io/ipma-publishing/", group: "PUBLISHING", desc_ko: "출판 · 콘텐츠 · 아카이브 · 디지털 발행", desc_en: "Publishing · content · archive · digital" },
    { name_ko: "세계안전미래재단 (WSFA)", name_en: "WSFA", url: "https://jeonseongkweon-cloud.github.io/wsfa/", group: "SAFETY", desc_ko: "안전 캠페인 · 자료 · 검증 · 미래 안전 플랫폼", desc_en: "Safety campaigns · resources · platform" },
    { name_ko: "글로벌뉴스24 (GitHub Pages)", name_en: "Global News24 (Pages)", url: "https://jeonseongkweon-cloud.github.io/gn24/", group: "MEDIA", desc_ko: "기존 GitHub Pages 뉴스룸", desc_en: "GitHub Pages newsroom" },
  ];

  // merge raw + core (raw 우선, core는 보장)
  const byUrl = new Map();
  const pushItem = (it) => {
    const url = normalizeUrl(it.url || it.href);
    if (!url) return;
    if (byUrl.has(url)) return;

    const name = safe(it.name || it.title || it.short) || safe(it.name_ko || it.name_en) || url;
    byUrl.set(url, {
      url,
      group: safe(it.group || it.category || it.tag || it.groupKey || "ALL"),
      name_ko: safe(it.name_ko) || name,
      name_en: safe(it.name_en) || safe(it.name_en) || name,
      desc_ko: safe(it.desc_ko || it.tagline || it.desc || it.description) || "",
      desc_en: safe(it.desc_en) || "",
      priority: Number.isFinite(+it.priority) ? +it.priority : 999,
    });
  };

  raw.forEach((x) => pushItem(x));
  CORE.forEach((x) => pushItem(x));

  const ITEMS = Array.from(byUrl.values()).sort((a, b) => a.priority - b.priority);

  // ----------------------------
  // UI Targets
  // ----------------------------
  const grid = $("#grid");
  const chipsWrap = $("#chips");
  const inputQ = $("#q");
  const countEl = $("#count");

  const btnClear = $("#btnClear");
  const btnCopyAll = $("#btnCopyAll");
  const btnCopyHub = $("#btnCopyHub");
  const btnShareHub = $("#btnShareHub");
  const btnEmergency = $("#btnEmergency");

  const btnLangKo = $("#btnLangKo");
  const btnLangEn = $("#btnLangEn");

  const floatTop = $("#floatTop");
  const btnTop = $("#btnTop");

  const HUB_URL = location.href.split("#")[0];

  // ----------------------------
  // State
  // ----------------------------
  const state = {
    q: "",
    group: "ALL",
    filtered: [],
  };

  // ----------------------------
  // Groups / Chips
  // ----------------------------
  const buildGroups = () => {
    const map = new Map();
    ITEMS.forEach((it) => {
      const g = safe(it.group) || "ALL";
      map.set(g, (map.get(g) || 0) + 1);
    });

    const groups = [{ key: "ALL", label: t("all"), count: ITEMS.length }];

    Array.from(map.entries())
      .filter(([k]) => k !== "ALL")
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => groups.push({ key: k, label: k, count: v }));

    return groups;
  };

  const renderChips = () => {
    if (!chipsWrap) return;
    const groups = buildGroups();
    chipsWrap.innerHTML = "";

    groups.forEach((g) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.group === g.key ? " on" : "");
      b.innerHTML = `<span>${g.label}</span><small>${g.count}</small>`;
      b.addEventListener("click", () => {
        state.group = g.key;
        renderChips();
        applyFilter();
      });
      chipsWrap.appendChild(b);
    });
  };

  // ----------------------------
  // Filtering
  // ----------------------------
  const applyFilter = () => {
    const q = safe(state.q).toLowerCase();
    const g = state.group;

    const filtered = ITEMS.filter((it) => {
      const inGroup = g === "ALL" ? true : safe(it.group) === g;
      if (!inGroup) return false;

      if (!q) return true;

      const name = lang === "ko" ? it.name_ko : it.name_en;
      const desc = lang === "ko" ? it.desc_ko : (it.desc_en || it.desc_ko);
      const hay = `${name} ${desc} ${it.group} ${it.url}`.toLowerCase();
      return hay.includes(q);
    });

    state.filtered = filtered;
    if (countEl) countEl.textContent = String(filtered.length);

    renderGrid();
  };

  // ----------------------------
  // Detail Modal
  // ----------------------------
  const ensureModal = () => {
    let modal = $("#hudModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "hudModal";
    modal.style.cssText = `
      position:fixed; inset:0; z-index:9998; display:none;
      background: rgba(0,0,0,.48);
      backdrop-filter: blur(6px);
    `;
    modal.innerHTML = `
      <div id="hudModalCard" style="
        position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
        width:min(560px, 92vw);
        border-radius:22px;
        border:1px solid rgba(88,166,255,.18);
        background: rgba(6,9,20,.86);
        box-shadow:0 24px 90px rgba(0,0,0,.65);
        padding:16px 16px 14px;
        color:rgba(235,245,255,.94);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="min-width:0;">
            <div style="font-size:11px; opacity:.8; letter-spacing:.12em;">DETAIL</div>
            <div id="hudTitle" style="font-size:18px; font-weight:950; letter-spacing:-.02em; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
          </div>
          <button id="hudClose" type="button" style="
            width:44px; height:44px; border-radius:14px;
            border:1px solid rgba(88,166,255,.18);
            background: rgba(6,9,20,.32);
            color:rgba(235,245,255,.92);
            font-weight:950;
            cursor:pointer;
          ">✕</button>
        </div>

        <div id="hudDesc" style="margin-top:10px; color:rgba(220,230,255,.82); line-height:1.5;"></div>

        <div style="margin-top:12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace;
          padding:10px 12px; border-radius:14px; border:1px solid rgba(88,166,255,.14);
          background: rgba(6,9,20,.22); word-break:break-word; overflow-wrap:anywhere;
          color:rgba(180,220,255,.92);
        " id="hudUrl"></div>

        <div style="display:flex; gap:10px; margin-top:12px;">
          <a id="hudGo" target="_blank" rel="noopener noreferrer" style="
            flex:1; height:44px; border-radius:14px;
            border:1px solid rgba(56,232,255,.24);
            background: rgba(56,232,255,.10);
            display:flex; align-items:center; justify-content:center;
            color:rgba(235,245,255,.95); font-weight:950; text-decoration:none;
          ">Go</a>

          <button id="hudCopy" type="button" style="
            flex:1; height:44px; border-radius:14px;
            border:1px solid rgba(88,166,255,.14);
            background: rgba(6,9,20,.22);
            color:rgba(235,245,255,.92); font-weight:950; cursor:pointer;
          ">Copy</button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (e) => {
      const card = $("#hudModalCard");
      if (card && !card.contains(e.target)) closeModal();
    });

    document.body.appendChild(modal);

    $("#hudClose").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    return modal;
  };

  const openDetail = (it) => {
    const modal = ensureModal();
    const name = lang === "ko" ? it.name_ko : it.name_en;
    const desc = lang === "ko" ? it.desc_ko : (it.desc_en || it.desc_ko);

    $("#hudTitle").textContent = name;
    $("#hudDesc").textContent = desc || "";
    $("#hudUrl").textContent = it.url;

    const hudGo = $("#hudGo");
    hudGo.href = it.url;
    hudGo.textContent = t("go");

    const hudCopy = $("#hudCopy");
    hudCopy.textContent = t("copy");
    hudCopy.onclick = async () => {
      const ok = await copyText(it.url);
      toast(ok ? "링크 복사 완료" : "복사 실패");
    };

    modal.style.display = "block";
  };

  const closeModal = () => {
    const modal = $("#hudModal");
    if (modal) modal.style.display = "none";
  };

  // ----------------------------
  // Render Grid
  // ----------------------------
  const renderGrid = () => {
    if (!grid) return;

    const list = state.filtered;

    grid.innerHTML = "";
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "glass";
      empty.style.padding = "14px";
      empty.style.gridColumn = "1 / -1";
      empty.style.textAlign = "center";
      empty.style.fontWeight = "950";
      empty.style.color = "rgba(220,230,255,.82)";
      empty.textContent = t("no_result");
      grid.appendChild(empty);
      return;
    }

    list.forEach((it) => {
      const name = lang === "ko" ? it.name_ko : it.name_en;
      const desc = lang === "ko" ? it.desc_ko : (it.desc_en || it.desc_ko);

      const card = document.createElement("article");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "top";

      const h3 = document.createElement("h3");
      h3.className = "title";
      h3.textContent = name;

      const live = document.createElement("span");
      live.className = "live";
      live.textContent = "LIVE";

      top.appendChild(h3);
      top.appendChild(live);

      const p = document.createElement("p");
      p.className = "desc";
      p.textContent = desc || "";

      const aUrl = document.createElement("a");
      aUrl.className = "url";
      aUrl.href = it.url;
      aUrl.target = "_blank";
      aUrl.rel = "noopener noreferrer";
      aUrl.textContent = it.url;

      const actions = document.createElement("div");
      actions.className = "actions";

      const go = document.createElement("a");
      go.className = "btn primary";
      go.href = it.url;
      go.target = "_blank";
      go.rel = "noopener noreferrer";
      go.textContent = t("go");

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "btn";
      copy.textContent = t("copy");
      copy.addEventListener("click", async () => {
        const ok = await copyText(it.url);
        toast(ok ? "링크 복사 완료" : "복사 실패");
      });

      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "btn";
      detail.textContent = t("detail");
      detail.addEventListener("click", () => openDetail(it));

      actions.appendChild(go);
      actions.appendChild(copy);
      actions.appendChild(detail);

      card.appendChild(top);
      card.appendChild(p);
      card.appendChild(aUrl);
      card.appendChild(actions);

      grid.appendChild(card);
    });
  };

  // ----------------------------
  // Emergency script
  // ----------------------------
  const buildEmergencyScript = () => {
    return [
      "[긴급 신고 템플릿]",
      "1) 현재 위치: (주소/건물/층/랜드마크)",
      "2) 상황: (실종/부상/폭력/화재/교통사고 등)",
      "3) 대상: (이름/나이/인상착의/특이사항)",
      "4) 마지막 확인: (시간/장소/동선)",
      "5) 연락처: (보호자/현장 연락처)",
      "",
      "※ 112/119 신고 시 위 항목을 그대로 읽어주세요.",
    ].join("\n");
  };

  // ----------------------------
  // Bind
  // ----------------------------
  const bind = () => {
    // search
    if (inputQ) {
      inputQ.addEventListener("input", () => {
        state.q = inputQ.value;
        applyFilter();
      });
    }

    // reset
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        if (inputQ) inputQ.value = "";
        state.q = "";
        state.group = "ALL";
        renderChips();
        applyFilter();
        toast(lang === "ko" ? "초기화 완료" : "Reset done");
      });
    }

    // copy all
    if (btnCopyAll) {
      btnCopyAll.addEventListener("click", async () => {
        const list = state.filtered.length ? state.filtered : ITEMS;
        const lines = list.map((it) => {
          const name = lang === "ko" ? it.name_ko : it.name_en;
          return `${name} — ${it.url}`;
        });
        const text = ["[GLOBAL ALLIANCE HUB - LINKS]", ...lines].join("\n");
        const ok = await copyText(text);
        toast(ok ? (lang === "ko" ? "전체 링크 복사 완료" : "Copied") : (lang === "ko" ? "복사 실패" : "Copy failed"));
      });
    }

    // copy hub
    if (btnCopyHub) {
      btnCopyHub.addEventListener("click", async () => {
        const ok = await copyText(HUB_URL);
        toast(ok ? (lang === "ko" ? "허브 링크 복사 완료" : "Hub URL copied") : (lang === "ko" ? "복사 실패" : "Copy failed"));
      });
    }

    // share
    if (btnShareHub) {
      btnShareHub.addEventListener("click", async () => {
        const ok = await shareUrl({ title: "GLOBAL ALLIANCE HUB", url: HUB_URL });
        if (ok) {
          toast(lang === "ko" ? "공유 완료" : "Shared");
          return;
        }
        // fallback to copy
        await copyText(HUB_URL);
        toast(lang === "ko" ? "공유 불가 → 복사로 대체" : "Share unavailable → copied");
      });
    }

    // emergency
    if (btnEmergency) {
      btnEmergency.addEventListener("click", async () => {
        await copyText(buildEmergencyScript());
        toast(lang === "ko" ? "긴급 스크립트 복사 완료" : "Emergency script copied");
      });
    }

    // language
    if (btnLangKo) btnLangKo.addEventListener("click", () => setLang("ko"));
    if (btnLangEn) btnLangEn.addEventListener("click", () => setLang("en"));

    // floating top
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (!floatTop) return;
      floatTop.style.display = y > 500 ? "block" : "none";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (btnTop) {
      btnTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };

  const setLang = (next) => {
    lang = next;
    applyI18n();
    renderChips();
    applyFilter();

    // 버튼 상태 표시(간단하게 테두리 강조)
    const ko = $("#btnLangKo");
    const en = $("#btnLangEn");
    if (ko && en) {
      ko.style.borderColor = next === "ko" ? "rgba(56,232,255,.32)" : "rgba(88,166,255,.16)";
      en.style.borderColor = next === "en" ? "rgba(56,232,255,.32)" : "rgba(88,166,255,.16)";
    }
  };

  // ----------------------------
  // Init
  // ----------------------------
  const init = () => {
    // year
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());

    if (!ITEMS.length) {
      if (countEl) countEl.textContent = "0";
      toast("데이터 로드 실패: assets/data/links.js 확인");
      return;
    }

    setLang("ko"); // default
    bind();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
