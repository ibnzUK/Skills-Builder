import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function print(text: string) {
  process.stdout.write(text);
}

function println(text = "") {
  console.log(text);
}

function printDivider() {
  println("─".repeat(60));
}

async function streamSkill(prompt: string): Promise<string> {
  print("\n✦ Generating skill");

  const stream = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    stream: true,
    system: `You are an expert at writing Claude Code skill files (SKILL.md).

A SKILL.md file is a markdown document that tells Claude Code how to perform a specific task.

## Frontmatter fields (YAML between --- markers)

All fields are optional except description is strongly recommended.

- name: skill name (lowercase, hyphens only, max 64 chars) — becomes the /slash-command
- description: what the skill does and when to use it. Claude uses this to decide when to load it automatically. Front-load the key use case. Max 250 chars visible. Include natural trigger keywords.
- disable-model-invocation: true — set this for skills the user explicitly invokes with /name (deploy, commit, etc). Prevents Claude from auto-triggering it.
- user-invocable: false — for background knowledge skills Claude loads automatically but users shouldn't invoke directly
- allowed-tools: space-separated list of tools pre-approved for this skill (e.g. "Bash(git *) Read")
- argument-hint: shown in autocomplete, e.g. "[issue-number]" or "[filename] [format]"
- effort: low | medium | high | max — overrides session effort level
- context: fork — run skill in an isolated subagent context
- agent: which subagent type to use when context: fork is set (Explore, Plan, general-purpose, or custom)

## String substitutions in content

- $ARGUMENTS — all arguments passed when invoking the skill
- $ARGUMENTS[N] or $N — specific argument by 0-based index
- \${CLAUDE_SESSION_ID} — current session ID
- \${CLAUDE_SKILL_DIR} — directory containing SKILL.md
- !` + '`' + `command` + '`' + ` — shell command executed before skill runs; output replaces placeholder

## Rules

- NEVER use when_to_use — it is not a valid field
- description keywords are what Claude matches on — make them natural
- Keep SKILL.md under 500 lines; move detailed reference to supporting files
- Instructions should be imperative and concrete
- Skills do ONE thing well

Output ONLY the raw SKILL.md content — no explanation, no wrapper text.`,
    messages: [{ role: "user", content: prompt }],
  });

  let output = "";
  let thinkingDone = false;

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      if (event.content_block.type === "thinking" && !thinkingDone) {
        print(".");
      }
      if (event.content_block.type === "text" && !thinkingDone) {
        thinkingDone = true;
        println("\n");
      }
    }
    if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta") {
        print(".");
      }
      if (event.delta.type === "text_delta") {
        output += event.delta.text;
        print(event.delta.text);
      }
    }
  }

  println();
  return output;
}

async function refineSkill(
  current: string,
  feedback: string
): Promise<string> {
  print("\n✦ Refining skill");

  const stream = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    stream: true,
    system: `You are an expert at writing Claude Code skill files (SKILL.md).
Revise the provided SKILL.md based on user feedback.
Output ONLY the revised SKILL.md content — no explanation, no wrapper text.`,
    messages: [
      {
        role: "user",
        content: `Current SKILL.md:\n\n${current}\n\nFeedback to apply:\n${feedback}`,
      },
    ],
  });

  let output = "";
  let thinkingDone = false;

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      if (event.content_block.type === "thinking" && !thinkingDone) {
        print(".");
      }
      if (event.content_block.type === "text" && !thinkingDone) {
        thinkingDone = true;
        println("\n");
      }
    }
    if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta") {
        print(".");
      }
      if (event.delta.type === "text_delta") {
        output += event.delta.text;
        print(event.delta.text);
      }
    }
  }

  println();
  return output;
}

function saveSkill(content: string, skillName: string): string {
  const sanitized = skillName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const dir = path.join(
    process.env.HOME || process.env.USERPROFILE || process.cwd(),
    ".claude",
    "skills",
    sanitized
  );
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, "SKILL.md");
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function listExistingSkills(): { name: string; path: string }[] {
  const skillsDir = path.join(
    process.env.HOME || process.env.USERPROFILE || process.cwd(),
    ".claude",
    "skills"
  );
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({
      name: d.name,
      path: path.join(skillsDir, d.name, "SKILL.md"),
    }))
    .filter((s) => fs.existsSync(s.path));
}

async function main() {
  println();
  println("╔══════════════════════════════════════════════════════════╗");
  println("║           Claude Skills Builder                          ║");
  println("║           Build SKILL.md files for Claude Code           ║");
  println("╚══════════════════════════════════════════════════════════╝");
  println();

  // --- First question: new or existing ---
  printDivider();
  const mode = await ask(
    "What would you like to do?\n  [n] Create a new skill\n  [e] Edit an existing skill\n> "
  );

  if (mode === "e") {
    const existing = listExistingSkills();
    if (existing.length === 0) {
      println("\nNo existing skills found. Starting a new skill instead.");
    } else {
      println();
      println("Existing skills:");
      existing.forEach((s, i) => println(`  [${i + 1}] ${s.name}`));
      println();
      const choice = await ask("Enter number to select: ");
      const idx = parseInt(choice, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= existing.length) {
        println("Invalid selection. Exiting.");
        rl.close();
        process.exit(1);
      }
      const selected = existing[idx];
      const skillName = selected.name;
      let skillContent = fs.readFileSync(selected.path, "utf-8");

      println();
      println(`Loaded: ${selected.path}`);

      while (true) {
        println();
        printDivider();
        const action = await ask(
          "What would you like to do?\n  [s] Save skill\n  [r] Refine with feedback\n  [p] Preview\n  [q] Quit without saving\n> "
        );

        if (action === "s") {
          const filePath = saveSkill(skillContent, skillName);
          println();
          println(`✓ Skill saved to: ${filePath}`);
          println();
          break;
        } else if (action === "r") {
          const feedback = await ask("What should be changed?\n> ");
          skillContent = await refineSkill(skillContent, feedback);
        } else if (action === "p") {
          println();
          printDivider();
          println("Preview:");
          printDivider();
          println(skillContent);
        } else if (action === "q") {
          println("Exiting without saving.");
          break;
        } else {
          println("Invalid option. Choose s, r, p, or q.");
        }
      }

      rl.close();
      return;
    }
  } else if (mode !== "n") {
    println("Invalid option. Exiting.");
    rl.close();
    process.exit(1);
  }

  // --- Gather info ---
  printDivider();
  println("Step 1: Describe your skill");
  printDivider();
  println();

  const skillName = await ask("Skill name (e.g. 'commit', 'review-pr'): ");
  if (!skillName) {
    println("Skill name is required.");
    rl.close();
    process.exit(1);
  }

  println();
  const trigger = await ask(
    "When should this skill trigger?\n(e.g. 'when user asks to commit changes', 'when user says /review-pr')\n> "
  );

  println();
  const purpose = await ask(
    "What should this skill do? Describe the steps Claude should take:\n> "
  );

  println();
  const extras = await ask(
    "Any special instructions, gotchas, or examples? (press Enter to skip)\n> "
  );

  const hasSubcommands = await ask(
    "\nDoes this skill have subcommands? (y/n): "
  );

  let subcommandDetails = "";
  if (hasSubcommands.toLowerCase() === "y") {
    subcommandDetails = await ask(
      "List the subcommands and what each does (e.g. 'init: sets up X, run: executes Y'):\n> "
    );
  }

  // --- Build generation prompt ---
  const generationPrompt = [
    `Create a SKILL.md for a Claude Code skill called "${skillName}".`,
    ``,
    `Trigger condition: ${trigger}`,
    ``,
    `Purpose / what Claude should do: ${purpose}`,
    extras ? `\nAdditional instructions / examples:\n${extras}` : "",
    subcommandDetails
      ? `\nSubcommands:\n${subcommandDetails}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // --- Generate ---
  printDivider();
  println("Step 2: Generating SKILL.md");
  printDivider();

  let skillContent = await streamSkill(generationPrompt);

  // --- Refine loop ---
  while (true) {
    println();
    printDivider();
    const action = await ask(
      "What would you like to do?\n  [s] Save skill\n  [r] Refine with feedback\n  [p] Preview again\n  [q] Quit without saving\n> "
    );

    if (action === "s") {
      const filePath = saveSkill(skillContent, skillName);
      println();
      println(`✓ Skill saved to: ${filePath}`);
      println();
      break;
    } else if (action === "r") {
      const feedback = await ask("What should be changed?\n> ");
      skillContent = await refineSkill(skillContent, feedback);
    } else if (action === "p") {
      println();
      printDivider();
      println("Preview:");
      printDivider();
      println(skillContent);
    } else if (action === "q") {
      println("Exiting without saving.");
      break;
    } else {
      println("Invalid option. Choose s, r, p, or q.");
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
