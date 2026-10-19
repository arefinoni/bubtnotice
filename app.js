// BUBT Telegram Notifier - Interactive System Architecture & Explorer

// Step definitions for the flowchart pipeline
const PIPELINE_STEPS = [
  {
    id: 1,
    title: "GitHub Actions Cron",
    subtitle: "Automated Orchestration",
    icon: "⏰",
    interval: "Every 30 Minutes",
    tags: ["Cron Trigger", "Ubuntu-Latest", "Headless Runner"],
    description: "GitHub Actions runner spins up on an ephemeral Ubuntu 22.04 LTS virtual machine on a strict 30-minute schedule (`*/30 * * * *`). Includes a monthly keep-alive job to ensure workflows never get disabled.",
    why: "Eliminates 24/7 dedicated server costs while maintaining 99.9% uptime and zero maintenance overhead.",
    input: "Cron trigger event or manual workflow dispatch",
    output: "Clean Python 3.11 environment with Chromium & Chromedriver",
    code: `# .github/workflows/scraper.yml
name: BUBT Notice Scraper
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch:
  push:
    branches: [ main ]`
  },
  {
    id: 2,
    title: "Headless Chromium",
    subtitle: "Anti-Detect Browser Launch",
    icon: "🌐",
    interval: "3-5s Execution",
    tags: ["Selenium", "Chromium", "Headless", "Custom User-Agent"],
    description: "Initializes headless Chromium with sandbox bypass and a realistic desktop User-Agent string. Configured with a 1920x1080 viewport and GPU hardware acceleration flags disabled for lightweight CI execution.",
    why: "Standard HTTP scrapers (like basic requests/curl) fail because the BUBT website uses client-side JavaScript rendering.",
    input: "Chromium binary location & chromedriver service",
    output: "Live WebDriver session ready to render dynamic DOM",
    code: `options = webdriver.ChromeOptions()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--user-agent=Mozilla/5.0 ...")
driver = webdriver.Chrome(service=service, options=options)`
  },
  {
    id: 3,
    title: "Portal Scraping",
    subtitle: "DOM Wait & Table Extraction",
    icon: "📑",
    interval: "8s JS Delay",
    tags: ["DOM Parsing", "CSS Selectors", "Table Row Extraction"],
    description: "Navigates to 'https://www.bubt.edu.bd/notice'. Waits 8 seconds for dynamic AJAX table rendering, then parses table rows (`table tr`), extracting the notice title and the detail page URL (`href`).",
    why: "An 8-second delay ensures all client-side JavaScript finishes hydrating the table before the scraper queries rows.",
    input: "https://www.bubt.edu.bd/notice",
    output: "List of top 5 notices: [{'title': '...', 'detail_url': '...'}]",
    code: `driver.get("https://www.bubt.edu.bd/notice")
time.sleep(8) # Wait for JS to render table
rows = driver.find_elements(By.CSS_SELECTOR, "table tr")
for row in rows:
    title = row.find_element(By.CSS_SELECTOR, "td:nth-child(2)").text.strip()
    eye = row.find_element(By.CSS_SELECTOR, "a")
    detail_url = eye.get_attribute("href")`
  },
  {
    id: 4,
    title: "Duplicate Detection",
    subtitle: "O(1) Set Database Filter",
    icon: "🛡️",
    interval: "< 1ms Query",
    tags: ["seen_notices.json", "O(1) Set Lookup", "Zero Spam Guarantee"],
    description: "Loads `seen_notices.json` into a Python set in memory. Every candidate notice URL is checked against this set in O(1) time complexity. If already seen, it is immediately skipped to prevent duplicate broadcasts.",
    why: "Guarantees students never receive duplicate notifications for the same notice even across multiple runs.",
    input: "seen_notices.json & candidate notice detail URLs",
    output: "Set of unseen new notices only",
    code: `seen = set(json.load(open("seen_notices.json")))
for notice in notices:
    if notice["detail_url"] not in seen:
        send_notice(notice)
        seen.add(notice["detail_url"])`
  },
  {
    id: 5,
    title: "PDF URL Resolution",
    subtitle: "Detail Page Deep Traversal",
    icon: "📄",
    interval: "5s JS Delay",
    tags: ["Direct Asset Finding", "Storage / Notices", "Fallback Text"],
    description: "For each new notice, the scraper navigates directly to the detail URL, waits 5 seconds for page load, and extracts the direct storage link ending in `.pdf` from `storage/notices/`.",
    why: "Notice attachments are hosted on internal storage URLs that must be resolved from the individual detail page.",
    input: "Notice detail page URL",
    output: "Direct downloadable PDF URL: https://.../storage/notices/*.pdf",
    code: `driver.get(notice["detail_url"])
time.sleep(5)
pdf_url = None
for a in driver.find_elements(By.TAG_NAME, "a"):
    href = a.get_attribute("href") or ""
    if "storage/notices" in href and ".pdf" in href:
        pdf_url = href
        break`
  },
  {
    id: 6,
    title: "PyMuPDF Image Engine",
    subtitle: "High-Res Multi-Page Stitcher",
    icon: "🖼️",
    interval: "150 DPI Rendering",
    tags: ["fitz / PyMuPDF", "Multi-Page Concatenation", "PNG Pixmap"],
    description: "Downloads the raw PDF bytes and parses all pages using PyMuPDF (fitz) at 150 DPI. Dynamically stacks all pages vertically into a single cohesive PNG image buffer in memory without writing temporary files.",
    why: "Mobile students can preview the full notice directly inside their Telegram chat without downloading or opening external viewer apps.",
    input: "Raw PDF binary stream",
    output: "Single consolidated PNG image stream (RGB 150 DPI)",
    code: `def pdf_to_single_image(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_pixmap(dpi=150) for page in doc]
    width = max(p.width for p in pages)
    total_height = sum(p.height for p in pages)
    combined = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, width, total_height))
    # Stitches pages vertically into one seamless image
    return combined.tobytes("png")`
  },
  {
    id: 7,
    title: "Telegram Bot Dispatch",
    subtitle: "Broadcast to Channel",
    icon: "✈️",
    interval: "HTTPS REST API",
    tags: ["Telegram Bot API", "sendPhoto", "Protected Secrets"],
    description: "Sends the generated notice image to the public channel `@bubtnotice` using `sendPhoto` with formatted caption and original source link. If no PDF is attached, automatically falls back to `sendMessage`.",
    why: "Instant push notification with instant thumbnail previews to students across desktop and mobile devices.",
    input: "Rendered PNG bytes + notice title + sanitized channel ID",
    output: "Telegram API HTTP 200 OK + broadcast post in channel",
    code: `# Securely injected at runtime via GitHub Secrets
requests.post(
    f"https://api.telegram.org/bot{os.environ['TELEGRAM_TOKEN']}/sendPhoto",
    data={"chat_id": os.environ["TELEGRAM_CHAT_ID"], "caption": f"New Notice🚨:\\n{title}\\n\\n{pdf_url}"},
    files={"photo": ("notice.png", img_bytes, "image/png")}
)`
  },
  {
    id: 8,
    title: "Git State Sync",
    subtitle: "Persistent Commit & Push",
    icon: "💾",
    interval: "Git Versioning",
    tags: ["git commit", "seen_notices.json", "GitHub Token Auth"],
    description: "Appends the freshly posted notice URLs to `seen_notices.json`. Commits the updated database file back to the repository's `main` branch with automated credentials to preserve persistent state for subsequent runs.",
    why: "Maintains a permanent, decentralized database directly in git version control without requiring an external SQL/NoSQL database.",
    input: "Updated seen_notices.json file",
    output: "Git commit [Update seen notices] pushed to origin/main",
    code: `git config user.email "bot@bubt"
git config user.name "BUBT Bot"
git add seen_notices.json
git diff --staged --quiet || git commit -m "Update seen notices" && git push`
  }
];

// STATE MANAGEMENT
let currentStepIndex = 0;
let isPlaying = false;
let playInterval = null;
let playSpeed = 3000;

// NOTICE EXPLORER STATE
let activeCategory = 'All';
let searchQuery = '';
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  initStatsCounters();
  renderFlowchartNodes();
  selectStep(0);
  initFlowchartControls();
  initSimulator();
  initNoticeExplorer();
});

// STATS COUNTERS ANIMATION
function initStatsCounters() {
  const countEl = document.getElementById("stat-total-count");
  if (!countEl) return;
  const target = (typeof NOTICES_DATA !== 'undefined' ? NOTICES_DATA.length : 105);
  
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    countEl.textContent = current;
  }, 30);
}

// RENDER FLOWCHART NODES
function renderFlowchartNodes() {
  const track = document.getElementById("pipeline-track");
  if (!track) return;
  track.innerHTML = "";

  PIPELINE_STEPS.forEach((step, idx) => {
    const node = document.createElement("div");
    node.className = `flow-step-node ${idx === 0 ? 'active' : ''}`;
    node.id = `step-node-${idx}`;
    node.onclick = () => {
      pauseFlowchart();
      selectStep(idx);
    };

    node.innerHTML = `
      <div class="node-header">
        <span class="node-badge">STEP 0${step.id}</span>
        <div class="node-icon-box">${step.icon}</div>
      </div>
      <h3 class="node-title">${step.title}</h3>
      <p class="node-desc">${step.subtitle}</p>
      <div class="node-meta">
        <span><span class="status-dot"></span>${step.interval}</span>
        <span>Inspect &rarr;</span>
      </div>
    `;

    track.appendChild(node);
  });
}

// SELECT A STEP IN THE FLOWCHART
function selectStep(index) {
  currentStepIndex = index;
  const step = PIPELINE_STEPS[index];
  
  // Highlight active node
  document.querySelectorAll(".flow-step-node").forEach((node, idx) => {
    node.classList.toggle("active", idx === index);
  });

  // Update current step display badge
  const stepBadge = document.getElementById("active-step-badge");
  if (stepBadge) {
    stepBadge.textContent = `Stage ${step.id} of ${PIPELINE_STEPS.length}: ${step.title}`;
  }

  // Render Inspector Drawer
  const inspector = document.getElementById("stage-inspector");
  if (inspector) {
    inspector.innerHTML = `
      <div class="inspector-info">
        <h4>${step.icon} ${step.title} <span class="step-indicator-badge">Stage 0${step.id}</span></h4>
        <p>${step.description}</p>
        
        <div class="inspector-tags">
          ${step.tags.map(t => `<span class="tag-badge"># ${t}</span>`).join('')}
        </div>

        <p style="font-size: 0.88rem; color: #7dd3fc; margin-bottom: 16px;">
          <strong>Why this design:</strong> ${step.why}
        </p>

        <div class="inspector-io-box">
          <div class="io-card">
            <div class="io-label">Input Data</div>
            <div class="io-value">${step.input}</div>
          </div>
          <div class="io-card">
            <div class="io-label">Output Result</div>
            <div class="io-value">${step.output}</div>
          </div>
        </div>
      </div>

      <div class="inspector-code-box">
        <div class="code-box-header">
          <span>SOURCE EXCERPT</span>
          <span class="sanitized-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Tokens Sanitized
          </span>
        </div>
        <div class="code-box-content">${escapeHtml(step.code)}</div>
      </div>
    `;
  }
}

// FLOWCHART PLAYBACK CONTROLS
function initFlowchartControls() {
  const playBtn = document.getElementById("btn-play-flow");
  const prevBtn = document.getElementById("btn-prev-step");
  const nextBtn = document.getElementById("btn-next-step");
  const resetBtn = document.getElementById("btn-reset-flow");
  const speedSelect = document.getElementById("playback-speed-select");

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (isPlaying) {
        pauseFlowchart();
      } else {
        startPlayFlowchart();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      pauseFlowchart();
      const prevIdx = (currentStepIndex - 1 + PIPELINE_STEPS.length) % PIPELINE_STEPS.length;
      selectStep(prevIdx);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      pauseFlowchart();
      const nextIdx = (currentStepIndex + 1) % PIPELINE_STEPS.length;
      selectStep(nextIdx);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      pauseFlowchart();
      selectStep(0);
    });
  }

  if (speedSelect) {
    speedSelect.addEventListener("change", (e) => {
      playSpeed = parseInt(e.target.value, 10);
      if (isPlaying) {
        clearInterval(playInterval);
        playInterval = setInterval(advanceStep, playSpeed);
      }
    });
  }
}

function startPlayFlowchart() {
  isPlaying = true;
  const playBtn = document.getElementById("btn-play-flow");
  if (playBtn) {
    playBtn.innerHTML = `<span>⏸</span> Pause`;
    playBtn.classList.add("active");
  }
  playInterval = setInterval(advanceStep, playSpeed);
}

function pauseFlowchart() {
  isPlaying = false;
  if (playInterval) clearInterval(playInterval);
  const playBtn = document.getElementById("btn-play-flow");
  if (playBtn) {
    playBtn.innerHTML = `<span>▶</span> Auto Play`;
    playBtn.classList.remove("active");
  }
}

function advanceStep() {
  const nextIdx = (currentStepIndex + 1) % PIPELINE_STEPS.length;
  selectStep(nextIdx);
}

// SIMULATOR COMPONENT
function initSimulator() {
  const runBtn = document.getElementById("sim-run-btn");
  const titleInput = document.getElementById("sim-title-input");
  const presetChips = document.querySelectorAll(".preset-chip");
  const terminal = document.getElementById("terminal-output");

  if (presetChips) {
    presetChips.forEach(chip => {
      chip.addEventListener("click", () => {
        if (titleInput) {
          titleInput.value = chip.getAttribute("data-title");
        }
      });
    });
  }

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      const noticeTitle = (titleInput && titleInput.value.trim()) || "Notice Regarding Mid-Term Examination Fall 2026";
      const isNew = document.querySelector('input[name="sim-seen-toggle"]:checked')?.value === "new";
      runSimulation(noticeTitle, isNew);
    });
  }
}

function appendLog(time, text, type = "info") {
  const terminal = document.getElementById("terminal-output");
  if (!terminal) return;
  const line = document.createElement("div");
  line.className = "log-line";
  
  let typeClass = "log-info";
  if (type === "success") typeClass = "log-success";
  if (type === "warn") typeClass = "log-warn";
  if (type === "highlight") typeClass = "log-highlight";

  line.innerHTML = `<span class="log-time">[${time}]</span> <span class="${typeClass}">${text}</span>`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function runSimulation(title, isNew) {
  const runBtn = document.getElementById("sim-run-btn");
  const terminal = document.getElementById("terminal-output");
  if (terminal) terminal.innerHTML = "";

  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = `Running Pipeline...`;
  }

  const now = new Date();
  const formatTime = (offsetSec) => {
    const t = new Date(now.getTime() + offsetSec * 1000);
    return t.toTimeString().split(' ')[0];
  };

  appendLog(formatTime(0), "🚀 [CRON TRIGGER] GitHub Actions runner initiated on schedule */30 * * * *", "highlight");
  
  setTimeout(() => {
    appendLog(formatTime(2), "🌐 Spawning Headless Chromium (version 120.0.0.0, user-agent spoofed)...");
  }, 600);

  setTimeout(() => {
    appendLog(formatTime(8), "⏳ Navigating to https://www.bubt.edu.bd/notice (waiting 8s for client JS render)...");
  }, 1400);

  setTimeout(() => {
    appendLog(formatTime(14), `📑 Found 5 table rows. Detected candidate: "${title}"`);
  }, 2200);

  setTimeout(() => {
    if (!isNew) {
      appendLog(formatTime(15), `🛡️ Duplicate Checker: Notice URL exists in seen_notices.json [O(1) CACHE HIT]`, "warn");
      appendLog(formatTime(16), `⏭️ Skipped duplicate broadcast. Zero spam delivered. Total seen: 105 notices.`, "warn");
      appendLog(formatTime(17), `🏁 Job completed in 17.2s. 0 items broadcasted.`, "success");
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = `⚡ Run Pipeline Simulation`;
      }
    } else {
      appendLog(formatTime(15), `🛡️ Duplicate Checker: Unseen notice verified! Proceeding to detail fetch...`, "success");
      
      setTimeout(() => {
        appendLog(formatTime(19), `📄 Detail URL resolved. Extracted storage attachment: /storage/notices/${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`);
      }, 800);

      setTimeout(() => {
        appendLog(formatTime(22), `🖼️ Downloading 482KB PDF... PyMuPDF (fitz) rendering 2 pages at 150 DPI into PNG...`);
      }, 1600);

      setTimeout(() => {
        appendLog(formatTime(24), `✈️ Telegram API dispatching to @bubtnotice via sendPhoto (Auth: [PROTECTED_BOT_SECRET])...`);
      }, 2400);

      setTimeout(() => {
        appendLog(formatTime(25), `✅ Telegram API Response: 200 OK! Image & caption delivered to channel.`, "success");
        appendLog(formatTime(26), `💾 Appended URL to seen_notices.json. Git committed & pushed state back to main.`, "highlight");
        appendLog(formatTime(27), `🏁 Pipeline finished successfully in 27.4s!`, "success");
        
        // Update Telegram phone mockup with this notice
        updateTelegramMockup(title);

        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = `⚡ Run Pipeline Simulation`;
        }
      }, 3200);
    }
  }, 3000);
}

function updateTelegramMockup(title) {
  const captionTitle = document.getElementById("tg-mock-title");
  const captionLink = document.getElementById("tg-mock-link");
  const timeEl = document.getElementById("tg-mock-time");

  if (captionTitle) {
    captionTitle.textContent = title;
  }
  if (captionLink) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    captionLink.textContent = `https://www.bubt.edu.bd/storage/notices/${slug}.pdf`;
  }
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;
  }

  const bubble = document.querySelector(".tg-message-bubble");
  if (bubble) {
    bubble.style.animation = 'none';
    bubble.offsetHeight; /* trigger reflow */
    bubble.style.animation = 'popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
  }
}

// NOTICE EXPLORER COMPONENT
function initNoticeExplorer() {
  if (typeof NOTICES_DATA === 'undefined') return;

  renderCategoryChips();
  renderNoticesTable();

  const searchInput = document.getElementById("notice-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1;
      renderNoticesTable();
    });
  }

  const prevBtn = document.getElementById("notices-page-prev");
  const nextBtn = document.getElementById("notices-page-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderNoticesTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderNoticesTable();
    });
  }
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-container");
  if (!container || typeof NOTICES_DATA === 'undefined') return;

  const counts = { All: NOTICES_DATA.length };
  NOTICES_DATA.forEach(n => {
    counts[n.category] = (counts[n.category] || 0) + 1;
  });

  const categories = ['All', 'Examinations', 'Academic & Registration', 'Fees & Payments', 'Tenders & Procurement', 'Holidays & Events', 'Campus & General'];
  
  container.innerHTML = categories.map(cat => {
    const num = counts[cat] || 0;
    return `
      <button class="cat-chip ${cat === activeCategory ? 'active' : ''}" onclick="selectNoticeCategory('${cat}')">
        ${cat} <span class="badge-num">${num}</span>
      </button>
    `;
  }).join('');
}

window.selectNoticeCategory = function(cat) {
  activeCategory = cat;
  currentPage = 1;
  renderCategoryChips();
  renderNoticesTable();
};

function getCategoryTagClass(category) {
  if (category.includes('Exam')) return 'Examinations';
  if (category.includes('Academic')) return 'Academic';
  if (category.includes('Fee')) return 'Fees';
  if (category.includes('Tender')) return 'Tenders';
  if (category.includes('Holiday')) return 'Holidays';
  return 'General';
}

function renderNoticesTable() {
  const listEl = document.getElementById("notices-list-container");
  const pageDisplay = document.getElementById("notices-page-info");
  const prevBtn = document.getElementById("notices-page-prev");
  const nextBtn = document.getElementById("notices-page-next");
  const countDisplay = document.getElementById("notices-filter-count");

  if (!listEl || typeof NOTICES_DATA === 'undefined') return;

  // Filter notices
  let filtered = NOTICES_DATA.filter(item => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesQuery = !searchQuery || item.title.toLowerCase().includes(searchQuery) || item.slug.toLowerCase().includes(searchQuery);
    return matchesCat && matchesQuery;
  });

  if (countDisplay) {
    countDisplay.textContent = `Showing ${filtered.length} of ${NOTICES_DATA.length} notices`;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (paginatedItems.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-dim);">
        <p style="font-size: 1.1rem; margin-bottom: 6px;">No notices matching your criteria</p>
        <p style="font-size: 0.85rem;">Try adjusting your search query or category filter.</p>
      </div>
    `;
  } else {
    listEl.innerHTML = paginatedItems.map((item, idx) => {
      const tagClass = getCategoryTagClass(item.category);
      return `
        <div class="notice-row-item">
          <div class="notice-left">
            <span class="notice-index">#${startIndex + idx + 1}</span>
            <div>
              <div class="notice-details-title">${item.title}</div>
              <div class="notice-tags-row">
                <span class="cat-tag ${tagClass}">${item.category}</span>
                <span class="posted-status-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Broadcasted to Telegram
                </span>
              </div>
            </div>
          </div>
          <div class="notice-actions">
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="link-btn" title="View official BUBT notice">
              <span>View Source</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update pagination info
  if (pageDisplay) {
    pageDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
  }
}

// HELPER: HTML ESCAPING
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
