Launch multiple subagents from one prompt template, existing agent resumes, or both.

Use AgentSwarm when many subagents should run the same kind of task over different inputs. The placeholder is exactly `{{item}}`. For example, with `prompt_template` set to `Review {{item}} for likely regressions.` and `items` set to `["src/a.ts", "src/b.ts"]`, AgentSwarm launches two new subagents with those two concrete prompts. For a few differently-shaped tasks, make separate `Agent` calls in one message instead.

Use `prompt` to launch exactly one subagent when `items` and `resume_agent_ids` are omitted, or as the prompt template fallback when `items` are present but `prompt_template` is omitted (it must then contain `{{item}}`).

Use `resume_agent_ids` to continue subagents that already exist from earlier work, such as ones that failed or timed out: map each agent id to the prompt for that resumed subagent (usually `continue` if no extra information is needed). You may combine `resume_agent_ids` with `items` in the same call to resume existing subagents and launch new ones. Do not duplicate resumed work in `items`.

Each of these is enforced — a violation is rejected before any subagent starts: provide at least 2 `items` unless you pass `resume_agent_ids`; whenever `items` are present, `prompt_template` is required and must contain `{{item}}`; and the filled-in prompts must be distinct (two items that expand to the same prompt are rejected).

Use enough subagents to keep the work focused and parallel. AgentSwarm supports up to 2000 subagents, and launches are queued automatically, so it is safe to split large tasks into many clear, independent items.

If `AgentSwarm` is called, that call must be the only tool call in the response.

## CRITICAL: One swarm at a time

**Never call `AgentSwarm` more than once in a single response.** This is enforced at runtime and multiple calls will be vetoed. To run 100 tasks in parallel, put all 100 in one `AgentSwarm` call's `items` array — do NOT make 10 separate `AgentSwarm` calls. If you need to do work across multiple phases, call one `AgentSwarm`, wait for it to complete, then call the next in a subsequent response.

Wrong:
```
AgentSwarm(description="tasks for group A", items=["a1","a2"])
AgentSwarm(description="tasks for group B", items=["b1","b2"])  ← VETOED
```

Correct:
```
AgentSwarm(description="all tasks", items=["a1","a2","b1","b2"])  ← works
```
