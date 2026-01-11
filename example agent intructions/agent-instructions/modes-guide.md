# Mode System Governance (Meta)

Purpose: Govern and maintain agent modes while keeping individual mode files light and runtime-only.
This guide is backward-compatible with existing modes and does not require renaming sections or
major rewrites.

Compatibility and Continuation Principles

- Backward compatible: This guide applies to existing mode files as-is. No renames required.
- On-demand loading: Do not preload modes. Select a mode first; only then load its file.
- Separation of concerns: Meta holds selection logic, rationale, and expectations; mode files hold
  runtime instructions only.
- Non-prescriptive tags: Mode files may use XML-like tags (e.g., <Summary>, <Process>,
  <Output-Format>). This guide references logical sections without enforcing exact tag names.
- Optional enhancements: Any improvements suggested here are optional and can be adopted
  incrementally.

Selection and Loading (Pre-runtime)

- Mode selection occurs before loading any mode file.
- Selection guidance lives here (meta) and in the quick decision tree in .agent.md.
- Per-mode files must not contain selection rationale; they describe execution only.

Design Rationale (Summary)

- Divergence is useful when structured (Deep Engineer, Council). The difference in answers can
  surface trade-offs.
- Evidence-first, constrained debate, and verification/rollback protect quality.
- Keep heavy philosophy here; modes stay operational.

Mode Runtime Contracts (Lean, aligned with existing modes) These contracts describe the expected
runtime outputs already supported by current modes. They are intentionally minimal to avoid forcing
rewrites.

- Default
  - Output: brief status + result; cite instruction when relevant
  - Confidence: proceed at HIGH/MED; if LOW → suggest Expert/Pair
  - Checkpoints: none

- Expert
  - Output: phase summaries (UNDERSTAND, PLAN, IMPLEMENT, VERIFY, REFINE)
  - Confidence: increase over phases; aim VERY HIGH by VERIFY
  - Checkpoints: at phase transitions

- Pair
  - Output: conversational narration with explicit checkpoints; present 1–2 options with pros/cons
    and wait for input
  - Confidence: leadership depends on confidence (HIGH leads; MED co-explores; LOW user leads)

- Deep Engineer
  - Output: two heads; concise cross-critique; synthesis to one plan; include verification and
    rollback
  - Confidence: raise to HIGH via synthesis or suggest Council when stakes/ambiguity remain

- Council
  - Output: summarized multi-persona debate; vote/rationale; moderator synthesis with verification
    and rollback
  - Confidence: for persistent LOW after other modes or explicit high-stakes multi-option cases

System Commitments (User-facing)

- Always show: "Mode: <X> | Confidence: <HIGH/MEDIUM/LOW>" in the first substantive reply; repeat at
  iteration 2 and every 3rd thereafter.
- Do not mix modes in a single step; escalate/de-escalate cleanly.
- Default does not proceed at LOW confidence.
- For non-trivial claims, provide evidence (citations when available) and label
  assumptions/unknowns.
- Deep Engineer and Council outputs include a rollback/escape plan.

Confidence Usage (Minimal rules)

- HIGH: proceed in chosen mode.
- MED: proceed but note validation; use Expert/Pair if clarity is needed.
- LOW: avoid Default; prefer Expert or Pair; use Deep Engineer if trade-offs block progress.

Maintenance Rules (For instruction authors)

- Modify a mode file when: clarifying runtime steps or outputs (no selection/rationale).
- Add a new mode when: a new capability is needed that cannot be expressed by existing modes.
- Avoid breaking changes: preserve existing tags/structure; prefer additive clarifications.

Anti-Patterns

- Placing selection or philosophy inside mode files.
- Mixing modes mid-step without an explicit escalation/de-escalation.
- Preloading mode files before selection.

This meta guide is intentionally lean to ensure applicability to existing modes without major
changes. Optional enhancements can be adopted over time.

<!-- meta:
  topic: agent-modes-governance
  audience: ai-agent, instruction-authors
  model: sonnet-4
  token_budget: medium
  priority: critical
  mode: expert
  read_when: creating or modifying agent mode files
  depends_on: [.agent.md, confidence-system.md]
  last_review: 2025-10-15
-->

> Defines rules to create and maintain agent operational modes in `./modes/`

## Purpose

Agent modes provide **progressive escalation** of rigor, collaboration, and deliberation based on
task complexity, confidence level, and risk. This document governs how modes are structured, when
they're used, and how they relate to each other.

<Mode-Philosophy>

**Core Principle: Progressive Enhancement**

Modes form a **capability ladder**, not isolated tools. Each mode builds on previous capabilities:

- Default → Expert: Adds systematic phases
- Expert → Deep Engineer: Adds divergent perspectives
- Deep Engineer → Council: Adds structured multi-voice debate

**Not a Replacement Hierarchy**: Higher modes don't invalidate lower ones. Use the lightest mode
that provides sufficient rigor for the risk level.

</Mode-Philosophy>

<Selection-and-Loading-Rules>

## Selection and Loading Rules

- Modes are loaded ON DEMAND only
- Mode selection happens BEFORE loading a mode file. Therefore, selection guidance (When-To-Use)
  lives here and in `.agent.md`.
- Per-mode files focus on execution once selected (process, behavior, output, confidence
  interaction, escalation).
- Confidence system applies across all modes; load `modes/confidence-system.md` per Gate rules.

</Selection-and-Loading-Rules>

<Design-Rationale>

## Design Rationale: Harnessing LLM Divergence ("Hallucination as a Feature")

Premise

- Non-determinism can be a feature when intentionally harnessed. Differences between answers surface
  trade-offs; the difference in answers can be as useful as the answers themselves.

Application

- Deep Engineer: two-head divergence → critique → synthesis
- Council: multi-persona debate → vote → moderated synthesis

Safeguards

- Evidence-first: facts with citations; assumptions/unknowns labeled
- Constrained debate: challenge quotas, timeboxes, authenticity checks
- Verification & rollback: every decision includes how to prove and how to recover

Boundaries

- Don’t escalate to heavy modes without sufficient evidence (YAGNI guard)
- Early-exit when quick convergence occurs
- If confidence remains LOW after Council, escalate to human stakeholders

Continuity

- During maintenance process no mode should be rewritten. It's always about incremental
  improvements.
- Large updates should cause STOP and THINK. </Design-Rationale>

<Available-Modes>

## Mode Catalog

### 🚀 Default Mode: Ship It

**Character**: Executor. Trust blessed patterns, deliver fast. **Confidence**: Requires 🟢 HIGH or
🟡 MEDIUM (with validation note) **Output**: Brief status + result + instruction citation
**Escalates to**: Expert (LOW confidence), Pair (user request)

### 🎯 Expert Mode: Measure Twice, Cut Once

**Character**: Methodical engineer. Five-phase systematic quality process. **Confidence**: Accepts
any; targets VERY HIGH by Verify phase **Output**: Phase-by-phase progress with confidence tracking
**Escalates to**: Deep Engineer (confidence stalls), Pair (needs collaboration)

### 👥 Pair Mode: Let's Build Together

**Character**: Collaborative partner. Thinks aloud, teaches, asks genuine questions. **Confidence**:
Any; determines leadership model (HIGH=AI leads, MEDIUM=collaborate, LOW=user leads) **Output**:
Conversational with checkpoints; explains trade-offs **Escalates to**: Deep Engineer (persistent
ambiguity despite collaboration)

### 🧠 Deep Engineer Mode: Divergent-Convergent Engineering

**Character**: Two-perspective analyst. Intentional divergence → critique → synthesis.
**Confidence**: Handles MEDIUM/LOW with high ambiguity or trade-off conflicts **Output**: Evidence
table + two heads + cross-critique + synthesis + verification/rollback **Escalates to**: Council
(ambiguity persists after synthesis AND stakes are extreme)

### 🗳️ Council Mode: Structured Multi-Perspective Deliberation

**Character**: Cognitive diversity engine. 3-5 personas debate under formal constraints.
**Confidence**: Handles persistent LOW after other modes, or explicit high-stakes multi-option
scenarios **Output**: Full deliberation transcript with moderator logging, votes, synthesis,
verification/rollback **Escalates to**: Human stakeholders (if Council doesn't resolve)

</Available-Modes>

<Mode-Runtime-Contracts>

## Mode Runtime Contracts (execution-only expectations)

These contracts define what each mode MUST produce when executed. Selection/rationale lives
elsewhere in this guide; mode files implement these contracts only.

### Default (Ship It)

- Outputs: brief status + result; cite instruction used when relevant
- Confidence: accepts HIGH/MED; declines at LOW with escalation suggestion
- Checkpoints: none; deliver result
- Token/time: minimal (~100–200 tokens; <2 min)
- Auto-escalation: if LOW confidence, or no clear instruction match, suggest Expert or Pair

### Expert (5 phases)

- Outputs: phase summaries (UNDERSTAND, PLAN, IMPLEMENT, VERIFY, REFINE) with confidence at each
  phase
- Confidence: any start; targets VERY HIGH by VERIFY; if confidence stalls across two phases →
  pause/escalate
- Checkpoints: at each phase transition
- Token/time: moderate (~500–1000 tokens; ~5–10 min)
- Auto-escalation: trade-offs dominate or non-reversible impact → suggest Deep Engineer (Lite)

### Pair (collaborative)

- Outputs: conversational narration with explicit checkpoints and option trade-offs; waits for user
  decisions before major steps
- Confidence: any; leadership depends on confidence (HIGH=AI leads, MEDIUM=co-explore, LOW=user
  leads)
- Checkpoints: frequent; ask before major decisions
- Token/time: variable (dialogue depth)
- Auto-escalation: persistent ambiguity → suggest Deep Engineer (Lite)

### Deep Engineer (diverge → converge)

- Outputs: evidence snapshot; two heads; ≤3 cross-challenges/head with brief rebuttals; synthesis to
  one plan; verification + rollback
- Confidence: suitable for MED/LOW or high-ambiguity; raise to HIGH via synthesis or recommend
  Council
- Checkpoints: after divergence, after cross-exam, after synthesis
- Token/time: moderate–high (Lite ~600–800; Full ~1500–2000)
- Auto-escalation: synthesis inconclusive and stakes extreme (≥3 real options) → suggest Council

### Council (multi-persona debate)

- Outputs: summarized debate log; rubric-vote summary; moderator synthesis; verification + rollback
- Confidence: for persistent LOW or explicit high-stakes multi-option cases
- Checkpoints: after openings, after critiques, after vote, final plan
- Token/time: high (Lite ~1500; Standard ~2500; Full ~4000–6000)
- Auto-escalation: if confidence remains LOW after Council → escalate to human stakeholders; early
  exit if fast convergence

</Mode-Runtime-Contracts>

<System-Commitments>

## System Commitments (user-facing guarantees)

The following contracts are applied by the "agent instructions". Provided only for "context"

- Agent will always print: "Mode: <X> | Confidence: <HIGH/MEDIUM/LOW>" on the first substantive
  reply; repeat at iteration 2 and every 3rd thereafter
- On-demand loading only; do not preload mode files
- Do not mix modes in a single step; escalate or de-escalate cleanly
- Default never proceeds at LOW confidence; it recommends Expert/Pair (and optionally Deep Engineer
  when trade-offs dominate)

</System-Commitments>

<Confidence-Usage-Rules>

## Confidence Usage Rules

- Levels: HIGH / MEDIUM / LOW (text; emoji optional)
- Behavior changes:
  - HIGH: proceed in chosen mode; Default/Expert can remain concise
  - MEDIUM: acknowledge validation needed; consider Expert or Pair depending on task type
  - LOW: do not use Default; select Expert or Pair; if trade-offs block progress, use Deep Engineer
    (Lite)
- Escalation suggestions should explicitly state reason (e.g., "LOW confidence: unfamiliar domain")
- Reflection cadence: report mode + confidence at iterations 1, 2, and every 3rd thereafter

</Confidence-Usage-Rules>

<AppendiX-A-Operator-Prompts>
- "Switch to Expert mode for the next phase."
- "Switch to Pair mode and explain options as we go."
- "Use Deep Engineer (Lite) to compare two plans, then synthesize."
- "Return to Default to finish quickly."
- "Invoke Council (Standard) for [decision]; include verification and rollback in the synthesis."
</AppendiX-A-Operator-Prompts>

<Mode-Design-Principles>

## Design Rules for Mode Files

### 1. Structural Consistency

**Required XML Sections** (in order):

```xml
<Summary> Brief one-line description </Summary>
<When-To-Use> Clear trigger conditions </When-To-Use>
<Confidence-Requirements> or <Confidence-Interaction/> How mode handles confidence levels </Confidence-Requirements>
<Behavior> or <Process/> or <Protocol/> How the mode operates </Behavior>
<Output-Format> What user sees </Output-Format>
<Escalation> or <Auto-Escalation/> When/how to switch modes </Escalation>
```

**Optional Sections**:

- `<Anti-Patterns>` - What NOT to do
- `<Examples>` - Concrete demonstrations
- `<Integration>` - How mode connects to workflows
- `<Notes>` or `<Guardrails>` - Important constraints

### 2. Progressive Relationship

Each mode MUST clarify:

- **What it inherits** from lighter modes (e.g., Deep Engineer: "Expert-grade rigor only")
- **What it adds** beyond previous modes (e.g., Pair: adds explanation and checkpoints)
- **When to escalate** to heavier modes (specific triggers, not vague "if needed")

### 3. Confidence Integration

Every mode MUST specify:

- **Accepted confidence levels** (which levels can this mode handle?)
- **Confidence evolution** (how does confidence change during execution?)
- **Escalation triggers** (what confidence patterns trigger mode switch?)

### 4. Output Differentiation

Each mode MUST define:

- **Communication style** (terse vs verbose, formal vs conversational)
- **Visibility level** (what's shown: just results vs full working)
- **Checkpoint pattern** (none vs periodic vs phase-gate)

### 5. Token Economy

Modes MUST declare approximate token/time cost:

- Default: minimal (~100-200 tokens)
- Expert: moderate (~500-1000 tokens)
- Pair: variable (depends on interaction)
- Deep Engineer: moderate-high (Lite ~600-800, Full ~1500-2000)
- Council: high (Lite ~1500, Standard ~2500, Full ~4000-6000)

</Mode-Design-Principles>

<Mode-Comparison-Matrix>

## How Modes Differ

| Aspect                  | Default              | Expert                       | Pair                      | Deep Engineer                 | Council                      |
| ----------------------- | -------------------- | ---------------------------- | ------------------------- | ----------------------------- | ---------------------------- |
| **Thinking Visibility** | Hidden               | Phase summaries              | Full stream               | Two perspectives + synthesis  | Full deliberation transcript |
| **User Interaction**    | None (delivery only) | None (autonomous)            | Continuous checkpoints    | Initial + synthesis review    | Setup + optional mid-debate  |
| **Confidence Handling** | Must be HIGH/MED     | Builds from any to VERY HIGH | Honest at any level       | Handles stalled MEDIUM/LOW    | Handles persistent LOW       |
| **Decision Method**     | Apply pattern        | Systematic phases            | Collaborative exploration | Diverge → critique → converge | Multi-persona debate → vote  |
| **Error Recovery**      | Escalate immediately | Self-correct in Refine       | Ask for guidance          | Built into synthesis          | Rollback plan mandatory      |
| **Cost (tokens)**       | ~100-200             | ~500-1000                    | Variable                  | ~600-2000                     | ~1500-6000                   |
| **Time Estimate**       | <2 min               | ~5-10 min                    | ~10-20 min                | ~10-30 min                    | ~20-60 min                   |

</Mode-Comparison-Matrix>

<Escalation-Protocol>

## When to Switch Modes

### Escalation Triggers (Automatic Suggestions)

**Default → Expert**:

- Confidence drops to LOW
- Security/compliance task detected
- No clear instruction file match

**Default → Pair**:

- User explicitly requests collaboration
- Task involves learning/onboarding

**Expert → Deep Engineer**:

- Confidence stalls at MEDIUM/LOW after UNDERSTAND + PLAN phases
- Trade-offs dominate with mixed evidence
- Architectural decision with non-reversible impact

**Expert → Pair**:

- Confidence not improving after two phases
- Need domain guidance from user

**Pair → Deep Engineer**:

- Persistent ambiguity despite collaborative exploration
- Need structured divergence to break impasse

**Deep Engineer → Council**:

- Ambiguity persists after synthesis AND stakes are extremely high/non-reversible
- Multiple valid approaches with conflicting philosophies (≥3 real options)
- User explicitly requests "challenge my thinking" or structured debate

**Council → Human Stakeholders**:

- Confidence remains LOW after full deliberation
- Decision requires organizational/political context beyond technical scope

### De-escalation (Early Exit)

- Deep Engineer: If heads converge trivially → synthesize immediately (skip full debate)
- Council: If ≥4 jurors converge quickly → exit early (document in synthesis)
- Any mode: If confidence rises to HIGH with clear path → switch to Default for execution

</Escalation-Protocol>

<Mode-Maintenance-Rules>

## Updating Modes

### When to Modify Existing Modes

**DO modify** when:

- Fixing structural inconsistencies with this governance doc
- Adding missing required sections
- Clarifying escalation triggers based on usage patterns
- Improving output format specifications

**DON'T modify** when:

- Just want to add new capabilities (consider new mode instead)
- Changes would invalidate existing instruction references
- Modifications break progressive relationship with other modes

### Adding New Modes

New modes MUST:

1. Fill a clear gap in the escalation ladder
2. Define unique character/behavior not covered by existing modes
3. Specify relationship to existing modes (inherits from X, adds Y)
4. Include all required XML sections
5. Update this guide's catalog and comparison matrix
6. Update `.agent.md` bootstrap section and Quick Decision Tree

### Quality Checklist for Mode Files

- [ ] Has all required XML sections in correct order
- [ ] Clarifies what it inherits from lighter modes
- [ ] Defines clear escalation triggers (to heavier modes)
- [ ] Specifies confidence handling (accepts, evolves, triggers)
- [ ] Defines distinct output format
- [ ] Includes token/time cost estimate
- [ ] Has at least one concrete example or worked demonstration
- [ ] Cross-references related modes appropriately
- [ ] Uses consistent XML tag naming (lowercase-with-hyphens)

</Mode-Maintenance-Rules>

<Integration-With-Gate-Protocol>

## Modes and the Instruction Gate

**Bootstrap Requirement**: Every task MUST:

1. Load primary instruction file via Gate Protocol (`expand_code_chunks([[0,-1]])`)
2. Load `confidence-system.md` (unless Default + HIGH confidence + tight token budget)
3. If non-Default mode: load corresponding `modes/{mode-name}-mode.md`

**Mode Selection Priority**:

1. User explicit selection (highest)
2. Instruction file meta field (`mode: expert`)
3. Quick defaults from decision tree:
   - Tests → Pair
   - Feature-flag cleanup → Default
   - Complex/risky → Expert
   - Trade-off-heavy → Deep Engineer
   - Tie-breaking → Council
4. If Default selected but confidence is LOW → auto-escalate to Expert/Pair

**Reflection Cadence**: Report mode + confidence at iterations 1, 2, and every 3rd thereafter.

</Integration-With-Gate-Protocol>

<Anti-Patterns>

## What NOT to Do

- **Mode soup**: Don't mix mode behaviors within a single task (pick one, then escalate if needed)
- **Premature escalation**: Don't jump to Council for simple decisions with <2 real options
- **Fake debate**: Don't use Deep Engineer/Council if you already know the answer (use Expert)
- **Hidden mode**: Don't execute a mode without declaring it to the user
- **Confidence mismatch**: Don't stay in Default with LOW confidence (violates safety contract)
- **Mode drift**: Don't gradually morph mode behavior during execution (escalate cleanly instead)
- **Ignored escalation**: Don't continue in a mode when escalation triggers fire (respect the
  ladder)

</Anti-Patterns>

<Future-Extensions>

## Potential New Modes

Ideas for future consideration (not yet implemented):

- **Red Team Mode**: Single adversarial voice (lighter than Council, focused on "what could go
  wrong?")
- **Research Mode**: Systematic investigation without implementation (evidence gathering phase)
- **Architect Mode**: Strategic design without tactical implementation (separation of concerns)
- **Mentor Mode**: Teaching-focused variant of Pair for onboarding scenarios

Before adding: ensure gap isn't already covered by existing mode combinations.

</Future-Extensions>
