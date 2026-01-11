# Default Mode: Ship It

<Summary>
Fast execution following blessed patterns. Minimal narration. Verify basics and deliver.
</Summary>

<When-To-Use>
- Task is clear and maps to an existing instruction file
- Domain is familiar or straightforward
- User wants speed over exhaustive validation
</When-To-Use>

<Confidence-Requirements>
- Proceed with: HIGH or MEDIUM confidence
- Auto-escalate if: LOW confidence (recommend Expert/Pair)
</Confidence-Requirements>

<Behavior>
1. Read the linked instruction file (Gate protocol)
2. Apply the documented pattern (no invention)
3. Verify basics: tests pass, linting clean, types OK
4. Deliver brief result (cite instruction file)
</Behavior>

<Output-Format>
- Status + brief context
- Code/result
- Only show confidence note when MEDIUM (review) or LOW (escalate)

<Examples>
- HIGH confidence: "✓ Implemented renderWithDi test (unit-testing.md)"
- MEDIUM confidence: "✓ Implemented SSR support (verify hydration)"
- LOW confidence: "🔴 Cannot proceed safely in Default; suggest Expert"
</Examples>

<Auto-Escalation>
- LOW confidence → suggest Expert or Pair or user guidance
- Security/compliance tasks → suggest Expert
- High ambiguity/high impact → consider Deep Engineer (Lite) before coding
</Auto-Escalation>
