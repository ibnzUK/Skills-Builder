import express from "express";
import * as fs from "fs";
import * as path from "path";

const app = express();
const PORT = 3456;

function getSkillsDir(): string {
  return path.join(
    process.env.HOME || process.env.USERPROFILE || process.cwd(),
    ".claude",
    "skills"
  );
}

function listSkills(): { name: string }[] {
  const dir = getSkillsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name }))
    .filter((s) => fs.existsSync(path.join(dir, s.name, "SKILL.md")))
    .sort((a, b) => a.name.localeCompare(b.name));
}

app.get("/api/skills", (_req, res) => {
  res.json(listSkills());
});

app.get("/api/skills/:name", (req, res) => {
  const name = req.params.name.replace(/[^a-z0-9-]/g, "");
  const filePath = path.join(getSkillsDir(), name, "SKILL.md");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.type("text/plain").send(fs.readFileSync(filePath, "utf-8"));
});

app.get("/", (_req, res) => {
  res.send(HTML);
});

app.listen(PORT, () => {
  console.log(`\n  Skills Builder UI → http://localhost:${PORT}\n`);
  // Auto-open browser on Mac/Windows
  const { execSync } = require("child_process");
  try {
    if (process.platform === "darwin") execSync(`open http://localhost:${PORT}`);
    else if (process.platform === "win32") execSync(`start http://localhost:${PORT}`);
  } catch {}
});

const HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Skills Builder</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --sidebar-bg: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --active-bg: #1f3a5f;
      --active-border: #58a6ff;
      --hover-bg: #1c2128;
      --code-bg: #161b22;
    }

    html, body { height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }

    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px;
      min-width: 200px;
      max-width: 320px;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-header h1 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .skill-count {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .skill-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .skill-list::-webkit-scrollbar { width: 6px; }
    .skill-list::-webkit-scrollbar-track { background: transparent; }
    .skill-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .skill-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text);
      border-left: 2px solid transparent;
      transition: background 0.1s, border-color 0.1s;
      user-select: none;
    }

    .skill-item:hover { background: var(--hover-bg); }

    .skill-item.active {
      background: var(--active-bg);
      border-left-color: var(--active-border);
      color: var(--accent);
    }

    .skill-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    /* ── Main panel ── */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .main-header {
      padding: 14px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 53px;
    }

    .main-header h2 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    .badge {
      font-size: 11px;
      padding: 2px 8px;
      background: var(--active-bg);
      color: var(--accent);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 32px 40px;
    }

    .content::-webkit-scrollbar { width: 6px; }
    .content::-webkit-scrollbar-track { background: transparent; }
    .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* Placeholder */
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: var(--text-muted);
    }

    .placeholder-icon { font-size: 48px; opacity: 0.4; }
    .placeholder h3 { font-size: 16px; font-weight: 500; }
    .placeholder p { font-size: 13px; }

    /* Markdown styles */
    .markdown { max-width: 760px; line-height: 1.7; font-size: 14px; }
    .markdown h1 { font-size: 22px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .markdown h2 { font-size: 17px; font-weight: 600; margin: 28px 0 10px; }
    .markdown h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: var(--text-muted); }
    .markdown p { margin-bottom: 12px; }
    .markdown ul, .markdown ol { padding-left: 20px; margin-bottom: 12px; }
    .markdown li { margin-bottom: 4px; }
    .markdown code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 12px; background: var(--code-bg); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); }
    .markdown pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin-bottom: 16px; }
    .markdown pre code { background: none; border: none; padding: 0; font-size: 12px; }
    .markdown blockquote { border-left: 3px solid var(--accent); padding-left: 16px; color: var(--text-muted); margin: 0 0 12px; }
    .markdown strong { color: var(--text); }
    .markdown a { color: var(--accent); text-decoration: none; }
    .markdown a:hover { text-decoration: underline; }
    .markdown hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }

    /* Frontmatter block */
    .frontmatter {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.8;
      color: var(--text-muted);
    }

    .frontmatter .key { color: var(--accent); }
    .frontmatter .value { color: var(--text); }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Skills</h1>
        <div class="skill-count" id="skill-count">Loading…</div>
      </div>
      <div class="skill-list" id="skill-list"></div>
    </aside>

    <main class="main">
      <div class="main-header" id="main-header">
        <span style="color: var(--text-muted); font-size: 13px;">No skill selected</span>
      </div>
      <div class="content" id="content">
        <div class="placeholder">
          <div class="placeholder-icon">📂</div>
          <h3>Please select a skill</h3>
          <p>Choose a skill from the sidebar to view its contents</p>
        </div>
      </div>
    </main>
  </div>

  <script>
    let selected = null;

    async function loadSkills() {
      const res = await fetch('/api/skills');
      const skills = await res.json();

      const countEl = document.getElementById('skill-count');
      const listEl = document.getElementById('skill-list');

      countEl.textContent = skills.length === 1 ? '1 skill' : skills.length + ' skills';

      if (skills.length === 0) {
        listEl.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text-muted)">No skills found in ~/.claude/skills/</div>';
        return;
      }

      listEl.innerHTML = skills.map(s =>
        '<div class="skill-item" data-name="' + s.name + '" onclick="selectSkill(this)">' +
        '<span class="skill-icon">⚡</span>' + s.name + '</div>'
      ).join('');
    }

    async function selectSkill(el) {
      if (selected === el.dataset.name) return;
      selected = el.dataset.name;

      document.querySelectorAll('.skill-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');

      const header = document.getElementById('main-header');
      header.innerHTML = '<h2>' + selected + '</h2><span class="badge">SKILL.md</span>';

      const content = document.getElementById('content');
      content.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px;">Loading…</div>';

      const res = await fetch('/api/skills/' + selected);
      if (!res.ok) {
        content.innerHTML = '<div style="padding:20px;color:#f85149">Failed to load skill.</div>';
        return;
      }

      const raw = await res.text();
      renderSkill(raw, content);
    }

    function renderSkill(raw, container) {
      // Strip and render frontmatter separately
      let body = raw;
      let frontmatterHtml = '';

      const fm = raw.match(/^---\\n([\\s\\S]*?)\\n---/);
      if (fm) {
        body = raw.slice(fm[0].length).trimStart();
        const lines = fm[1].split('\\n').map(line => {
          const colonIdx = line.indexOf(':');
          if (colonIdx === -1) return '<span class="value">' + esc(line) + '</span>';
          const key = line.slice(0, colonIdx);
          const val = line.slice(colonIdx + 1);
          return '<span class="key">' + esc(key) + '</span><span style="color:var(--border)">:</span><span class="value">' + esc(val) + '</span>';
        });
        frontmatterHtml = '<div class="frontmatter">' + lines.join('<br>') + '</div>';
      }

      container.innerHTML =
        '<div class="markdown">' +
        frontmatterHtml +
        marked.parse(body) +
        '</div>';
    }

    function esc(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadSkills();
  </script>
</body>
</html>`;
