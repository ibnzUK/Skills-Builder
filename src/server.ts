import express from "express";
import * as fs from "fs";
import * as path from "path";

const app = express();
const PORT = 3456;

app.use(express.text({ type: "text/plain" }));
app.use(express.json());

function getSkillsDir(): string {
  return path.join(
    process.env.HOME || process.env.USERPROFILE || process.cwd(),
    ".claude",
    "skills"
  );
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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
  const name = sanitizeName(req.params.name);
  const filePath = path.join(getSkillsDir(), name, "SKILL.md");
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.type("text/plain").send(fs.readFileSync(filePath, "utf-8"));
});

app.put("/api/skills/:name", (req, res) => {
  const name = sanitizeName(req.params.name);
  const dir = path.join(getSkillsDir(), name);
  const filePath = path.join(dir, "SKILL.md");
  if (!fs.existsSync(dir)) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }
  fs.writeFileSync(filePath, req.body as string, "utf-8");
  res.json({ ok: true });
});

app.post("/api/skills", (req, res) => {
  const raw: string = req.body?.name ?? "";
  const name = sanitizeName(raw);
  if (!name) {
    res.status(400).json({ error: "Invalid name" });
    return;
  }
  const dir = path.join(getSkillsDir(), name);
  const filePath = path.join(dir, "SKILL.md");
  if (fs.existsSync(filePath)) {
    res.status(409).json({ error: "Already exists" });
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  const template = `---\nname: ${name}\ndescription: \n---\n\n# ${name}\n\n`;
  fs.writeFileSync(filePath, template, "utf-8");
  res.json({ name });
});

app.get("/styles.css", (_req, res) => {
  res.type("text/css").send(
    fs.readFileSync(path.join(process.cwd(), "src", "server.module.css"), "utf-8")
  );
});

app.get("/", (_req, res) => {
  res.send(HTML);
});

app.listen(PORT, () => {
  console.log(`\n  Skills Builder UI → http://localhost:${PORT}\n`);
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
  <title>Claude · Skills Builder</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div class="app">

    <!-- Titlebar -->
    <div class="titlebar">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28 28-12.536 28-28S47.464 4 32 4z" fill="#cc785c" opacity="0.15"/>
          <path d="M21 22c0-6.075 4.925-11 11-11s11 4.925 11 11v4h-4v-4a7 7 0 10-14 0v4h-4v-4z" fill="#cc785c"/>
          <rect x="17" y="26" width="30" height="21" rx="4" fill="#cc785c"/>
          <circle cx="32" cy="36" r="3" fill="#111110"/>
        </svg>
      </div>
      <span class="titlebar-title">Claude <span class="titlebar-sep">·</span> <span>Skills Builder</span></span>
    </div>

    <div class="body">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-section-label">Skills <span id="skill-count" class="skill-count-badge"></span></div>
        <div class="skill-list" id="skill-list"></div>
        <div class="sidebar-footer">
          <button class="btn-add" onclick="openModal()">
            <span class="btn-add-icon">+</span> New skill
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="main">
        <div class="main-header" id="main-header">
          <span class="header-idle">select a skill to edit</span>
        </div>
        <div class="content" id="content">
          <div class="placeholder">
            <!-- Pixel-art Claude Code robot (matches the Claude Code welcome screen) -->
            <!-- Each rect is one "pixel" block. p=10px. Grid: 14 wide x 15 tall -->
            <svg class="pixel-robot" width="140" height="150" viewBox="0 0 140 150" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
              <!-- HEAD: cols 2-11 (10 wide), rows 0-2 (3 tall) -->
              <rect x="20" y="0"   width="100" height="10" fill="#d4736a"/>
              <rect x="20" y="10"  width="100" height="10" fill="#d4736a"/>
              <rect x="20" y="20"  width="100" height="10" fill="#d4736a"/>

              <!-- SHOULDERS: cols 0-13 (14 wide), row 3 -->
              <rect x="0"  y="30"  width="140" height="10" fill="#d4736a"/>

              <!-- BODY STRIPES: 4 bars, each 20px wide, 20px gaps (4×20 + 3×20 = 140) -->
              <rect x="0"   y="40" width="20" height="60" fill="#d4736a"/>
              <rect x="40"  y="40" width="20" height="60" fill="#d4736a"/>
              <rect x="80"  y="40" width="20" height="60" fill="#d4736a"/>
              <rect x="120" y="40" width="20" height="60" fill="#d4736a"/>

              <!-- BASE: cols 0-13, row 10 -->
              <rect x="0"  y="100" width="140" height="10" fill="#d4736a"/>

              <!-- LEFT FOOT: under bar 1 -->
              <rect x="0"   y="110" width="20" height="40" fill="#d4736a"/>

              <!-- RIGHT FOOT: under bar 4 -->
              <rect x="120" y="110" width="20" height="40" fill="#d4736a"/>
            </svg>

            <h3>Please select a skill</h3>
            <p>Choose a skill from the sidebar to view and edit it</p>
          </div>
        </div>
      </main>

    </div>
  </div>

  <!-- New skill modal -->
  <div class="modal-overlay hidden" id="modal-overlay" onclick="handleOverlayClick(event)">
    <div class="modal">
      <div class="modal-title">
        <svg width="14" height="14" viewBox="0 0 64 64" fill="none"><path d="M21 22c0-6.075 4.925-11 11-11s11 4.925 11 11v4h-4v-4a7 7 0 10-14 0v4h-4v-4z" fill="#cc785c"/><rect x="17" y="26" width="30" height="21" rx="4" fill="#cc785c"/><circle cx="32" cy="36" r="3" fill="#111110"/></svg>
        <h3>New skill</h3>
      </div>
      <p>Lowercase letters, numbers, and hyphens only.</p>
      <input
        id="modal-input"
        type="text"
        placeholder="e.g. review-pr"
        onkeydown="handleModalKey(event)"
        oninput="clearModalError()"
        autocomplete="off"
        spellcheck="false"
      />
      <div class="modal-error" id="modal-error"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="btn-create" onclick="createSkill()">Create</button>
      </div>
    </div>
  </div>

  <script>
    let selected = null;
    let saveTimer = null;

    // ── Skills list ─────────────────────────────────────────

    async function loadSkills(selectName) {
      const res = await fetch('/api/skills');
      const skills = await res.json();

      const countEl = document.getElementById('skill-count');
      const listEl = document.getElementById('skill-list');

      countEl.textContent = '(' + skills.length + ')';

      if (skills.length === 0) {
        listEl.innerHTML = '<div class="empty-skills">No skills in ~/.claude/skills/</div>';
        return;
      }

      listEl.innerHTML = skills.map(s =>
        '<div class="skill-item" id="item-' + s.name + '" data-name="' + s.name + '" onclick="selectSkill(this)">' +
        '<span class="skill-slash">/</span>' +
        '<span class="skill-name">' + esc(s.name) + '</span>' +
        '</div>'
      ).join('');

      if (selectName) {
        const el = document.getElementById('item-' + selectName);
        if (el) selectSkill(el);
      }
    }

    // ── Select & load skill ──────────────────────────────────

    async function selectSkill(el) {
      if (selected === el.dataset.name) return;
      selected = el.dataset.name;

      document.querySelectorAll('.skill-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');

      setHeader(selected);

      const content = document.getElementById('content');
      content.innerHTML = '<div class="loading-msg">Loading\u2026</div>';

      const res = await fetch('/api/skills/' + selected);
      if (!res.ok) {
        content.innerHTML = '<div class="load-error">Failed to load skill.</div>';
        return;
      }

      const raw = await res.text();
      showEditor(raw);
    }

    // ── Header ───────────────────────────────────────────────

    function setHeader(name) {
      document.getElementById('main-header').innerHTML =
        '<div class="header-crumb">' +
          '<span class="crumb-skill"><strong>/' + esc(name) + '</strong></span>' +
          '<span class="crumb-sep">›</span>' +
          '<span class="crumb-file">SKILL.md</span>' +
        '</div>' +
        '<span class="save-status" id="save-status"></span>' +
        '<button class="btn-save" id="btn-save" onclick="saveSkill()">Save</button>';
    }

    // ── Editor ───────────────────────────────────────────────

    function showEditor(content) {
      const container = document.getElementById('content');
      container.innerHTML =
        '<textarea class="editor" id="editor" spellcheck="false">' +
        esc(content) +
        '</textarea>';

      document.getElementById('editor').addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = this.selectionStart, end = this.selectionEnd;
          this.value = this.value.slice(0, s) + '  ' + this.value.slice(end);
          this.selectionStart = this.selectionEnd = s + 2;
        }
      });
    }

    // ── Save ─────────────────────────────────────────────────

    async function saveSkill() {
      if (!selected) return;
      const editor = document.getElementById('editor');
      const btn = document.getElementById('btn-save');
      const status = document.getElementById('save-status');
      if (!editor) return;

      btn.disabled = true;
      status.textContent = 'Saving…';
      status.className = 'save-status';

      try {
        const res = await fetch('/api/skills/' + selected, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: editor.value
        });

        if (res.ok) {
          status.textContent = 'Saved ✓';
          status.className = 'save-status ok';
        } else {
          status.textContent = 'Error';
          status.className = 'save-status err';
        }
      } catch {
        status.textContent = 'Error';
        status.className = 'save-status err';
      }

      btn.disabled = false;

      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const s = document.getElementById('save-status');
        if (s) { s.textContent = ''; s.className = 'save-status'; }
      }, 3000);
    }

    // ── Modal ────────────────────────────────────────────────

    function openModal() {
      const overlay = document.getElementById('modal-overlay');
      const input = document.getElementById('modal-input');
      overlay.classList.remove('hidden');
      input.value = '';
      clearModalError();
      setTimeout(() => input.focus(), 50);
    }

    function closeModal() {
      document.getElementById('modal-overlay').classList.add('hidden');
    }

    function handleOverlayClick(e) {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    }

    function handleModalKey(e) {
      if (e.key === 'Enter') createSkill();
      if (e.key === 'Escape') closeModal();
    }

    function clearModalError() {
      document.getElementById('modal-error').textContent = '';
    }

    async function createSkill() {
      const input = document.getElementById('modal-input');
      const name = input.value.trim();
      if (!name) {
        document.getElementById('modal-error').textContent = 'Name is required.';
        return;
      }

      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (res.status === 409) {
        document.getElementById('modal-error').textContent = 'A skill with that name already exists.';
        return;
      }

      if (!res.ok) {
        document.getElementById('modal-error').textContent = 'Invalid name — use lowercase letters, numbers, hyphens.';
        return;
      }

      const data = await res.json();
      closeModal();
      selected = null;
      await loadSkills(data.name);
    }

    // ── Util ─────────────────────────────────────────────────

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadSkills(null);
  </script>
</body>
</html>`;
