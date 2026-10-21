/**
 * HirePulse Universal Job Board Widget
 * Zero-dependency, embeddable in any website (HTML, WordPress, Webflow, Shopify, etc.)
 * Usage:
 *   <div id="hirepulse-jobs-widget" data-api="http://localhost:8000/api/v1" data-theme="dark" data-limit="6"></div>
 *   <script src="http://localhost:8000/static/widget.js" async></script>
 */
(function() {
  'use strict';

  function initWidget() {
    const containers = document.querySelectorAll('#hirepulse-jobs-widget, [data-hirepulse-widget]');
    if (!containers.length) return;

    containers.forEach(container => {
      if (container.dataset.initialized) return;
      container.dataset.initialized = 'true';

      const apiUrl = (container.dataset.api || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
      const theme = container.dataset.theme || 'dark';
      const pageSize = parseInt(container.dataset.limit, 10) || 6;
      let currentPage = 1;
      let currentKeyword = '';
      let currentWorkMode = '';

      // Shadow DOM or scoped styling container
      const isDark = theme !== 'light';
      const bg = isDark ? '#0f172a' : '#f8fafc';
      const cardBg = isDark ? '#1e293b' : '#ffffff';
      const border = isDark ? '#334155' : '#e2e8f0';
      const text = isDark ? '#f8fafc' : '#0f172a';
      const textMuted = isDark ? '#94a3b8' : '#64748b';
      const primary = '#6366f1';
      const primaryHover = '#4f46e5';

      container.innerHTML = `
        <div class="hp-widget-wrapper" style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: ${bg};
          color: ${text};
          padding: 24px;
          border-radius: 16px;
          border: 1px solid ${border};
          max-width: 900px;
          margin: 0 auto;
          box-sizing: border-box;
          line-height: 1.5;
        ">
          <!-- Widget Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: ${text};">Live Job Openings</h3>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: ${textMuted};">Aggregated from verified direct ATS boards</p>
            </div>
            <div style="font-size: 12px; background: rgba(99, 102, 241, 0.15); color: ${primary}; padding: 4px 10px; border-radius: 20px; font-weight: 600;">
              ⚡ Powered by HirePulse
            </div>
          </div>

          <!-- Controls: Search & Work Mode Pills -->
          <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; gap: 8px;">
              <input type="text" id="hp-search-input" placeholder="Search by role, company, or skill..." style="
                flex: 1;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid ${border};
                background: ${cardBg};
                color: ${text};
                font-size: 14px;
                outline: none;
                box-sizing: border-box;
              " />
              <button id="hp-search-btn" style="
                background: ${primary};
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 10px 18px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
              ">Search</button>
            </div>

            <!-- Filter Pills -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="hp-mode-pills">
              <button data-mode="" class="hp-pill hp-pill-active" style="padding: 5px 12px; border-radius: 20px; border: 1px solid ${primary}; background: ${primary}; color: #fff; font-size: 12px; font-weight: 500; cursor: pointer;">All Roles</button>
              <button data-mode="remote" class="hp-pill" style="padding: 5px 12px; border-radius: 20px; border: 1px solid ${border}; background: ${cardBg}; color: ${textMuted}; font-size: 12px; font-weight: 500; cursor: pointer;">Remote</button>
              <button data-mode="hybrid" class="hp-pill" style="padding: 5px 12px; border-radius: 20px; border: 1px solid ${border}; background: ${cardBg}; color: ${textMuted}; font-size: 12px; font-weight: 500; cursor: pointer;">Hybrid</button>
              <button data-mode="on_site" class="hp-pill" style="padding: 5px 12px; border-radius: 20px; border: 1px solid ${border}; background: ${cardBg}; color: ${textMuted}; font-size: 12px; font-weight: 500; cursor: pointer;">On-site</button>
            </div>
          </div>

          <!-- Job Cards Container -->
          <div id="hp-jobs-list" style="display: flex; flex-direction: column; gap: 12px; min-height: 200px;">
            <div style="text-align: center; padding: 40px; color: ${textMuted}; font-size: 14px;">Loading verified job vacancies...</div>
          </div>

          <!-- Pagination Bar -->
          <div id="hp-pagination" style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid ${border};">
            <button id="hp-prev-btn" disabled style="padding: 8px 14px; border-radius: 6px; border: 1px solid ${border}; background: ${cardBg}; color: ${textMuted}; font-size: 13px; cursor: pointer; opacity: 0.5;">&larr; Previous</button>
            <span id="hp-page-info" style="font-size: 13px; color: ${textMuted};">Page 1</span>
            <button id="hp-next-btn" disabled style="padding: 8px 14px; border-radius: 6px; border: 1px solid ${border}; background: ${cardBg}; color: ${textMuted}; font-size: 13px; cursor: pointer; opacity: 0.5;">Next &rarr;</button>
          </div>
        </div>
      `;

      const listEl = container.querySelector('#hp-jobs-list');
      const searchInput = container.querySelector('#hp-search-input');
      const searchBtn = container.querySelector('#hp-search-btn');
      const prevBtn = container.querySelector('#hp-prev-btn');
      const nextBtn = container.querySelector('#hp-next-btn');
      const pageInfo = container.querySelector('#hp-page-info');
      const pills = container.querySelectorAll('.hp-pill');

      function fetchJobs() {
        listEl.innerHTML = `<div style="text-align: center; padding: 40px; color: ${textMuted}; font-size: 14px;">Loading verified job vacancies...</div>`;
        
        let url = `${apiUrl}/jobs?page=${currentPage}&page_size=${pageSize}`;
        if (currentKeyword) url += `&keyword=${encodeURIComponent(currentKeyword)}`;
        if (currentWorkMode) url += `&work_mode=${encodeURIComponent(currentWorkMode)}`;

        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch jobs');
            return res.json();
          })
          .then(data => {
            renderJobs(data);
          })
          .catch(err => {
            listEl.innerHTML = `
              <div style="text-align: center; padding: 30px; color: #ef4444; font-size: 14px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                Unable to load jobs from API. Please check connection.
              </div>
            `;
          });
      }

      function renderJobs(data) {
        if (!data.items || data.items.length === 0) {
          listEl.innerHTML = `
            <div style="text-align: center; padding: 40px; color: ${textMuted}; font-size: 14px;">
              No matching listings found for your search criteria.
            </div>
          `;
          prevBtn.disabled = true;
          nextBtn.disabled = true;
          pageInfo.textContent = '0 results';
          return;
        }

        pageInfo.textContent = `Page ${data.page} of ${data.total_pages} (${data.total} jobs)`;
        prevBtn.disabled = data.page <= 1;
        prevBtn.style.opacity = data.page <= 1 ? '0.5' : '1';
        nextBtn.disabled = data.page >= data.total_pages;
        nextBtn.style.opacity = data.page >= data.total_pages ? '0.5' : '1';

        listEl.innerHTML = data.items.map(job => {
          const workModeLabel = job.work_mode === 'remote' ? '🌐 Remote' : (job.work_mode === 'hybrid' ? '🏢 Hybrid' : '📍 On-site');
          const sourceBadge = job.source_name || 'Verified Source';
          
          return `
            <div style="
              background: ${cardBg};
              border: 1px solid ${border};
              border-radius: 12px;
              padding: 16px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
              transition: transform 0.2s, border-color 0.2s;
            ">
              <div style="flex: 1; min-width: 240px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(99, 102, 241, 0.1); color: ${primary}; padding: 2px 8px; border-radius: 4px;">
                    ${sourceBadge}
                  </span>
                  <span style="font-size: 11px; background: ${isDark ? '#334155' : '#f1f5f9'}; color: ${textMuted}; padding: 2px 8px; border-radius: 4px;">
                    ${workModeLabel}
                  </span>
                  ${job.salary_display !== 'Not disclosed' ? `<span style="font-size: 11px; background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 8px; border-radius: 4px; font-weight: 600;">💰 ${job.salary_display}</span>` : ''}
                </div>
                <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: ${text};">
                  ${job.title}
                </h4>
                <div style="font-size: 13px; color: ${textMuted}; display: flex; gap: 12px; flex-wrap: wrap;">
                  <span><strong>${job.company_name}</strong></span>
                  <span>📍 ${job.location_display}</span>
                </div>
              </div>

              <!-- Direct Application Action -->
              <div>
                <a href="${job.application_url}" target="_blank" rel="noopener noreferrer" style="
                  display: inline-block;
                  background: ${primary};
                  color: #ffffff;
                  text-decoration: none;
                  font-size: 13px;
                  font-weight: 600;
                  padding: 8px 16px;
                  border-radius: 8px;
                  white-space: nowrap;
                  transition: background 0.2s;
                ">
                  Apply &rarr;
                </a>
              </div>
            </div>
          `;
        }).join('');
      }

      // Event Listeners
      searchBtn.addEventListener('click', () => {
        currentKeyword = searchInput.value.trim();
        currentPage = 1;
        fetchJobs();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          currentKeyword = searchInput.value.trim();
          currentPage = 1;
          fetchJobs();
        }
      });

      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => {
            p.style.background = cardBg;
            p.style.color = textMuted;
            p.style.borderColor = border;
          });
          pill.style.background = primary;
          pill.style.color = '#ffffff';
          pill.style.borderColor = primary;

          currentWorkMode = pill.dataset.mode || '';
          currentPage = 1;
          fetchJobs();
        });
      });

      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          fetchJobs();
        }
      });

      nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchJobs();
      });

      // Initial Fetch
      fetchJobs();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
