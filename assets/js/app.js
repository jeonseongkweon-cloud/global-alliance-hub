(() => {
  "use strict";

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  const data = window.ALLIANCE_LINKS || [];

  if (!Array.isArray(data) || !data.length) {
    console.warn("ALLIANCE_LINKS not found.");
    return;
  }

  /* ===========================
     기본 요소 참조
  =========================== */
  const grid = $("#grid");
  const dropList = $("#dropList");
  const quickGrid = $("#quickGrid");
  const count = $("#count");
  const qInput = $("#q");

  /* ===========================
     공통 유틸
  =========================== */
  const normalize = (v) => (v || "").toString().trim();

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("복사 완료");
    } catch {
      toast("복사 실패");
    }
  };

  const toast = (msg) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 1000);
  };

  /* ===========================
     카드 렌더
  =========================== */
  const renderCards = (items) => {
    if (!grid) return;

    grid.innerHTML = items.map(item => {
      return `
      <article class="card">
        <div class="top">
          <h3 class="title">${item.name}</h3>
          <span class="live">${item.badge || "LIVE"}</span>
        </div>
        <p class="desc">${item.tagline || ""}</p>
        <a class="url" href="${item.url}" target="_blank">${item.url}</a>

        <div class="actions">
          <a class="btn primary" href="${item.url}" target="_blank">바로가기</a>
          <button class="btn" data-copy="${item.url}">복사</button>
        </div>

        ${item.quick && item.quick.length ? `
          <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
            ${item.quick.map(q =>
              `<a class="btn ghost" href="${q.url}" target="_blank" style="height:36px;font-size:12px;">${q.label}</a>`
            ).join("")}
          </div>
        ` : ""}
      </article>
      `;
    }).join("");

    count && (count.textContent = items.length);

    grid.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", () => {
        copy(btn.dataset.copy);
      });
    });
  };

  /* ===========================
     드롭다운 렌더
  =========================== */
  const renderDropdown = () => {
    if (!dropList) return;

    dropList.innerHTML = data.map(item => `
      <a class="dropItem" href="${item.url}" target="_blank">
        <b>${item.name}</b>
        <span>${item.tagline || ""}</span>
      </a>
    `).join("");
  };

  /* ===========================
     퀵런치 (quick 있는 것 위주 6개)
  =========================== */
  const renderQuick = () => {
    if (!quickGrid) return;

    const quickItems = data
      .filter(d => d.quick && d.quick.length)
      .slice(0, 6);

    quickGrid.innerHTML = quickItems.map(item => `
      <a class="quickBtn" href="${item.url}" target="_blank">
        <b>${item.short || item.name}</b>
        <span>${item.tagline || ""}</span>
      </a>
    `).join("");
  };

  /* ===========================
     검색
  =========================== */
  const applySearch = () => {
    const keyword = normalize(qInput?.value).toLowerCase();
    if (!keyword) {
      renderCards(data);
      return;
    }

    const filtered = data.filter(item => {
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.tagline.toLowerCase().includes(keyword) ||
        item.group.toLowerCase().includes(keyword)
      );
    });

    renderCards(filtered);
  };

  qInput && qInput.addEventListener("input", applySearch);

  /* ===========================
     초기 실행
  =========================== */
  renderCards(data);
  renderDropdown();
  renderQuick();

})();
