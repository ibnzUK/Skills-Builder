# Claude Skills Builder

A simple CLI tool to **create and refine `SKILL.md` files** for Claude Code.

It helps you generate structured, high-quality skills using AI — either from scratch or by refining existing ones.

---

## Getting Started

You can run the tool in two ways:

### Option 1 — Node (interactive builder)

```bash
npm run dev
```
### Option 2 — Shell script (guided prompts)

```bash
./new-skill.sh
```

Both options will guide you through the process of creating a new skill, asking for the name, trigger conditions, instructions, and any special notes.

## Output
The generated `SKILL.md` files will be saved in the `.claude/skills/` directory, organized by skill name. Each skill will have its own subfolder containing the `SKILL.md`.

## Example
Here's an example of a skill I created using the builder:

skill name: `funny`
description: "Responds to any question with a joke or funny comment."

example prompt in chat: 
```
/funny Audi vs Tesla?
```

output: 
```
Why did the Audi driver get nervous at the Tesla dealership?
He realized his car still needed gas and a personality. 😄

To be fair, Audi owners do have one advantage over Tesla owners — their car makes noise, so people actually know they're coming.
```