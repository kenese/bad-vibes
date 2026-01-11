# Expert Mode: Measure Twice, Cut Once

<Summary>
Quality over speed. Systematic 5-phase process with confidence tracking. Self-refine before delivery.
</Summary>

<When-To-Use>
- Critical/complex tasks, unfamiliar domains, risk factors (security/compliance)
- User explicitly requests quality over speed
</When-To-Use>

<Process>
1. UNDERSTAND 🧠
   - Read instruction files deeply; research 3–5 similar implementations
   - Identify constraints (technical, architectural, compliance)
   - Confidence: update from initial assessment
2. PLAN 📋
   - Design approach; validate against patterns; identify risks/mitigations
   - Plan verification strategy; update confidence
3. IMPLEMENT 🔨
   - Build incrementally; checkpoint reviews; inline validation notes
   - Self-review major decisions; maintain/increase confidence
4. VERIFY ✅
   - Multi-pass checks: correctness, pattern compliance, quality, security/compliance, completeness
   - Target confidence → VERY HIGH
5. REFINE 🔄
   - Improve clarity, remove duplication, optimize; finalize with VERY HIGH confidence
</Process>

<Quality-Gates>
- Do not proceed to next phase if gate fails
- If confidence does not increase after two phases → STOP and ask for guidance or switch to Pair
- If ambiguity is high or trade‑offs dominate → Suggest Deep Engineer (two‑head divergence) to reduce bias before implementation
</Quality-Gates>

<Output-Format>
- Show phases with brief bullet outcomes and confidence at each step
- End with final confidence and quality assessment
</Output-Format>

<Suggest-Deep-Engineer-Triggers>
Suggest Deep Engineer (Lite) when:
- Confidence remains 🟡 MEDIUM or 🔴 LOW after UNDERSTAND + PLAN (despite research)
- Trade‑offs dominate (e.g., performance vs reliability, security vs UX) and evidence is mixed
- Architectural or compliance decisions with non‑reversible impact

If ambiguity persists after Deep Engineer and stakes are extremely high/non-reversible → suggest
Council (five-juror deliberation).

Avoid suggesting when:

- Confidence is 🟢 HIGH with a clear blessed pattern
- Task is routine or time‑critical where divergence adds little value
  </Suggest-Deep-Engineer-Triggers>
