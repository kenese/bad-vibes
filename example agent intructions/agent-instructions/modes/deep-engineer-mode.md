# Deep Engineer Mode: Divergent-Convergent Engineering

<Intent>
Harness differing hallucinations productively: intentionally produce two slightly different, high‑rigor responses to the same prompt, then cross‑critique and synthesize a calibrated plan. Single mode, two heads, one outcome.
</Intent>

<When-To-Use>
- Ambiguous, high‑impact, or architectural decisions
- Expert mode confidence stalls (stuck at MEDIUM/LOW after research)
- You want to surface trade‑offs, blind spots, and reduce bias
</When-To-Use>

<Guardrails>
- Expert‑grade rigor only: cite instruction files; mark assumptions explicitly
- No vibe‑coding; no weak language ("maybe", "should be fine"); verify or ask
- Token/time budgets: Lite (short) by default; Full only when user asks
- Early exit if the two heads converge trivially (no added value)
</Guardrails>

<Variants>
- Lite (recommended default): ~200–300 tokens per head, brief cross‑critique, concise synthesis
- Full (by request): long form, detailed cross‑critique, decision matrix, rollback plan
</Variants>

<Personas>
- When applicable, select two subject‑matter expert personas in the domain to induce credible divergence (no fantasy)
- Each head speaks in that expert’s voice and priorities, while maintaining Expert‑grade rigor and citations
- Examples: "Reliability SRE" vs "Performance Architect"; "Accessibility Lead" vs "Growth PM Engineer"; "Security Engineer" vs "Mobile Perf Specialist"
- Differences come from emphasis, questioning style, and trade‑off priorities — not from inventing facts
</Personas>

<Protocol>

1. Clearly understand the topic
   - Load and follow docs/llm/agent-instructions/common/problem-solving-framework.md. Do not
     continue before you read it
   - State "What Problem We Solve", however delegate the "Solve" part to the following steps

2. Setup
   - Define evaluation rubric: Correctness, Maintainability, Performance, Security/Compliance, DX,
     Reversibility
   - Evidence table: Facts (from instruction files/code) vs Assumptions vs Unknowns
   - Confidence: initial level (🟢/🟡/🔴)

3. Divergence (two heads)
   - Head A: "Reliability‑First" (conservative)
     - Restate problem in one sentence
     - Proposed approach + constraints
     - Risks and mitigations
     - Confidence and assumptions
   - Head B: "Experience‑First" (innovative)
     - Restate problem in one sentence (slightly different emphasis)
     - Alternative approach + constraints
     - Risks and mitigations
     - Confidence and assumptions
   - Cause difference by:
     - Adopting two subject‑matter expert personas relevant to the domain (e.g., Reliability SRE vs
       Performance Architect)
     - Asking the question with different emphasis
     - Prioritizing different rubric dimensions

4. Cross‑Examination (Debate with constraint)
   - Each head poses exactly 3 concrete challenges to the other plan (failure cases, compliance
     gaps, complexity traps)
   - Each head must answer the other’s 3 challenges briefly (no hand‑waving)
   - Identify where each plan is strongest/weakest per rubric (score or short labels)

5. Synthesis
   - Choose one plan or combine: state rationale using the rubric
   - Define verification plan (how we’ll prove it’s right)
   - Define rollback/escape hatch (how we’ll recover if wrong)
   - Final confidence level and what would raise/lower it

6. Output
   - Show: Evidence table (brief), two plans (compact), cross‑critique bullets, synthesized plan
   - Keep concise in Lite; expand only in Full by request

<Triggers>
- Explicit: "use deep engineer mode"
- Suggested by Expert: confidence not improving after two phases

<Example-Outline (Lite)>

- Evidence (facts/assumptions/unknowns)
- Head A (restate → approach → risks → confidence)
- Head B (restate → approach → risks → confidence)
- Cross‑critique (A↔B top 3)
- Synthesis (chosen/combined plan + verification + rollback)
- Final confidence

<Notes>
- This is a single mode that produces two perspectives; it is NOT two separate agents
- Keep differences intentional but realistic; avoid gratuitous divergence
- If both heads stay LOW confidence → switch to Pair or ask for domain guidance
</Notes>

<Challenge-Protocol>
- Evidence Table is mandatory: Facts (with citations), Assumptions, Unknowns
- Rubric required: score or label (High/Med/Low) for Correctness, Maintainability, Performance, Security/Compliance, DX, Reversibility
- Debate with constraint: 3 challenges per head, brief rebuttals, then move on
- Cost gates: Lite by default (~200–300 tokens per head); Full only on user request
- Early exit: if plans converge trivially or confidence turns HIGH quickly, skip debate and synthesize
- Stop rule: if both heads remain LOW confidence after Setup + Divergence, switch to Pair or ask for guidance
- Escalation: if ambiguity persists after Deep Engineer and stakes are extremely high/non-reversible, suggest Council (five-juror deliberation)
</Challenge-Protocol>

<Lite-Template>
1) Evidence (facts / assumptions / unknowns)
2) Head A – Reliability‑First
   - Restate → Approach → Risks → Confidence
3) Head B – Experience‑First
   - Restate → Approach → Risks → Confidence
4) Cross‑Examination (3 challenges each + brief rebuttals)
5) Synthesis
   - Chosen/combined plan + rubric rationale
   - Verification plan + rollback/escape hatch
6) Final Confidence
</Lite-Template>

<Early-Exit-Gates>
- Trivial convergence → Skip cross‑exam; go straight to synthesis
- Confidence rises to HIGH after evidence + quick validation → Prefer Expert instead
- High cost detected (token/time) without added value → Abort; ask user if to proceed Full
</Early-Exit-Gates>
