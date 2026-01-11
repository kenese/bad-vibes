<!-- meta:
  mode: deep engineer
  topic: problem-solving-framework
  audience: ai-agent
  model: sonnet-4
  token_budget: short
  priority: critical
  read_when: agent appears off-track, confused, or user signals "stop and think"
  depends_on: []
  last_review: 2025-01-09
-->

# Problem-Solving Framework

> Meta-cognitive framework for agents to verify they're solving the right problem in the right way.
> Based on https://dev.to/thekashey/what-problem-we-solve-21no

<Self-Reflection>
- Before solving, understand WHAT you're solving and WHY
- Every iteration should advance toward a clear problem statement
- If you can't articulate the problem in one sentence, stop and clarify
</Self-Reflection>

<When-To-Use-This>
**Automatic triggers:**
- User says: "What are you doing?" / "Stop" / "Are you sure?" / "This is wrong"
- You've spent >5 iterations without user checkpoint
- You're uncertain about the approach
- Multiple possible solutions and unclear which to choose

**Manual triggers:**

- Before starting any substantial work (>3 iterations expected)
- When switching between different approaches
- After receiving correction or feedback </When-To-Use-This>

<Core-Framework>

Stop and ask yourself these five questions:

## 1. **What** problem we solve?

- Is there a real need to solve THIS problem?
- Does anyone actually need this solution?
- Is this problem worth solving NOW?

## 2. **Which** problem we solve?

- What are the different kinds/variants of this problem?
- Which specific variant am I addressing?
- Who is solving the other variants?

## 3. What **Problem** we solve?

- Is it actually a problem (not just a preference)?
- Will anyone be happy when it's resolved?
- Is it measurable/verifiable when solved?

## 4. What problem **We** solve?

- Am I the right agent/tool for this?
- Do I have what I need to solve it?
- Should another team/person handle this instead?

## 5. What problem we **Solve**?

- Do I know what "solved" looks like?
- Can I measure/verify the solution?
- Am I solving it completely or just improving it?

</Core-Framework>

<Quick-Application>

**Before starting work:**

```
Problem: [One sentence - what am I solving?]
For whom: [Who needs this solved?]
Success: [How do I know it's solved?]
```

**When stuck or off-track:**

```
Current activity: [What am I doing right now?]
Original problem: [What was I supposed to solve?]
Alignment: [Does current activity solve original problem?]
Action: [Continue / Pivot / Ask user]
```

**After user correction:**

```
What I misunderstood: [The problem/approach I got wrong]
Actual problem: [What I should be solving]
Next step: [How I'll proceed correctly]
```

</Quick-Application>

<Integration-With-Execution-Verification>

This framework complements the `Execution Verification` protocol:

**Execution Verification asks:** "Am I following the right instructions?" **Problem-Solving
Framework asks:** "Am I solving the right problem?"

Use both together:

1. Problem-Solving Framework → Define what to solve
2. Execution Verification → Verify you're solving it correctly

</Integration-With-Execution-Verification>

<Common-Failure-Modes>

**❌ Going off-track:**

- Symptom: Many iterations without progress or user feedback
- Fix: Stop, state the problem in one sentence, ask user to confirm

**❌ Solving the wrong problem:**

- Symptom: User says "this isn't what I asked for"
- Fix: Use "After user correction" template above

**❌ Over-engineering:**

- Symptom: Creating complex solutions for simple problems
- Fix: Ask "What **Problem** we solve?" (Is it really a problem?)

**❌ Unclear success criteria:**

- Symptom: Don't know when to stop or what "done" means
- Fix: Ask "What problem we **Solve**?" (Define measurable success)

</Common-Failure-Modes>

<Navigation-For-LLM-Agents>

**Use this framework BEFORE:**

- Starting any multi-iteration work
- Writing code or tests
- Making architectural decisions

**Combine with:**

- `.agent.md` - Execution Verification protocol
- Specific domain instructions (after defining the problem)

**After using this framework:**

- Proceed to domain-specific instructions (unit-testing.md, etc.)
- Continue with clear problem statement in mind

</Navigation-For-LLM-Agents>
