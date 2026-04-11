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
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          #111110;
      --surface:     #1a1917;
      --surface2:    #201f1d;
      --border:      #2e2c29;
      --border-soft: #242220;
      --text:        #eeebe6;
      --text-muted:  #6b6760;
      --text-dim:    #9b9690;
      --accent:      #cc785c;
      --accent-dim:  rgba(204,120,92,0.12);
      --accent-glow: rgba(204,120,92,0.25);
      --danger:      #c95f5f;
      --ok:          #7aab78;
      --editor-bg:   #0e0d0c;
    }

    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 13px;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── App shell ─────────────────────────────────────────── */
    .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    /* ─── Titlebar ──────────────────────────────────────────── */
    .titlebar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      height: 44px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      user-select: none;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .titlebar-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-dim);
      letter-spacing: 0.01em;
    }

    .titlebar-title span {
      color: var(--text);
      font-weight: 600;
    }

    .titlebar-sep {
      color: var(--border);
      margin: 0 2px;
    }

    /* ─── Body layout ───────────────────────────────────────── */
    .body { display: flex; flex: 1; overflow: hidden; }

    /* ─── Sidebar ───────────────────────────────────────────── */
    .sidebar {
      width: 228px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-section-label {
      padding: 14px 14px 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .skill-list {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 4px;
    }

    .skill-list::-webkit-scrollbar { width: 4px; }
    .skill-list::-webkit-scrollbar-track { background: transparent; }
    .skill-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    .skill-item {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 6px 14px;
      cursor: pointer;
      border-left: 2px solid transparent;
      transition: background 0.1s, border-color 0.1s;
      user-select: none;
    }

    .skill-item:hover { background: var(--surface2); }

    .skill-item.active {
      background: var(--accent-dim);
      border-left-color: var(--accent);
    }

    .skill-slash {
      color: var(--accent);
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      margin-right: 1px;
      opacity: 0.7;
    }

    .skill-item.active .skill-slash { opacity: 1; }

    .skill-name {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--text-dim);
    }

    .skill-item.active .skill-name { color: var(--text); }

    .sidebar-footer {
      border-top: 1px solid var(--border-soft);
      padding: 10px;
      flex-shrink: 0;
    }

    .btn-add {
      width: 100%;
      padding: 7px 10px;
      background: transparent;
      border: 1px dashed var(--border);
      border-radius: 5px;
      color: var(--text-muted);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s;
    }

    .btn-add:hover {
      border-color: var(--accent);
      border-style: solid;
      color: var(--accent);
      background: var(--accent-dim);
    }

    .btn-add-icon {
      font-size: 15px;
      line-height: 1;
      font-weight: 300;
    }

    /* ─── Main panel ────────────────────────────────────────── */
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .main-header {
      padding: 0 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      flex-shrink: 0;
      background: var(--surface);
    }

    .header-crumb {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .crumb-skill {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .crumb-skill strong { color: var(--text); font-weight: 500; }

    .crumb-sep { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }

    .crumb-file {
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 11px;
      color: var(--text-muted);
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 1px 7px;
      flex-shrink: 0;
    }

    .save-status {
      font-size: 11px;
      color: var(--text-muted);
      flex-shrink: 0;
      min-width: 56px;
      text-align: right;
    }

    .save-status.ok  { color: var(--ok); }
    .save-status.err { color: var(--danger); }

    .btn-save {
      padding: 5px 14px;
      background: var(--accent);
      border: none;
      border-radius: 5px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      flex-shrink: 0;
      transition: opacity 0.15s;
      letter-spacing: 0.01em;
    }

    .btn-save:hover   { opacity: 0.88; }
    .btn-save:active  { opacity: 0.75; }
    .btn-save:disabled { opacity: 0.35; cursor: default; }

    /* ─── Content area ──────────────────────────────────────── */
    .content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: var(--editor-bg);
    }

    .editor {
      flex: 1;
      width: 100%;
      background: transparent;
      color: var(--text);
      border: none;
      outline: none;
      resize: none;
      font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
      font-size: 13px;
      line-height: 1.75;
      padding: 28px 40px;
      tab-size: 2;
      caret-color: var(--accent);
    }

    .editor::selection { background: var(--accent-glow); }

    .editor::-webkit-scrollbar { width: 5px; }
    .editor::-webkit-scrollbar-track { background: transparent; }
    .editor::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .loading-msg {
      padding: 20px 40px;
      font-size: 12px;
      color: var(--text-muted);
      font-family: monospace;
    }

    /* ─── Placeholder ───────────────────────────────────────── */
    .placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--text-muted);
    }

    .placeholder-logo { margin-bottom: 4px; opacity: 0.2; }

    .placeholder h3 { font-size: 15px; font-weight: 500; color: var(--text-dim); }

    .placeholder p { font-size: 12px; }

    /* ─── Modal ─────────────────────────────────────────────── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      backdrop-filter: blur(2px);
    }

    .modal-overlay.hidden { display: none; }

    .modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 22px 22px 18px;
      width: 340px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-title h3 { font-size: 14px; font-weight: 600; }

    .modal p { font-size: 11px; color: var(--text-muted); margin-top: -6px; }

    .modal input {
      width: 100%;
      padding: 8px 10px;
      background: var(--editor-bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      color: var(--text);
      font-size: 13px;
      font-family: "SF Mono", Menlo, Consolas, monospace;
      outline: none;
      transition: border-color 0.15s;
      caret-color: var(--accent);
    }

    .modal input:focus { border-color: var(--accent); }

    .modal-error { font-size: 11px; color: var(--danger); min-height: 14px; margin-top: -6px; }

    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

    .btn-cancel {
      padding: 6px 14px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 5px;
      color: var(--text-dim);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.12s;
    }

    .btn-cancel:hover { background: var(--surface2); }

    .btn-create {
      padding: 6px 14px;
      background: var(--accent);
      border: none;
      border-radius: 5px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .btn-create:hover { opacity: 0.88; }
  </style>
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
        <div class="sidebar-section-label">Skills <span id="skill-count" style="font-weight:400;opacity:0.6"></span></div>
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
          <span style="color:var(--text-muted);font-size:12px;font-family:'SF Mono',Menlo,Consolas,monospace;">select a skill to edit</span>
        </div>
        <div class="content" id="content">
          <div class="placeholder">
            <div class="placeholder-logo">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28 28-12.536 28-28S47.464 4 32 4z" fill="#cc785c" opacity="0.2"/>
                <path d="M21 22c0-6.075 4.925-11 11-11s11 4.925 11 11v4h-4v-4a7 7 0 10-14 0v4h-4v-4z" fill="#cc785c" opacity="0.6"/>
                <rect x="17" y="26" width="30" height="21" rx="4" fill="#cc785c" opacity="0.6"/>
                <circle cx="32" cy="36" r="3" fill="#111110"/>
              </svg>
            </div>
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
        listEl.innerHTML = '<div style="padding:12px 14px;font-size:11px;color:var(--text-muted)">No skills in ~/.claude/skills/</div>';
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
        content.innerHTML = '<div style="padding:20px 40px;color:var(--danger)">Failed to load skill.</div>';
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
