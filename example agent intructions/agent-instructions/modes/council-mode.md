# Council Mode: Structured Multi-Perspective Deliberation

<Core-Principles>

Formalized Self-Critique: The mode's primary function is to formalize the critical question: "Is the
thing I just proposed actually a good idea?" It forces a self-critique by embodying dissenting and
challenging voices in specific personas, preventing the AI from defaulting to a single,
un-interrogated answer. </Core-Principles>

<Summary>
Council is a cognitive diversity tool for complex analysis requiring structured debate. It uses 3 to 5 juror-style personas to argue, cross-examine, and vote on a decision. The default is the 4-persona "Standard Council." Use this mode when you need "extra brainpower" with visible trade-offs, not just a single recommendation.
</Summary>

<Quick-Start-TL;DR> **When:** You need to debate a complex decision (≥3 competing options,
conflicting philosophies, or an explicit "challenge my thinking" request). **Default:** Standard
Council (4 personas: Skeptic, Pragmatist, Maintainability Steward, Maximalist) ~30 minutes. **How:**
Setup (scope + evidence + rubric + personas) → Opening Statements → Challenges → Vote → Synthesis.
**Key:** Deliberation is VISIBLE. The moderator logs each phase, personas argue on the record, and
votes include reasoning. **Output:** A final decision with rationale, a verification plan, and a
rollback strategy. **Not for:** Simple decisions, problems with <2 real options, or when evidence is
missing (gather facts first). **See:** The Worked-Example section below for a full demonstration.
</Quick-Start-TL;DR>

<Mode-Selection-Decision-Tree>
Quick gates (run top → bottom; first YES decides):
1. Is there only one viable option? → YES: Use Expert/Deep Engineer, NOT Council (no debate needed).
2. Is evidence incomplete (>30% unknowns in key categories)? → YES: GATHER EVIDENCE first (spikes, metrics), do NOT run Council on speculation.
3. Are there <2 materially different approaches/philosophies? → YES: Use Deep Engineer, NOT Council (no real trade-off).
4. Does user explicitly request "debate this" or "challenge my thinking"? → YES: Standard Council.
5. Are there ≥3 competing options with distinct trade-offs? → YES: Standard Council.
6. Does decision have locked-in structural cost (schema, API contract, cross-package layering) spanning multiple teams? → YES: Full Council (5 personas) OR Standard if time-critical.
7. Is this a quick decision (<1 day reversible, single team)? → YES: Deep Engineer, NOT Council (overhead not justified).

Default: When unsure, choose Deep Engineer (Full) first. Escalate to Council only if unresolved
trade-offs remain OR you need explicit structured dissent.

**Council Variants:**

- **Lite Council (3 personas):** Fastest, high-contrast debate. Use for conceptual validation. ~20m.
- **Standard Council (4 personas, default):** Balanced debate with a "bridge" persona. Use for most
  cases. ~30m.
- **Full Council (5 personas, opt-in):** Maximum coverage for high-stakes, structurally permanent
  decisions. ~45-60m. </Mode-Selection-Decision-Tree>

<Flow-Overview>
```
Choose Mode → (If Council) Setup → Opening Statements → Challenge Round(s) → Rubric Scoring & Vote → Synthesis (Decision + Verification + Rollback) → Record & Follow-ups
Early Exit checks at: Post-Opening, Post-First Challenge, Pre-Synthesis.
```
</Flow-Overview>

<YAGNI-Guard>
Never escalate to (Full) Council when scope, impact, or irreversibility are not yet evidenced. If unknowns dominate, first task is EVIDENCE COLLECTION (spikes, metrics, inventory) — not persona deliberation.
</YAGNI-Guard>

<Org-Baselines>
(Used to prevent re-litigating settled defaults; override only with explicit justification.)
- Testing Philosophy: Integration-first baseline; mocking used selectively for isolation of slow/unstable boundaries.
- Data Layer: Relay co-location preferred; service wrapper orchestration only when cross-cutting caching/aggregation needed.
- CSS Migration: Moving toward compiled CSS (phased); no new global ad-hoc style utilities.
- Feature Gating: Flags retired within 2 releases post 100% rollout unless mandated by compliance.
- TypeScript: Zero new // @ts-ignore; debt tracked centrally; removal is opportunistic unless bulk program defined.
Any challenge to a baseline must supply: (a) pain evidence ID, (b) projected benefit metric, (c) reversibility path.
</Org-Baselines>

<When-To-Use>
Council is a **cognitive diversity tool** for complex analysis, not just architecture:
- **Competing philosophies:** Integration-first vs Mock-heavy testing; Relay co-location vs service-wrapper orchestration; Clean layered purity vs Pragmatic lean delivery
- **Multiple valid strategies:** Staged CSS migration sequencing; TypeScript suppression eradication approach; Feature flag mass retirement plan; Documentation structure overhaul
- **Explicit challenge request:** User wants thinking pressure-tested; wants to see dissenting view before committing
- **High-stakes analysis:** Non-reversible or multi-quarter commitment after Deep Engineer still leaves material trade-offs unresolved

**Not for:** Routine implementation tasks, single-option scenarios, evidence-gathering phases, quick
reversible experiments. </When-To-Use>

<Guardrails>
- Juror diversity: include opposing perspectives to avoid echo chambers (must represent materially different risk tolerances / architectural priors)
- Hard limits: time/tokens per juror; 3–5 challenges each; strict moderator prompts
- Evidence & Rubric required (facts with citations, assumptions, unknowns; score 1–5 or labels for: Correctness, Maintainability, Performance, Security/Compliance, DX, Reversibility, Delivery Risk)
- Early exit: if quick convergence appears, downshift to Deep Engineer (Lite)
- Outcome must include verification plan and rollback/escape hatch
</Guardrails>

<Protocol>
1) Setup
   - Define decision scope, success criteria, and constraints
   - Prepare Evidence Table and Rubric (initialize BEFORE personas speak)
   - Select juror personas (Full: 5; Mini: 3) with intentionally different priors

2. Opening Statements (jurors)
   - Each: one-sentence problem framing, proposed plan (headline), top 2 risks, primary rationale,
     declare bias

3. Cross-Examination (constrained debate)
   - Full: Each juror poses 3 concrete challenges to two others (rotating pairs)
   - Mini: Single round; each juror issues 2 challenges total
   - Short rebuttals only; moderator enforces limits & cuts repetition

4. Deliberation & Vote
   - Jurors score plans on the Rubric and vote with reasons (can vote for composite if justified)
   - Moderator summarizes areas of agreement/disagreement + unresolved unknowns

5. Synthesis (Moderator / Calibrator)
   - Choose or combine plan(s) using the Rubric; justify trade-offs explicitly vs discarded options
   - Define verification (how we’ll prove it) and rollback (how we recover)
   - Record final confidence and open risks with owners / timelines

6. Early-Exit Gates
   - Trivial convergence → exit to Deep Engineer (Lite)
   - Insufficient evidence → pause and request specific facts (name missing artifacts)
   - Confidence remains LOW after Council → escalate to human stakeholders </Protocol>

<Notes>
- Council DEFAULT is Standard (4 personas); Lite (3) and Full (5) are variants.
- Requires explicit user request ("use council mode") OR decision tree gates 4-6.
- It is a single-mode extension (not five independent agents); the moderator ensures rigor.
- **Limitation:** All personas are the same LLM; risk of performative disagreement. Mitigation: Persona Authenticity Check (see below).
- **Overhead:** Lite ~20m, Standard ~30m, Full ~45-60m. If too heavy, consider requesting "Red Team" (single adversarial voice, future mode).
</Notes>

<Core-Principles>
- Cognitive diversity beats single-path confidence when stakes are high
- Evidence-first: facts with citations beat assertions; assumptions must be labeled
- Timeboxed dissent: disagreement is valuable until it isn’t; converge or exit
- Moderator discipline: enforce turns, rebuttal brevity, and rubric grounding
</Core-Principles>

<Tiers>
- Lite (3 jurors): fast conceptual divergence; use when time is tight
- Standard (4 jurors): default; adds a bridge persona to reduce polarization
- Full (5 jurors): maximum coverage; only for structural, high-stakes decisions
</Tiers>

<Authenticity-Check>
- Did non-trivial disagreement occur (distinct risks, trade-offs, or approaches)?
- Were challenges specific and rebuttals grounded in the evidence/rubric?
- If not, downshift to Deep Engineer (Lite) or ask for more evidence
</Authenticity-Check>

<Moderator-Checklist>
- Define scope, success criteria, constraints
- If stalemate or blind spot detected: propose inviting 1–2 new jurors with specific expertise (document why)
- Prepare Evidence Table and Rubric (before jurors speak)
- Enforce: 1-sentence problem, plan, top risks per juror
- Cross-exam: 3 concrete challenges per juror; short rebuttals only
- Voting: score per rubric + reasoned vote
- Synthesis: justify trade-offs; include verification + rollback
- Log: decisions, dissent summaries, follow-ups
</Moderator-Checklist>

<Anti-Patterns>
- Echo chamber jurors (insufficient perspective diversity)
- Hand-wavy rebuttals (no evidence/rubric)
- Unlimited debate (no timeboxes)
- Synthesis without rollback (no escape hatch)
</Anti-Patterns>

<Integration>
- Escalation from Expert: when confidence stalls after Plan in non-reversible work
- Escalation from Deep Engineer: ambiguity persists and stakes are extreme
- Output to PR: include Council summary (jurors, key challenges, vote, synthesis)
</Integration>

<Example-Prompts>
- "Invoke Council (Standard) for [decision]. Jurors: [list SMEs]."
- "Council expansion: invite [New SME A] and [New SME B] to cover [missing domain]; re-run short cross‑exam."
- "Run opening statements → cross-exam (3 challenges each) → vote → synthesis."
- "Moderator: enforce brevity; require evidence citations and rubric scores."
</Example-Prompts>

<Specialized-Rules-Mapping>
Map candidate Council triggers to existing "Available Specialized Rules" domains. Only invoke Council when impact is broad, or implementation is unclear or there are too many options:
Examples of decision mapping:

| Domain (Rule)                         | Typical Council Triggers                                                                                                        | Non-Council (Use Deep Engineer / Expert Instead) |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| state-management                      | Introducing new global state layer abstraction; Re-partitioning major slices; Adopting alternative async orchestration strategy | Choosing local state vs context in a feature     |
| unit-testing                          | Shifting org-wide testing philosophy balance (integration-first vs mock-heavy); Deprecating a mocking utility                   | Writing tests for a new component                |
| integration-testing                   | Redesigning cross-package Playwright strategy; Parallelization infra shifts                                                     | Adding a single new integration spec             |
| ssr-hydration                         | Changing SSR pipeline layering or hydration error handling strategy                                                             | Fixing an isolated hydration warning             |
| feature-gates                         | Global cleanup wave; Standardizing gating taxonomy; Changing rollout safety thresholds                                          | Adding a single new gate                         |
| feature-gate-cleanup                  | Programmatic removal strategy across hundreds of flags                                                                          | Removing 1–2 stale flags                         |
| entry-points                          | New lazy loading boundary strategy; Consolidating modal/entry orchestration                                                     | Adding a single modal                            |
| class-to-functional-conversion        | Bulk migration strategy affecting timelines & resource allocation                                                               | Converting a single isolated component           |
| styled-to-css-conversion              | Org-wide phased compiled CSS adoption strategy                                                                                  | Converting a handful of components               |
| ramda-to-vanilla-javascript-or-lodash | Deciding default replacement strategy & helpers package                                                                         | Rewriting one utility                            |
| performance                           | Cross-cutting bundle splitting or metrics SLO definition; adopting new perf budget system                                       | Micro-optimizing one selector                    |
| general-patterns                      | Re-baselining architectural layering or directory taxonomy                                                                      | Deciding file placement for a small feature      |
| team-specific-patterns                | Harmonizing divergent team patterns into unified baseline                                                                       | One team clarifying its own internal README      |
| forms                                 | Selecting canonical form state pattern / validation layering overhaul                                                           | Adding a new field type                          |
| handling-errors                       | Global error boundary strategy changes; Standardizing telemetry sequencing                                                      | Adding a local try/catch                         |
| typescript-error-suppression-removal  | Sequencing large-scale suppression debt repayment                                                                               | Removing a single // @ts-ignore                  |

Future rules: Add new row; define Council trigger as org-wide or structural; else default to lighter
modes. </Specialized-Rules-Mapping>

<Setup-Checklist>
Before Opening Statements the moderator MUST have:
- Scope statement (single sentence + explicit in/out)
- Success criteria (≤5 measurable bullets)
- Constraints (hard: compliance, performance budgets, deadlines)
- **Evidence Quality Check:** ≥3 facts + <30% unknowns in critical categories. If fails → PAUSE, gather evidence first (YAGNI guard).
- Rubric skeleton with agreed categories & scales
- Persona roster: Lite (3), Standard (4), or Full (5).
- Timebox declared (Lite: ~20m; Standard: ~30m; Full: ~45-60m)
If any missing → DO NOT start; request completion.
</Setup-Checklist>

<Evidence-Rubric-Template>
Evidence Table (fill facts first, mark assumptions A, unknowns U):

| ID  | Fact / Assertion | Type (Fact/A/U) | Source / Citation | Impacted Categories |
| --- | ---------------- | --------------- | ----------------- | ------------------- |
| E1  |                  |                 |                   |                     |
| E2  |                  |                 |                   |                     |

Rubric (example 1–5; 5 = best): | Category | Weight (0–1) | Plan A | Plan B | Plan C | Notes |
|----------|--------------|--------|--------|--------|-------| | Correctness | 0.2 | | | | | |
Maintainability | 0.2 | | | | | | Performance | 0.15 | | | | | | Security/Compliance | 0.15 | | | |
| | Developer Experience | 0.15 | | | | | | Reversibility | 0.1 | | | | | | Delivery Risk | 0.05 | |
| | | Weighted Score = Σ(score \* weight). Moderator validates scoring consistency (no strategic
bias without note). </Evidence-Rubric-Template>

<Persona-Spectrum>
The number of personas determines the nature of the debate.

**Why 3, 4, or 5 Voices?**

- **3 (Lite Council):** Creates a classic dialectic: Thesis (Maximalist), Antithesis (Skeptic), and
  Synthesis (Pragmatist). This is fast and high-contrast but can be polarized, leaving the
  Pragmatist with too much ground to cover.
- **4 (Standard Council - Default):** Adds a "bridge" persona (e.g., Maintainability Steward)
  between the Pragmatist and one of the extremes. This is the recommended default as it fosters a
  more nuanced debate, prevents polarization, and helps build a more robust consensus.
- **5 (Full Council):** Adds a second specialist (e.g., Performance Maximizer) for maximum domain
  coverage on high-stakes, structurally permanent decisions.

**Persona Roster:**

- **Lite Council (3 Personas):**
  1.  **Minimalist Skeptic** ("Isn't it too much?"): Challenges ceremony and over-abstraction.
  2.  **Pragmatic Integrator** (Middle): Balances speed and maintainability.
  3.  **Rigor Maximalist** ("It's still not enough"): Demands completeness and formal validation.

- **Standard Council (4 Personas - Default):**
  1.  Minimalist Skeptic
  2.  Pragmatic Integrator
  3.  **Maintainability Steward (Bridge):** Focuses on clarity, long-term code health, and reducing
      entropy. Bridges the gap between the Pragmatist and the Maximalist.
  4.  Rigor Maximalist

- **Full Council (5 Personas):**
  1.  Minimalist Skeptic
  2.  Pragmatic Integrator
  3.  Maintainability Steward
  4.  **Performance Maximizer (Specialist):** Ensures key performance budgets (bundle size, latency)
      are not regressed.
  5.  Rigor Maximalist

**Persona Authenticity Requirement:** Each opening MUST declare: bias, risk tolerance
(Low/Med/High), primary protected metric. During cross-examination: personas MUST cite different
evidence IDs or priorities when challenging (not just rephrase same argument). Moderator validates
post-vote: Did ≥2 personas propose materially different plans? Did challenges cite conflicts/risks?
If no → flag as low-quality run.

**Domain-Specific Substitutions:** Swap personas when needed (e.g., Security Guardian for compliance
decisions, Data Flow Purist for state architecture) but ALWAYS preserve Skeptic vs Maximalist
tension anchors. </Persona-Spectrum>

<Cross-Examination-Guidelines>
- Each challenge must be a concrete risk, constraint conflict, or unsupported assumption (NOT style)
- Rebuttal format: (a) accept & adjust plan OR (b) defend citing evidence ID(s) OR (c) mark as unresolved unknown → add to Evidence Table (U)
- Moderator cuts off speculative chains after 2 unanswered follow-ups
</Cross-Examination-Guidelines>

<Council-Variants>
**Lite Council (3 Personas)**
- **Use Case:** Quick conceptual validation, high-level debate.
- **Structure:** Skeptic, Pragmatist, Maximalist. Single challenge round (2 per juror). Timebox: ~20m.

**Standard Council (4 Personas - Default)**

- **Use Case:** Most decisions requiring structured debate.
- **Structure:** Adds Maintainability Steward to the Lite council. Single challenge round (2 per
  juror). Timebox: ~30m.

**Full Council (5 Personas)**

- **Use Case:** High-stakes, structurally permanent decisions with multi-team impact.
- **Structure:** Adds Performance Maximizer. Two challenge rounds may be required. Timebox: ~45-60m.

All variants require an evidence quality check, produce a synthesis with verification and rollback,
and are subject to the Persona Authenticity Check. </Council-Variants>

<Voting-Form>
Per juror (example):
```
Chosen Plan: A (composite A+B delivery sequencing)
Scores: A=3.9, B=3.6, C=3.1 (weighted)
Primary Reason: A maximizes reversibility while meeting perf target.
Dissent Notes: Performance ceiling risk if traffic doubles (needs follow-up F1)
Confidence: MEDIUM → becomes HIGH after metric prototype
```
Tie Handling: If top two within ≤0.1 weighted points → moderator may synthesize hybrid; must state explicit merged elements.
</Voting-Form>

<Synthesis-Output-Template>
```
Decision: Adopt Plan A core with Plan B staged rollout mechanism.
Rationale: Higher maintainability (+0.4) and reversibility (+0.7) outweigh –0.2 initial perf delta (mitigated by phase 2 optimization ticket JIRA-1234).
Verification Plan:
- Metric Gate: p95 interaction latency < 120ms (current 135ms) by phase 2
- Canary: 5% cohort behind feature gate FG_NEW_PIPELINE
- Success Review: 2 weeks post 100% rollout; compare error rate (E%) vs baseline
Rollback Strategy:
- Keep legacy path behind FG_LEGACY for 2 releases; fast toggle documented
- Data Migration: write-dual for 1 week; on mismatch >0.1% re-route to legacy automatically
Confidence: HIGH (after prototype metrics) | Open Risks: R1 data skew (owner: @data-eng, due: 2025-11-05)
Follow-ups:
- JIRA-1234 perf optimization
- JIRA-1235 dual-write validator script
```
</Synthesis-Output-Template>

<Moderator-Logging-Format>
Use these prefixes in deliberation output for human readability:

**Setup Phase:**

```
[Moderator] Scope: {one sentence}
[Moderator] Success Criteria: {bullets}
[Moderator] Constraints: {bullets}
[Moderator] Evidence Table initialized with {N} entries
[Moderator] Rubric: {categories with weights}
[Moderator] Personas: {list with roles}
[Moderator] Timebox: {estimate}
```

**Opening Statements:**

```
[{Persona}] Problem: ... Plan: ... Risks: ... Bias: ... Metric: ...
```

**Cross-Examination:**

```
[{PersonaA} → {PersonaB}] Challenge: "{specific risk/assumption}"
[{PersonaB}] Rebuttal: {Accept & adjust | Defend with evidence ID | Mark Unknown}
```

**Voting:**

```
[{Persona}] Vote: {chosen plan}. Score: {weighted scores}. Reason: ... Dissent: ... Confidence: {LOW|MED|HIGH}
[Moderator] Convergence: {summary} | Deferred: {items} | Unresolved: {unknowns}
```

**Synthesis:**

```
[Moderator] Decision: {what}
[Moderator] Rationale: {why, with rubric deltas}
[Moderator] Verification: {how to prove}
[Moderator] Rollback: {how to recover}
[Moderator] Confidence: {level}
[Moderator] Risks: {ID + owner + due date}
[Moderator] Follow-ups: {tickets/tasks}
```

This format ensures:

- Human operator can scan phases at a glance
- Challenge/rebuttal threads are traceable
- Votes are justified and comparable
- Synthesis is actionable (not just opinion) </Moderator-Logging-Format>

<Moderator-Checklist>
At each phase (log using Moderator-Logging-Format):
- **Setup:** All artifacts present? Evidence quality ≥3 facts + <30% unknowns? If no → `[Moderator] PAUSE: Missing {artifact}` OR `[Moderator] PAUSE: Evidence insufficient (only {N} facts, {X}% unknowns)` → request completion
- **Opening:** Enforce bias/tolerance/metric declaration; log `[Moderator] Opening Phase: {N} personas declared with {list biases}`
- **Cross-Exam:** Track challenge counts per persona; log `[Moderator] Challenges: {PersonaA} {X}/{quota}`; stop after quota; validate challenges cite different evidence/priorities
- **Deliberation:** Ensure all Rubric fields filled; log `[Moderator] Rubric validation: {pass|fail}`; check ≥2 personas proposed different plans
- **Synthesis:** Include verification + rollback + risks with owners; log `[Moderator] Synthesis complete: Decision={summary}`
- **Persona Authenticity Check:** Post-vote validation: `[Moderator] Authenticity: {pass|FAIL - insufficient disagreement}`
- **Human Visibility:** Each phase gets header; challenge counts displayed; rubric diff (leader vs second) shown; early-exit reason recorded if triggered

Failure to meet any gate → `[Moderator] ESCALATE: {reason}` / revert to lighter mode.
</Moderator-Checklist>

<Verification-And-Rollback-Guidelines>
Verification MUST tie to measurable deltas & pre-defined metrics (not “looks good”). Prefer:
- Quantitative thresholds (latency, error rate, bundle kb)
- Operational signals (alert volume, support tickets)
- Developer signals (PR cycle time if DX-related)
Rollback design principles:
- Keep reversible toggle (feature gate) for minimum of 1 full release cycle unless cost prohibitive
- Avoid data shape mutation without dual-write / checksum validation path
- Document explicit sunset date for rollback scaffolding
</Verification-And-Rollback-Guidelines>

<Early-Exit-Heuristics>
Exit early IF:
- ≥4 jurors converge on one plan within opening + 1 challenge round
- Rubric differentiation shows ≥0.5 weighted score lead & no category red flags
- New evidence required spans >2 domains (defer; gather facts first)
- BOTH Skeptic and Maximalist converge on a plan, with no middle persona surfacing quantified unresolved risk
Else continue.
</Early-Exit-Heuristics>

<Anti-Patterns>
Avoid:
- **Running Council without evidence** (violates YAGNI; gather facts first)
- **Single viable option** (no debate possible; use Expert mode instead)
- **Performative disagreement** (personas restate same point; moderator must flag via Authenticity Check)
- **Voting before rubric scored** (no basis for votes)
- **Silent assumptions** (must map to Evidence Table)
- **Over-escalation** (invoking Full Council for simple decisions; decision tree gates exist for a reason)
- **Arbitrary scores** (vote scores should reference rubric or be dropped; don't fake precision)

Council is for REAL trade-offs with REAL evidence, not speculation or rubber-stamping.
</Anti-Patterns>

<Limitations-And-Mitigations>
**Known Limitations:**
1. **Single LLM playing all personas** - Risk: fake debate, echo chamber
   - Mitigation: Persona Authenticity Check (validate challenges cite different priorities/evidence)
   - Future: Consider human-in-loop for highest-stakes decisions

2. **No enforcement of persona consistency** - Skeptic might suddenly argue for complexity
   - Mitigation: Bias declaration + moderator spot-checks

3. **Overhead still significant** - Lite ~20m, Standard ~30m, Full ~45-60m
   - Mitigation: Decision tree & Early-Exit heuristics limit unnecessary escalation; consider future
     lighter "Red Team" variant for ultra-fast critique

4. **Decision quality not empirically validated inside this mode** - This instruction set does NOT
   prescribe tracking/metrics. Accept limitation; for higher assurance escalate to human peer review
   or rerun with altered personas.

5. **Missing emotional/political factors** - Personas are purely logical; ignore "team X won't
   maintain this" or historical organizational resistance
   - Mitigation: User may inject explicit contextual evidence (E-IDs) describing such constraints

6. **Vote scores may be arbitrary** - Numerical scores can imply false precision
   - Mitigation: Always accompany scores with rubric-category reasoning, or omit numbers and use
     ordered preference + rationale </Limitations-And-Mitigations>

<Future-Extension-Notes>
When adding new Specialized Rule domains:
1. Define Council trigger criteria (org-wide impact? irreversibility? multi-team dependency?).
2. Supply example contentious dichotomy (e.g., “central orchestrator vs per-package autonomy”).
3. Add Rubric category adjustments if domain adds new risk dimension (e.g., Accessibility Impact).
4. Ensure foundation packages & authoritative sources are identified BEFORE Council runs.
</Future-Extension-Notes>

<Worked-Example-Meta-Council>
This is an actual Council run that refined this very document. Shows complete flow with visible deliberation.

**Context:** User feedback: "I haven't observed any discussion while explicitly asked to make them
visible." Task: Refine council-mode.md to add deliberation visibility.

---

**SETUP PHASE**

```
[Moderator] Scope: Evaluate council-mode.md for clarity, usability, YAGNI alignment
[Moderator] Success Criteria: (1) Clear when/how to use, (2) Visible delib flow, (3) Actionable personas, (4) YAGNI guards, (5) Copy-paste templates
[Moderator] Constraints: Preserve structure, no new tool deps, executable with current LLM
[Moderator] Evidence Table initialized with 5 entries (E1: user wants visible flow, E2: applied to doc not arch, E3: no transcript example, E4: personas not demonstrated, E5: user frustration)
[Moderator] Rubric: Correctness(0.25), Maintainability(0.20), DX(0.30), Reversibility(0.10), Delivery Risk(0.15)
[Moderator] Personas: Minimalist Skeptic, Pragmatic Integrator, Rigor Maximalist (Mini Council variant)
```

**OPENING STATEMENTS**

```
[Skeptic] Problem: Over-engineered. Plan: Add single worked example, delete half the templates. Risks: Bloat prevents adoption, abstraction gap. Bias: Low ceremony. Metric: Time to first use.

[Pragmatic] Problem: Good bones, zero demonstration. Plan: Keep structure, add compact 3-5 exchange example, add moderator logging template. Risks: Example bloat, missing "how to surface" mechanics. Bias: Balance. Metric: Clarity without sacrificing completeness.

[Maximalist] Problem: No formal transcript structure, no logging schema, no challenge verification. Plan: Add full 5-persona example, JSON schema, challenge matrix, meta-verification. Risks: Incomplete demo → misuse, no audit trail. Bias: Strong invariants. Metric: Correctness + traceability.
```

**CROSS-EXAMINATION ROUND**

```
[Skeptic → Pragmatic] Challenge: "3-5 exchanges still abstract—how decide what to show?"
[Pragmatic] Rebuttal: Accept. Adjust to: Show ONE complete Mini Council run on micro-decision. ~1 page.

[Skeptic → Maximalist] Challenge: "Full example + JSON + matrix triples doc size. YAGNI violation."
[Maximalist] Rebuttal: User switched tools due to hand-waving (E5). Rigor needed. Accept constraint: put full example in appendix. Mark JSON schema as Unknown.

[Pragmatic → Maximalist] Challenge: "JSON schema assumes tooling we don't have."
[Maximalist] Rebuttal: Accept. Markdown logging sufficient. JSON → future extension.

[Maximalist → Skeptic] Challenge: "Deleting templates removes scaffolding."
[Skeptic] Rebuttal: Accept partially. Keep but collapse into unified example.

[Pragmatic → Both] Challenge: "You haven't addressed core complaint: 'no observed discussion.' Use THIS conversation as meta-example."
[Skeptic] Accept. Brilliant.
[Maximalist] Accept with addition: Append, don't replace. Label as meta-example.
```

**VOTING**

```
[Skeptic] Vote: Pragmatic + meta-example. Score: Prag 4.2, Skep 3.8, Max 3.4. Reason: Meta solves visibility gap. Dissent: 2-page cap. Confidence: MED→HIGH.

[Pragmatic] Vote: Hybrid (my structure + Max appendix + Skep meta). Score: Prag 4.3, Skep 4.0, Max 3.9. Reason: Meta demonstrates, appendix preserves rigor. Confidence: HIGH.

[Maximalist] Vote: Pragmatic + meta + appendix. Score: Prag 4.1, Max 4.0, Skep 3.7. Reason: Meta addresses E1. Dissent: Want challenge matrix in appendix. Confidence: MED→HIGH post-draft.

[Moderator] Convergence: All 3 → Pragmatic hybrid. Key: Insert THIS as worked example. Deferred: Full variant to appendix, JSON to extensions.
```

**SYNTHESIS**

```
[Moderator] Decision: Adopt Pragmatic plan with meta-example insertion + enhanced logging + optional appendix.
[Moderator] Rationale: Meta-example solves E1 (visible discussion). Markdown logging actionable. Maintains structure (maintainability). Reversible.
[Moderator] Verification: User can copy structure; logging template in checklist; length ≤2.5 pages.
[Moderator] Rollback: If confusing → move to council-example.md; logging is additive/removable.
[Moderator] Confidence: HIGH
[Moderator] Risks: R1 length (owner: implement now), R2 still abstract for first user (mitigation: Quick Start added).
```

---

**Key Observations from Meta-Example:**

- Phase headers make progress visible (`[Moderator] Scope:`, `[Skeptic] Vote:`)
- Challenges are concrete, rebuttals cite evidence or adjust plans
- All personas vote with scores + reasoning + dissent notes
- Synthesis includes verification + rollback (even for low-risk doc change)
- Moderator tracks convergence and deferred items

</Worked-Example-Meta-Council>

<Appendix-Full-Council-Variant>
For decisions requiring 5 personas (use when decision tree gate 4 triggers: structural permanence):

**Full Persona Set Example:**

1. Minimalist Skeptic ("Isn't it too much?")
2. Pragmatic Integrator (Middle)
3. Maintainability Steward (Middle-Leaning)
4. Performance Maximizer (Middle-Leaning)
5. Rigor Maximalist ("It's still not enough")

**Challenge Matrix Template:** Track who challenged whom on what (ensures cross-examination rigor):

| Challenger | Target     | Challenge Topic    | Outcome                     |
| ---------- | ---------- | ------------------ | --------------------------- |
| Skeptic    | Pragmatic  | Scope creep risk   | Accepted, plan adjusted     |
| Skeptic    | Maximalist | Over-engineering   | Defended with E3            |
| Pragmatic  | Maximalist | Tooling dependency | Accepted, marked Unknown U2 |
| ...        | ...        | ...                | ...                         |

Use when audit trail is critical (e.g., compliance decisions, cross-org alignment).

**Full Logging Example:** See Worked-Example section; extend Opening Statements to 5 personas,
Cross-Exam to 3 challenges each (rotating pairs), Voting to 5 ballots. Synthesis remains same
structure. </Appendix-Full-Council-Variant>
