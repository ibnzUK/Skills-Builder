#!/usr/bin/env bash
set -euo pipefail

SKILLS_DIR="$HOME/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_SKILLS_DIR="$SCRIPT_DIR/.claude/skills"

divider() { printf '%0.s─' {1..60}; echo; }
println() { echo "${1:-}"; }

ask() {
  local prompt="$1"
  printf "%s\n> " "$prompt" >&2
  # Read with escape detection: if user presses Escape, exit
  IFS= read -r answer </dev/tty
  if [[ "$answer" == *$'\033'* ]]; then
    printf "\nExiting.\n" >&2
    exit 0
  fi
  echo "$answer"
}

generate_skill() {
  local prompt="$1"
  printf "\n✦ Generating skill...\n" >&2
  claude -p "$prompt" \
    --model opus \
    --system-prompt 'You are an expert at writing Claude Code skill files (SKILL.md).

A SKILL.md file is a markdown document that tells Claude Code how to perform a specific task.

## Frontmatter fields (YAML between --- markers)

- name: skill name (lowercase, hyphens only, max 64 chars)
- description: what the skill does and when to use it. Front-load the key use case. Max 250 chars. Include natural trigger keywords.
- disable-model-invocation: true — set for user-invoked /slash-command skills
- user-invocable: false — for background knowledge skills Claude auto-loads
- allowed-tools: space-separated pre-approved tools (e.g. "Bash(git *) Read")
- argument-hint: shown in autocomplete, e.g. "[issue-number]"
- effort: low | medium | high | max
- context: fork — run in isolated subagent
- agent: subagent type when context: fork is set

## String substitutions
- $ARGUMENTS — all arguments passed at invocation
- $ARGUMENTS[N] — specific argument by index

## Rules
- NEVER use when_to_use — not a valid field
- Skills do ONE thing well
- Instructions are imperative and concrete
- Keep under 500 lines

Output ONLY the raw SKILL.md content — no explanation, no wrapper text.'
}

save_skill() {
  local content="$1"
  local name="$2"
  local sanitized
  sanitized=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

  # Save to ~/.claude/skills (Claude Code global)
  local dir="$SKILLS_DIR/$sanitized"
  mkdir -p "$dir"
  printf '%s\n' "$content" > "$dir/SKILL.md"

  # Mirror to project .claude/skills for git tracking
  local project_dir="$PROJECT_SKILLS_DIR/$sanitized"
  mkdir -p "$project_dir"
  printf '%s\n' "$content" > "$project_dir/SKILL.md"

  echo "$dir"
}

# ── Main ──────────────────────────────────────────────────────────────

println ""
println "╔══════════════════════════════════════════════════════════╗"
println "║           New Skill Builder                              ║"
println "║           Create a SKILL.md for Claude Code             ║"
println "╚══════════════════════════════════════════════════════════╝"
println ""
divider
println ""

skill_name=$(ask "1. Skill name (e.g. 'researcher', 'life-coach'):")
if [[ -z "$skill_name" ]]; then
  println "Skill name is required."
  exit 1
fi

println ""
before_starting=$(ask "2. Before Starting — what context or setup does Claude need before running this skill?
(e.g. 'You have access to the web browser tool and can search internet', 'You can browse this machine's filesystem and run commands')")

println ""
how_it_works=$(ask "3. How This Skill Works — describe the steps Claude should take:")

println ""
proactive_triggers=$(ask "4. Proactive Triggers — when should Claude auto-trigger this without being explicitly asked?
(press Enter to skip)")

println ""
output_artifacts=$(ask "5. Output Artifacts — what does this skill produce?
(e.g. 'a commit', 'a SKILL.md file', 'a summary in chat')")

println ""
output_format=$(ask "6. Output Format — how should the output be structured or presented?
(e.g. 'markdown table', 'bullet list', 'raw file saved to disk')")

println ""
related_skills=$(ask "7. Related Skills — any existing skills this works alongside or depends on?
(press Enter to skip)")

println ""
related_scripts=$(ask "8. Related Scripts — any scripts or tools this skill calls or references?
(press Enter to skip)")

# Build generation prompt
generation_prompt="Create a SKILL.md for a Claude Code skill called \"${skill_name}\".

Before Starting: ${before_starting}

How This Skill Works: ${how_it_works}"

[[ -n "$proactive_triggers" ]] && generation_prompt+="

Proactive Triggers: ${proactive_triggers}"

generation_prompt+="

Output Artifacts: ${output_artifacts}

Output Format: ${output_format}"

[[ -n "$related_skills" ]] && generation_prompt+="

Related Skills: ${related_skills}"

[[ -n "$related_scripts" ]] && generation_prompt+="

Related Scripts: ${related_scripts}"

# Generate
println ""
divider
println "Generating SKILL.md"
divider

skill_content=$(generate_skill "$generation_prompt") || { println "Error: claude command failed."; exit 1; }
if [[ -z "$skill_content" ]]; then
  println "Error: claude returned empty output."
  exit 1
fi
println ""
println "$skill_content"

# Confirm and create
println ""
divider
confirm=$(ask "Create new skill? (y/n)")

if [[ "$confirm" =~ ^[Yy]$ ]]; then
  sanitized=$(echo "$skill_name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
  skill_dir=$(save_skill "$skill_content" "$skill_name")
  println ""
  println "✓ Saved to: $skill_dir/SKILL.md"
  println "✓ Mirrored to: $PROJECT_SKILLS_DIR/$sanitized/SKILL.md"
  println ""
  println "To commit to git:"
  println "  git add .claude/skills/$sanitized/"
  println "  git commit -m \"Add $sanitized skill\""
  println ""
else
  println "Cancelled."
fi
