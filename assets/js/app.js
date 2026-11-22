(function () {
  "use strict";

  var THEME_KEY = "patchbay-theme";

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* Lightweight client-side syntax highlighter for bash, sql, yaml, json, ts, go, http */
  function highlightCode(raw, lang) {
    var text = raw.replace(/\r\n/g, "\n");
    var placeholders = [];
    function stash(html) {
      var token = "@@TOK" + placeholders.length + "@@";
      placeholders.push(html);
      return token;
    }

    var escaped = escapeHtml(text);

    // Comments first (line comments # or -- or //)
    if (lang === "sql") {
      escaped = escaped.replace(/(--[^\n]*)/g, function (m) {
        return stash('<span class="tok-com">' + m + "</span>");
      });
    } else if (lang === "ts" || lang === "js" || lang === "go" || lang === "http") {
      escaped = escaped.replace(/(\/\/[^\n]*)/g, function (m) {
        return stash('<span class="tok-com">' + m + "</span>");
      });
    } else {
      escaped = escaped.replace(/(^|\s)(#[^\n]*)/gm, function (m, lead, comm) {
        return lead + stash('<span class="tok-com">' + comm + "</span>");
      });
    }

    // Strings ("..." and '...')
    escaped = escaped.replace(/(&quot;[^&]*?&quot;|"[^"\n]*"|'[^'\n]*')/g, function (m) {
      return stash('<span class="tok-str">' + m + "</span>");
    });

    if (lang === "yaml") {
      escaped = escaped.replace(/^(\s*-?\s*)([a-zA-Z0-9_.-]+)(:)/gm, function (m, indent, key, colon) {
        return indent + '<span class="tok-key">' + key + "</span>" + colon;
      });
    }

    if (lang === "json") {
      escaped = escaped.replace(/<span class="tok-str">("[^"]+")<\/span>(\s*:)/g, function (m, key) {
        return '<span class="tok-key">' + key + "</span>:";
      });
    }

    if (lang === "sql") {
      escaped = escaped.replace(
        /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|AS|AND|OR|NOT|IS|NULL|ORDER|BY|DESC|ASC|LIMIT|GROUP|HAVING|WITH|CASE|WHEN|THEN|END|UPDATE|SET|DELETE|INSERT|INTO|VALUES|CREATE|INDEX|CONCURRENTLY|EXPLAIN|ANALYZE)\b/gi,
        '<span class="tok-kw">$1</span>'
      );
    } else if (lang === "ts" || lang === "js") {
      escaped = escaped.replace(
        /\b(import|from|export|const|let|async|await|function|return|if|else|try|catch|throw|new|type|interface|true|false|null|undefined)\b/g,
        '<span class="tok-kw">$1</span>'
      );
    } else if (lang === "go") {
      escaped = escaped.replace(
        /\b(package|import|func|return|if|else|for|range|var|const|type|struct|defer|go|select|case|nil|err|error|context)\b/g,
        '<span class="tok-kw">$1</span>'
      );
    } else if (lang === "bash") {
      escaped = escaped.replace(
        /\b(kubectl|docker|curl|jq|psql|patchbay|git|systemctl|journalctl|grep|awk|sed|export|set|if|then|fi|for|do|done)\b/g,
        '<span class="tok-kw">$1</span>'
      );
      escaped = escaped.replace(/(\s--?[a-zA-Z0-9_-]+)/g, '<span class="tok-fn">$1</span>');
    } else if (lang === "http") {
      escaped = escaped.replace(/^(GET|POST|PUT|PATCH|DELETE|HTTP\/[0-9.]+)/gm, '<span class="tok-kw">$1</span>');
      escaped = escaped.replace(/^([A-Za-z-]+)(:)/gm, '<span class="tok-key">$1</span>$2');
    }

    // Numbers
    escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');

    // Restore stashed comments and strings
    escaped = escaped.replace(/@@TOK(\d+)@@/g, function (_, idx) {
      return placeholders[Number(idx)];
    });

    return escaped;
  }

  function initSyntaxHighlighting() {
    var blocks = document.querySelectorAll("pre.code-pre code[data-lang]");
    blocks.forEach(function (el) {
      var lang = el.getAttribute("data-lang") || "text";
      var raw = el.textContent || "";
      el.innerHTML = highlightCode(raw, lang);
    });
  }

  /* Theme toggle */
  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (e) {
      // Ignore storage access errors
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    toggles.forEach(function (btn) {
      var isLight = theme === "light";
      btn.setAttribute("aria-pressed", String(isLight));
      var label = btn.querySelector(".theme-label");
      if (label) {
        label.textContent = isLight ? "Тёмная тема" : "Светлая тема";
      }
      btn.setAttribute("title", isLight ? "Переключить на тёмную тему" : "Переключить на светлую тему");
    });
  }

  function initThemeToggle() {
    var current = document.documentElement.getAttribute("data-theme") || getPreferredTheme();
    applyTheme(current);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var now = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(now);
        try {
          localStorage.setItem(THEME_KEY, now);
        } catch (e) {
          // Ignore storage error
        }
      });
    });
  }

  /* Mobile navigation drawer */
  function initMobileMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var drawer = document.getElementById("mobile-drawer");
    if (!toggle || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    }

    toggle.addEventListener("click", function () {
      var isOpen = drawer.classList.contains("is-open");
      setOpen(!isOpen);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* Copy buttons for code blocks */
  function initCopyButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-copy-target], [data-copy-self]");
      if (!btn) return;

      var textToCopy = "";
      var container = btn.closest(".code-block, .workbench");
      if (container) {
        var codeEl = container.querySelector("pre.code-pre code");
        if (codeEl) {
          textToCopy = codeEl.textContent || "";
        }
      }
      if (!textToCopy) return;

      function markCopied() {
        var orig = btn.textContent;
        btn.classList.add("is-copied");
        btn.textContent = "Скопировано";
        window.setTimeout(function () {
          btn.classList.remove("is-copied");
          btn.textContent = orig;
        }, 1800);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(markCopied).catch(function () {
          fallbackCopy(textToCopy, markCopied);
        });
      } else {
        fallbackCopy(textToCopy, markCopied);
      }
    });
  }

  function fallbackCopy(text, onDone) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      onDone();
    } catch (e) {
      // Ignore if clipboard blocked
    }
    document.body.removeChild(area);
  }

  /* Interactive Hero Workbench */
  function initHeroWorkbench() {
    var root = document.querySelector("[data-workbench]");
    if (!root) return;

    var SNIPPETS = {
      postgres: {
        title: "Блокировки и долгие транзакции в PostgreSQL",
        status: "Проверено на PG 14–17",
        author: "@d.krasnov · Backend / DBA",
        note: "Используйте для диагностики зависших миграций без перезапуска пула.",
        versions: {
          "v2.4": {
            lang: "sql",
            code: [
              "-- Активные запросы старше 5 секунд и их блокирующие PID",
              "SELECT",
              "  a.pid,",
              "  now() - a.query_start AS duration,",
              "  a.state,",
              "  pg_blocking_pids(a.pid) AS blocked_by,",
              "  left(a.query, 120) AS query_preview",
              "FROM pg_stat_activity a",
              "WHERE a.state <> 'idle'",
              "  AND now() - a.query_start > interval '5 seconds'",
              "ORDER BY duration DESC;"
            ].join("\n")
          },
          "v2.1": {
            lang: "sql",
            code: [
              "-- Совместимо с PostgreSQL 12+ (без pg_blocking_pids в join)",
              "SELECT",
              "  pid,",
              "  age(clock_timestamp(), query_start) AS duration,",
              "  wait_event_type,",
              "  left(query, 100) AS query_preview",
              "FROM pg_stat_activity",
              "WHERE state = 'active'",
              "  AND clock_timestamp() - query_start > interval '5 seconds'",
              "ORDER BY duration DESC;"
            ].join("\n")
          }
        }
      },
      k8s: {
        title: "Причина рестартов пода в Kubernetes (OOMKilled / ExitCode)",
        status: "Проверено на K8s 1.28–1.31",
        author: "@m.tarasova · SRE",
        note: "Выводит последнее состояние контейнеров по всем подам выбранного namespace.",
        versions: {
          "v1.8": {
            lang: "bash",
            code: [
              "# Показать причину последнего завершения и лимиты памяти",
              "kubectl get pods -n production -o json | jq -r '",
              "  .items[] | .metadata.name as $pod |",
              "  .status.containerStatuses[]? |",
              "  select(.restartCount > 0) |",
              "  [$pod, .name, .restartCount, .lastState.terminated.reason, .lastState.terminated.exitCode] | @tsv",
              "' | column -t"
            ].join("\n")
          },
          "v1.5": {
            lang: "bash",
            code: [
              "# Быстрая выборка через jsonpath без jq",
              "kubectl get pods -n production \\",
              "  -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{range .status.containerStatuses[*]}{.restartCount}{\"\\t\"}{.lastState.terminated.reason}{\"\\n\"}{end}{end}'"
            ].join("\n")
          }
        }
      },
      nginx: {
        title: "Rate limit по X-Real-IP за балансировщиком",
        status: "Проверено на Nginx 1.24+",
        author: "@i.voronin · Platform",
        note: "Исключает ложное ограничение IP самого ingress-контроллера.",
        versions: {
          "v3.0": {
            lang: "bash",
            code: [
              "# /etc/nginx/conf.d/ratelimit.conf",
              "set_real_ip_from 10.24.0.0/16;",
              "real_ip_header X-Forwarded-For;",
              "real_ip_recursive on;",
              "",
              "limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;",
              "limit_req_status 429;"
            ].join("\n")
          },
          "v2.0": {
            lang: "bash",
            code: [
              "# Базовая зона без real_ip_recursive (для прямого трафика)",
              "limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;",
              "limit_req zone=api_limit burst=20 nodelay;"
            ].join("\n")
          }
        }
      },
      ts: {
        title: "Fetch с таймаутом и отменой через AbortController",
        status: "Проверено на Node 20+ / Browser",
        author: "@a.belova · Frontend",
        note: "Освобождает сокет и корректно различает таймаут и сетевую ошибку.",
        versions: {
          "v1.3": {
            lang: "ts",
            code: [
              "export async function fetchJson<T>(url: string, timeoutMs = 4000): Promise<T> {",
              "  const controller = new AbortController();",
              "  const timer = setTimeout(() => controller.abort(), timeoutMs);",
              "  try {",
              "    const res = await fetch(url, { signal: controller.signal });",
              "    if (!res.ok) throw new Error(`HTTP ${res.status}`);",
              "    return (await res.json()) as T;",
              "  } finally {",
              "    clearTimeout(timer);",
              "  }",
              "}"
            ].join("\n")
          },
          "v1.1": {
            lang: "ts",
            code: [
              "// Вариант на AbortSignal.timeout (Node 18+ / современные браузеры)",
              "export async function fetchJson<T>(url: string, timeoutMs = 4000): Promise<T> {",
              "  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });",
              "  if (!res.ok) throw new Error(`HTTP ${res.status}`);",
              "  return (await res.json()) as T;",
              "}"
            ].join("\n")
          }
        }
      }
    };

    var tabs = root.querySelectorAll("[data-wb-tab]");
    var titleEl = root.querySelector("[data-wb-title]");
    var statusEl = root.querySelector("[data-wb-status]");
    var authorEl = root.querySelector("[data-wb-author]");
    var noteEl = root.querySelector("[data-wb-note]");
    var versionSelect = root.querySelector("[data-wb-version]");
    var codeEl = root.querySelector("[data-wb-code]");

    var currentKey = "postgres";

    function renderSnippet(key, version) {
      var item = SNIPPETS[key];
      if (!item) return;
      currentKey = key;

      tabs.forEach(function (tab) {
        var active = tab.getAttribute("data-wb-tab") === key;
        tab.setAttribute("aria-selected", String(active));
      });

      var verKeys = Object.keys(item.versions);
      var selectedVer = version && item.versions[version] ? version : verKeys[0];

      if (versionSelect) {
        versionSelect.innerHTML = "";
        verKeys.forEach(function (v) {
          var opt = document.createElement("option");
          opt.value = v;
          opt.textContent = v;
          if (v === selectedVer) opt.selected = true;
          versionSelect.appendChild(opt);
        });
      }

      var payload = item.versions[selectedVer];
      if (titleEl) titleEl.textContent = item.title;
      if (statusEl) statusEl.textContent = item.status;
      if (authorEl) authorEl.textContent = item.author;
      if (noteEl) noteEl.textContent = item.note;
      if (codeEl) {
        codeEl.setAttribute("data-lang", payload.lang);
        codeEl.innerHTML = highlightCode(payload.code, payload.lang);
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-wb-tab");
        renderSnippet(key);
      });
    });

    if (versionSelect) {
      versionSelect.addEventListener("change", function () {
        renderSnippet(currentKey, versionSelect.value);
      });
    }

    renderSnippet("postgres");
  }

  /* Pricing billing period toggle */
  function initPricingToggle() {
    var buttons = document.querySelectorAll("[data-billing-btn]");
    var prices = document.querySelectorAll("[data-price-monthly]");
    if (!buttons.length || !prices.length) return;

    function updatePeriod(period) {
      buttons.forEach(function (btn) {
        var active = btn.getAttribute("data-billing-btn") === period;
        btn.setAttribute("aria-pressed", String(active));
      });
      prices.forEach(function (el) {
        var val = period === "yearly" ? el.getAttribute("data-price-yearly") : el.getAttribute("data-price-monthly");
        var suffix = el.getAttribute("data-price-suffix") || "";
        el.textContent = val;
        var periodEl = el.parentElement.querySelector("[data-price-period]");
        if (periodEl && suffix) {
          periodEl.textContent = period === "yearly" ? suffix + " при оплате за год" : suffix;
        }
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        updatePeriod(btn.getAttribute("data-billing-btn"));
      });
    });
  }

  /* Docs search by headings & keywords + active section tracking */
  function initDocsPage() {
    var searchInput = document.getElementById("docs-search");
    var navLinks = document.querySelectorAll("[data-doc-link]");
    var emptyMsg = document.getElementById("docs-empty");
    if (!searchInput || !navLinks.length) return;

    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase();
      var visibleCount = 0;

      navLinks.forEach(function (link) {
        var targetId = link.getAttribute("href").replace("#", "");
        var section = document.getElementById(targetId);
        var text = (link.textContent + " " + (link.getAttribute("data-keywords") || "")).toLowerCase();
        var sectionHeading = section ? (section.querySelector("h2") ? section.querySelector("h2").textContent.toLowerCase() : "") : "";
        var match = !q || text.indexOf(q) !== -1 || sectionHeading.indexOf(q) !== -1;
        link.parentElement.style.display = match ? "" : "none";
        if (match) visibleCount += 1;
      });

      document.querySelectorAll(".docs-nav-group").forEach(function (group) {
        var hasVisible = Array.prototype.some.call(group.querySelectorAll("li"), function (li) {
          return li.style.display !== "none";
        });
        group.style.display = hasVisible ? "" : "none";
      });

      if (emptyMsg) {
        emptyMsg.style.display = visibleCount === 0 ? "block" : "none";
      }
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.forEach(function (item) {
          item.classList.remove("is-active");
        });
        link.classList.add("is-active");
      });
    });
  }

  /* Blog tag filtering & article expand */
  function initBlogPage() {
    var filterBtns = document.querySelectorAll("[data-blog-filter]");
    var articles = document.querySelectorAll("[data-blog-item]");
    if (filterBtns.length && articles.length) {
      filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var tag = btn.getAttribute("data-blog-filter");
          filterBtns.forEach(function (b) {
            b.setAttribute("aria-pressed", String(b === btn));
          });
          articles.forEach(function (item) {
            var itemTag = item.getAttribute("data-blog-tag");
            var show = tag === "all" || itemTag === tag;
            item.style.display = show ? "" : "none";
          });
        });
      });
    }

    document.querySelectorAll("[data-article-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("aria-controls");
        var body = document.getElementById(targetId);
        if (!body) return;
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        body.hidden = expanded;
        btn.textContent = expanded ? "Читать полностью" : "Свернуть статью";
      });
    });
  }

  /* Auth tabs (login / register / team request) */
  function initAuthTabs() {
    var tabs = document.querySelectorAll("[data-auth-tab]");
    var panels = document.querySelectorAll("[data-auth-panel]");
    if (!tabs.length || !panels.length) return;

    function selectTab(mode) {
      tabs.forEach(function (tab) {
        tab.setAttribute("aria-selected", String(tab.getAttribute("data-auth-tab") === mode));
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-auth-panel") !== mode;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        selectTab(tab.getAttribute("data-auth-tab"));
      });
    });

    var params = new URLSearchParams(window.location.search);
    var mode = params.get("mode");
    var plan = params.get("plan");
    if (mode === "login" || mode === "register") {
      selectTab(mode);
    }
    var planSelect = document.getElementById("reg-plan");
    if (planSelect && (plan === "free" || plan === "team" || plan === "enterprise")) {
      planSelect.value = plan;
      selectTab("register");
    }
  }

  /* Client-side form validation without backend */
  function initForms() {
    var forms = document.querySelectorAll("form[data-validate-form]");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var valid = true;
        var firstInvalid = null;

        var alertBox = form.querySelector("[data-form-alert]");
        if (alertBox) {
          alertBox.hidden = true;
          alertBox.className = "form-alert";
          alertBox.textContent = "";
        }

        var fields = form.querySelectorAll("[data-validate]");
        fields.forEach(function (field) {
          var rules = (field.getAttribute("data-validate") || "").split(" ");
          var errEl = form.querySelector('[data-error-for="' + field.id + '"]');
          var msg = "";
          var val = field.type === "checkbox" ? field.checked : field.value.trim();

          if (rules.indexOf("required") !== -1) {
            if (field.type === "checkbox" && !val) {
              msg = "Подтвердите согласие на обработку данных.";
            } else if (field.type !== "checkbox" && !val) {
              msg = "Заполните это поле.";
            }
          }

          if (!msg && rules.indexOf("email") !== -1 && val) {
            var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!emailRe.test(val)) {
              msg = "Укажите корректный рабочий email.";
            }
          }

          if (!msg && rules.indexOf("min8") !== -1 && val && val.length < 8) {
            msg = "Минимум 8 символов.";
          }

          if (!msg && rules.indexOf("min12") !== -1 && val && val.length < 12) {
            msg = "Опишите задачу подробнее (от 12 символов).";
          }

          if (msg) {
            valid = false;
            field.setAttribute("aria-invalid", "true");
            if (!firstInvalid) firstInvalid = field;
          } else {
            field.removeAttribute("aria-invalid");
          }

          if (errEl) {
            errEl.textContent = msg;
          }
        });

        if (!valid) {
          if (alertBox) {
            alertBox.hidden = false;
            alertBox.className = "form-alert form-alert--error";
            alertBox.textContent = "Проверьте выделенные поля и исправьте ошибки.";
          }
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        if (alertBox) {
          alertBox.hidden = false;
          alertBox.className = "form-alert form-alert--ok";
          alertBox.textContent = form.getAttribute("data-success-message") || "Данные проверены. В демо-режиме отправка на сервер отключена.";
        }
        form.reset();
      });

      form.addEventListener("input", function (e) {
        var target = e.target;
        if (!target.hasAttribute("data-validate")) return;
        target.removeAttribute("aria-invalid");
        var errEl = form.querySelector('[data-error-for="' + target.id + '"]');
        if (errEl) errEl.textContent = "";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initMobileMenu();
    initSyntaxHighlighting();
    initCopyButtons();
    initHeroWorkbench();
    initPricingToggle();
    initDocsPage();
    initBlogPage();
    initAuthTabs();
    initForms();
  });
})();
