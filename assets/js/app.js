(() => {
  "use strict";

  const $ = (s, p = document) => p.querySelector(s);

  const links = window.ALLIANCE_LINKS;
  if (!Array.isArray(links) || !links.length) {
    console.warn("ALLIANCE_LINKS not found or empty.");
    return;
  }

  // ✅ 화면 표시 이름(한글 친화)
  const DISPLAY_NAME = {
    hub: "메인허브",
    doublecross: "더블크로스 코리아",
    gn24: "글로벌뉴스24",
    kidsafety: "어린이안전",
    ipma: "국제경찰무도연합회 (IPMA)",
    taekwonkumdo: "세계태권검도연맹",
    ipcf: "국제공익자격인증재단",
    publish: "IPMA 출판사",
    wsfa: "세계안전미래재단"
  };

  const SHORT_NAME = {
    hub: "메인허브",
    doublecross: "더블크로스",
    gn24: "글로벌뉴스24",
    kidsafety: "어린이안전",
    ipma: "국제경찰무도",
    taekwonkumdo: "세계태권검도",
    ipcf: "공익자격인증",
    publish: "IPMA 출판",
    wsfa: "안전미래재단"
  };

  const getName = (item) => DISPLAY_NAME[item.id] || item.name || item.short || item.id;
  const getShort = (item) => SHORT_NAME[item.id] || item.short || item.name || item.id;

  const grid = $("#grid");
  const quickGrid = $("#quickGrid");
  const count = $("#count");
  const qInput = $("#q");

  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = 1;
    setTimeout(() => (el.style.opacity = 0), 1100);
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("링크 복사 완료");
    } catch {
      toast("복사 실패");
    }
  };

  const shareText = async (text) => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await copyText(text);
        toast("공유 미지원 → 복사로 대체");
      }
    } catch {
      // user cancel etc.
    }
  };

  // ✅ 긴급 스크립트(원하면 문구 더 짧게 다듬어드림)
  const EMERGENCY_SCRIPT =
`[긴급 안내]
112(경찰) / 119(구급·소방)
1) 위치(주소/랜드마크) 먼저
2) 상황(부상/화재/실종 등) 간단히
3) 안내에 따라 행동`;

  const safeLogo = (item) => (item && item.logo) ? item.logo : "";

  const renderQuick = () => {
    if (!quickGrid) return;

    const preferred = ["hub","doublecross","gn24","kidsafety","ipma","taekwonkumdo"];
    const pick = preferred.map(id => links.find(x => x.id === id)).filter(Boolean);

    quickGrid.innerHTML = pick.map(item => {
      const logo = safeLogo(item);
      return `
        <a class="quickBtn" href="${item.url}" target="_blank" rel="noopener">
          <span class="qLogo">${logo ? `<img src="${logo}" alt="${getShort(item)} 로고" loading="lazy">` : ""}</span>
          <span class="qText">
            <b>${getShort(item)}</b>
            <span>${item.tagline || ""}</span>
          </span>
        </a>
      `;
    }).join("");
  };

  // ✅ URL 텍스트는 “표시하지 않음”
  const cardHTML = (item) => {
    const name = getName(item);
    const badge = item.badge || "LIVE";
    const tagline = item.tagline || "";
    const url = item.url || "#";
    const quick = Array.isArray(item.quick) ? item.quick : [];
    const logo = safeLogo(item);

    return `
      <article class="card">
        <div class="cardTop">
          <div class="titleRow">
            <span class="cLogo">${logo ? `<img src="${logo}" alt="${name} 로고" loading="lazy">` : ""}</span>
            <h3 class="cardTitle">${name}</h3>
          </div>
          <span class="badge">
            <span style="width:8px;height:8px;border-radius:999px;background:rgba(56,232,255,.95);box-shadow:0 0 14px rgba(56,232,255,.55)"></span>
            ${badge}
          </span>
        </div>

        ${tagline ? `<p class="tagline">${tagline}</p>` : ""}

        <div class="row2">
          <a class="btn primary" href="${url}" target="_blank" rel="noopener">바로가기</a>
          <button class="btn" data-copy="${url}">링크 복사</button>
        </div>

        ${quick.length ? `
          <div class="rowQuick">
            ${quick.map(q => `
              <a class="btn mini" href="${q.url}" target="_blank" rel="noopener">${q.label}</a>
            `).join("")}
          </div>
        ` : ""}
      </article>
    `;
  };

  const renderList = (items) => {
    if (!grid) return;
    grid.innerHTML = items.map(cardHTML).join("");
    if (count) count.textContent = String(items.length);

    grid.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", () => copyText(btn.dataset.copy || ""));
    });
  };

  const normalize = (v) => (v || "").toString().trim().toLowerCase();

  const applySearch = () => {
    const q = normalize(qInput?.value);
    if (!q) return renderList(links);

    const filtered = links.filter(item => {
      const name = normalize(getName(item));
      const tag = normalize(item.tagline);
      const group = normalize(item.group);
      // URL도 검색엔 포함(표시는 안 함)
      const url = normalize(item.url);
      return name.includes(q) || tag.includes(q) || group.includes(q) || url.includes(q);
    });

    renderList(filtered);
  };

  // Buttons
  $("#btnReset")?.addEventListener("click", () => {
    if (qInput) qInput.value = "";
    renderList(links);
    toast("초기화");
  });

  $("#btnShareAll")?.addEventListener("click", async () => {
    const text = links.map(x => `${getName(x)}\n${x.url}`).join("\n\n");
    await shareText(text);
  });

  $("#btnEmergencyCopy")?.addEventListener("click", () => copyText(EMERGENCY_SCRIPT));

  qInput?.addEventListener("input", applySearch);

  // Init
  renderQuick();
  renderList(links);
})();
