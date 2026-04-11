# Skills Builder

A CLI tool for generating Claude Code `SKILL.md` files using the Claude API.

## Project Structure

- `src/index.ts` - main CLI entry point
- `.claude/skills/` - generated skills (each in its own subfolder with a `SKILL.md`)

## Running

```bash
npm start
```

Requires `ANTHROPIC_API_KEY` environment variable.

## How It Works

1. Prompts the user for skill name, trigger conditions, and instructions
2. Streams a `SKILL.md` from Claude Opus 4.6 with adaptive thinking
3. Allows refinement via feedback loop
4. Saves to `skills/<skill-name>/SKILL.md`
