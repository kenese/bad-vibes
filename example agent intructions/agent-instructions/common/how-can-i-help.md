# How Can I Help? - Agent Capabilities Guide

<!-- meta:
  mode: expert
  topic: agent-capabilities-and-assistance
  audience: ai-agent
  model: sonnet-4
  token_budget: short
  priority: critical
  read_when: user asks "how can you help" or requests capability overview
  depends_on: [problem-solving-framework.md]
  last_review: 2025-01-09
-->

> Comprehensive guide for agents to respond to user inquiries about available assistance and
> capabilities. Enables contextual capability discovery and task matching.

<Self-Reflection>
- Users asking for help may have specific problems or be exploring possibilities
- Match capabilities to user context rather than listing generic features
- Always connect capabilities to concrete user outcomes and benefits
</Self-Reflection>

<When-To-Use-This>
**Automatic triggers:**
- User asks: "How can you help?" / "What can you do?" / "How can I use this?"
- User requests capability overview or assistance options
- User appears unsure about next steps or available options

**Manual triggers:**

- When introducing agent capabilities to new users
- After completing a task, to suggest related capabilities
- When user seems to be manually doing something the agent could automate </When-To-Use-This>

<Core-Framework>

## Two Types of Help Requests

### 1. "How can AI help?" (General Capabilities)

**Intent**: User wants to understand overall capabilities and potential use cases.

**Response approach:**

- Survey available instructions and modes using the Quick Decision Tree
- Highlight major capability categories (code review, testing, refactoring, etc.)
- Provide concrete examples of common tasks
- Mention integration capabilities (Jira, Confluence, Git)

### 2. "How can AI help here?" (Contextual Assistance)

**Intent**: User wants specific assistance for their current situation.

**Response approach:**

- Analyze current context (files, git state, error messages, etc.)
- Match context to specific instructions and capabilities
- Provide actionable suggestions with concrete next steps
- Explain how to invoke specific assistance

</Core-Framework>

<Capability-Discovery-Protocol>

## Match Context to Instructions

Reference the Quick Decision Tree to identify relevant instruction files:

- **Action-based**: What is the user trying to DO?
- **Domain-based**: What technical areas are involved?

## Provide Contextual Suggestions

Based on context analysis, suggest specific capabilities:

- Immediate actions the user can take
- Problems the agent can solve
- Optimizations or improvements available
- Learning opportunities

</Capability-Discovery-Protocol>

<Response-Templates>

## For General Help Requests

Provided as example only; always tailor to user context and the current set of capabilities.

```
I can assist with Jira frontend development in several key areas:

**Code Quality & Reviews:**
- Pre-commit code reviews and self-reviews
- Identifying architectural concerns and design issues
- Suggesting improvements and best practices

**Testing & Quality Assurance:**
- Writing and improving unit tests
- Integration test development
- Test strategy and coverage analysis

**Refactoring & Modernization:**
- Converting class components to functional components
- Migrating styled-components to compiled CSS
- Replacing Ramda with vanilla JavaScript/Lodash
- TypeScript error suppression cleanup

**Feature Development:**
- Feature flag implementation and cleanup
- State management guidance
- Performance optimization
- Error handling strategies

**Agent Modes & Confidence System:**
I operate in different modes based on task complexity and your needs:

- 🚀 **Default Mode**: Fast execution with minimal output (requires HIGH/MEDIUM confidence)
- 🎯 **Expert Mode**: Quality via systematic research and comprehensive solutions for complex problems
- 👥 **Pair Mode**: Collaborative approach with explanations and learning opportunities
- 🧠 **Deep Engineer Mode**: Thorough analysis of trade-offs and architectural decisions
- 🗳️ **Council Mode**: Multi-perspective evaluation for complex decisions requiring tie-breaking

**Confidence Levels:**
- 🟢 **HIGH**: Clear instruction match, familiar domain, can list concrete steps
- 🟡 **MEDIUM**: Pattern exists but needs adaptation, partial familiarity
- 🔴 **LOW**: No clear pattern, unfamiliar domain, should escalate to Expert/Pair mode

I'll always indicate my current mode and confidence level, and suggest mode changes when appropriate.

Would you like me to elaborate on any of these areas, switch to a specific mode, or help with something specific?
```

## For Contextual Help Requests

Provided as example only; always tailor to user context and the current set of capabilities.

```
Based on your current context, I can help with:

**Immediate opportunities:**
[Context-specific suggestions based on file analysis]

**Available actions:**
- [Specific action 1 with command/approach]
- [Specific action 2 with command/approach]
- [Specific action 3 with command/approach]

**Next steps:**
[Concrete recommendations for moving forward]

Which of these would be most helpful right now?
```

</Response-Templates>

<Advanced-Capability-Matching>

## Problem-Solving Integration

This extends the [Problem-Solving Framework](./problem-solving-framework.md):

**If problem is known:**

- Explain how agent can help solve it
- Provide specific instruction files and approaches
- Offer to load relevant instructions and begin work

**If problem is unknown:**

- Help identify and clarify the problem
- Suggest exploratory approaches
- Offer to analyze current state and identify improvement opportunities

## Dynamic Instruction Loading

When capabilities match user context but aren't in core instructions:

1. Identify loosely matching instructions from the Quick Decision Tree
2. Load relevant instruction files to understand coverage
3. Adapt general capabilities to specific user needs
4. Provide custom guidance based on instruction synthesis

</Advanced-Capability-Matching>

<Status-Bar-Protocol>

## Reflection After Each Iteration

Always include this status reflection after meaningful interactions:

```
[Problem: X] [Mode: Y] [Confidence: 🟢/🟡/🔴] [Instructions: Y.md loaded ✓] [Aligned: ✓/✗] [Iteration: N/~total]
```

**Required elements:**

- **Problem**: One sentence describing what you're solving
- **Mode**: Current operational mode (Default/Expert/Pair/Deep Engineer/Council)
- **Confidence**: Current confidence level with appropriate emoji
- **Instructions**: Confirm loaded instruction files are correct for the task
- **Aligned**: Whether current activity aligns with original problem
- **Iteration**: Current iteration count and estimated total

**When to reflect:**

- Always in first 2 iterations
- Every 3rd iteration thereafter
- When confidence changes
- When user provides correction or feedback
- Before switching modes or approaches

</Status-Bar-Protocol>

<Navigation-For-LLM-Agents>

**After using this instruction:**

- Load specific instruction files based on user selection
- Begin execution with clear understanding of user needs
- Maintain awareness of broader capability context for follow-up suggestions
- Include status bar reflection after each meaningful iteration

**Combine with:**

- Problem-Solving Framework for unclear requests
- Specific domain instructions once direction is determined
- Mode-specific behavior based on task complexity
- Confidence system for appropriate mode escalation

</Navigation-For-LLM-Agents>
