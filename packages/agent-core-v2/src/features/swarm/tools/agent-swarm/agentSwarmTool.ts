import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  ToolAccesses,
  type ExecutableToolContext,
  type ExecutableToolResult,
  type ToolExecution,
} from '#/tool/toolContract';
import { Error2, ErrorCodes } from '#/errors';
import { toInputJsonSchema } from '#/tool/input-schema';
import { IConfigService } from '#/app/config/config';
import { IFlagService } from '#/app/flag/flag';
import { ISessionSwarmService, type SessionSwarmTask } from '#/features/swarm/session/sessionSwarm';
import { IAgentProfileService } from '#/agent/profile/profile';
import { IAgentScopeContext } from '#/agent/scopeContext/scopeContext';
import { IAgentSwarmService } from '#/features/swarm/agent/swarm';
import { resolveSwarmTimeoutMs } from '#/features/swarm/configSection';
import { ISessionSubagentService } from '#/session/subagent/subagent';
import { ISessionContext } from '#/session/sessionContext/sessionContext';
import {
  FORK_EXPERIMENTAL_UNAVAILABLE,
  FORK_WITH_RESUME_UNAVAILABLE,
  forkIncompatibility,
  type SubagentSpawnPlan,
} from '#/session/subagent/spawn';
import { SUBAGENT_FORK_FLAG_ID } from '#/session/subagent/flag';
import {
  buildSubagentModelDescriptions,
  exposesSubagentModelChoice,
  stripSubagentForkParameter,
  stripSubagentModelParameter,
} from '#/session/subagent/configSection';
import {
  AgentSwarmToolInputSchema,
  IAgentSwarmTool,
  MAX_AGENT_SWARM_SUBAGENTS,
  PROMPT_TEMPLATE_PLACEHOLDER,
  type AgentSwarmToolInput,
  type SwarmItemEntry,
} from './agent-swarm';
import { matchPersonaForTask, type PersonaCard } from '#/persona';
import AGENT_SWARM_DESCRIPTION from './agent-swarm.md?raw';
import AGENT_SWARM_FORK_DESCRIPTION from './agent-swarm-fork.md?raw';

const DEFAULT_SUBAGENT_TYPE = 'coder';

const AGENT_SWARM_PARAMETERS = toInputJsonSchema(AgentSwarmToolInputSchema);
const AGENT_SWARM_PARAMETERS_NO_MODEL = stripSubagentModelParameter(AGENT_SWARM_PARAMETERS);

interface AgentSwarmSpawnSpec {
  readonly kind: 'spawn';
  readonly index: number;
  readonly item?: string;
  readonly personaName?: string;
  readonly prompt: string;
}

interface AgentSwarmResumeSpec {
  readonly kind: 'resume';
  readonly index: number;
  readonly agentId: string;
  readonly item?: string;
  readonly prompt: string;
}

type AgentSwarmSpec = AgentSwarmSpawnSpec | AgentSwarmResumeSpec;

interface SwarmRunResult {
  readonly spec: AgentSwarmSpec;
  readonly agentId?: string;
  readonly status: 'completed' | 'failed' | 'aborted';
  readonly state?: 'started' | 'not_started';
  readonly result?: string;
  readonly error?: string;
}

export class AgentSwarmTool implements IAgentSwarmTool {
  declare readonly _serviceBrand: undefined;
  readonly name = 'AgentSwarm' as const;

  get parameters(): Record<string, unknown> {
    const parameters = exposesSubagentModelChoice(this.config, this.flags)
      ? AGENT_SWARM_PARAMETERS
      : AGENT_SWARM_PARAMETERS_NO_MODEL;
    return this.flags.enabled(SUBAGENT_FORK_FLAG_ID)
      ? parameters
      : stripSubagentForkParameter(parameters);
  }

  private readonly callerAgentId: string;

  constructor(
    @ISessionSwarmService private readonly swarmService: ISessionSwarmService,
    @IAgentScopeContext scopeContext: IAgentScopeContext,
    @IAgentSwarmService private readonly swarmMode: IAgentSwarmService,
    @IConfigService private readonly config: IConfigService,
    @IFlagService private readonly flags: IFlagService,
    @ISessionSubagentService private readonly subagents: ISessionSubagentService,
    @IAgentProfileService private readonly profile: IAgentProfileService,
    @ISessionContext private readonly sessionContext: ISessionContext,
  ) {
    this.callerAgentId = scopeContext.agentId;
  }

  get description(): string {
    let description = AGENT_SWARM_DESCRIPTION;
    if (this.flags.enabled(SUBAGENT_FORK_FLAG_ID)) {
      description += `\n\n${AGENT_SWARM_FORK_DESCRIPTION}`;
    }
    const modelLines = buildSubagentModelDescriptions(
      this.config,
      this.flags,
      this.profile.data().modelAlias,
    );
    return modelLines === undefined ? description : `${description}\n\n${modelLines}`;
  }

  resolveExecution(args: AgentSwarmToolInput): ToolExecution {
    const agentCount =
      (args.items?.length ?? 0) +
      Object.keys(args.resume_agent_ids ?? {}).length +
      promptSpawnCount(args);
    return {
      accesses: ToolAccesses.all(),
      description: `Launching agent swarm: ${args.description}`,
      display: {
        kind: 'agent_call',
        agent_name: `swarm (${agentCount} subagents)`,
        prompt: args.description,
      },
      approvalRule: this.name,
      execute: (ctx) => this.execution(args, ctx),
    };
  }

  private async execution(
    args: AgentSwarmToolInput,
    context: ExecutableToolContext,
  ): Promise<ExecutableToolResult> {
    try {
      this.swarmMode.enter('tool');
      const result = await this.runSwarm(args, context.signal, context.toolCallId);
      return {
        output: result,
      };
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : String(error),
        isError: true,
      };
    }
  }

  private async runSwarm(
    args: AgentSwarmToolInput,
    signal: AbortSignal,
    toolCallId: string,
  ): Promise<string> {
    const fork = args.fork === true;
    if (fork && !this.flags.enabled(SUBAGENT_FORK_FLAG_ID)) {
      throw new Error2(ErrorCodes.VALIDATION_FAILED, FORK_EXPERIMENTAL_UNAVAILABLE);
    }
    if (fork && Object.keys(args.resume_agent_ids ?? {}).length > 0) {
      throw new Error2(ErrorCodes.VALIDATION_FAILED, FORK_WITH_RESUME_UNAVAILABLE);
    }
    let plan: SubagentSpawnPlan | undefined;
    if ((args.items?.length ?? 0) + promptSpawnCount(args) > 0) {
      if (fork) {
        const incompatible = forkIncompatibility(
          { subagent_type: args.subagent_type, model: args.model },
          this.profile.data(),
        );
        if (incompatible !== undefined) {
          throw new Error2(ErrorCodes.VALIDATION_FAILED, incompatible);
        }
      }
      plan = await this.subagents.planSpawn({
        callerAgentId: this.callerAgentId,
        profileName: args.subagent_type,
        model: args.model,
        fork,
      });
    }
    const profileName = plan?.profileName ?? DEFAULT_SUBAGENT_TYPE;
    const timeoutMs = resolveSwarmTimeoutMs(this.config);
    const personaCards = discoverPersonaCards(this.sessionContext.cwd);
    const specs = await createAgentSwarmSpecs(args, personaCards, (agentId) =>
      this.swarmService.getSwarmItem({ callerAgentId: this.callerAgentId, agentId }),
    );
    const tasks: SessionSwarmTask<AgentSwarmSpec>[] = specs.map((spec) => {
      const descriptionName = spec.kind === 'resume' ? 'resume' : profileName;
      const common = {
        data: spec,
        profileName: spec.kind === 'resume' ? 'subagent' : profileName,
        parentToolCallId: toolCallId,
        prompt: spec.prompt,
        description: childDescription(args.description, spec.index, descriptionName),
        swarmIndex: spec.index,
        runInBackground: false,
        swarmItem: spec.item,
        signal,
        timeout: timeoutMs,
      };
      if (spec.kind === 'resume') {
        return {
          ...common,
          kind: 'resume' as const,
          resumeAgentId: spec.agentId,
        };
      }
      return {
        ...common,
        kind: 'spawn' as const,
        plan: plan!,
      };
    });
    const results = await this.swarmService.run({
      callerAgentId: this.callerAgentId,
      tasks,
    });
    return renderSwarmResults(
      results.map(({ task, ...result }) => ({ spec: task.data, ...result })),
    );
  }
}

async function createAgentSwarmSpecs(
  args: AgentSwarmToolInput,
  personaCards: readonly PersonaCard[],
  getResumeItem: (agentId: string) => Promise<string | undefined>,
): Promise<AgentSwarmSpec[]> {
  const resumeEntries = Object.entries(args.resume_agent_ids ?? {}).map(([agentId, prompt]) => ({
    agentId: agentId.trim(),
    prompt: prompt.trim(),
  }));
  const items = (args.items ?? []).map((entry) => normalizeSwarmItemEntry(entry));
  const itemCount = items.length;
  const resumeCount = resumeEntries.length;
  const promptSpawns = promptSpawnCount(args);
  const totalCount = resumeCount + itemCount + promptSpawns;
  if (!hasMinimumAgentSwarmInputs(itemCount, resumeCount, promptSpawns)) {
    throw new Error2(
      ErrorCodes.VALIDATION_FAILED,
      'AgentSwarm requires at least 2 items, a prompt, or resume_agent_ids.',
    );
  }
  if (totalCount > MAX_AGENT_SWARM_SUBAGENTS) {
    throw new Error2(
      ErrorCodes.VALIDATION_FAILED,
      `AgentSwarm supports at most ${String(MAX_AGENT_SWARM_SUBAGENTS)} subagents.`,
      { details: { total: totalCount, max: MAX_AGENT_SWARM_SUBAGENTS } },
    );
  }
  const promptTemplate =
    normalizeOptionalString(args.prompt_template) ??
    (itemCount > 0 ? normalizeOptionalString(args.prompt) : undefined);
  if (items.length > 0 && promptTemplate === undefined) {
    throw new Error2(
      ErrorCodes.VALIDATION_FAILED,
      'prompt_template is required when items are provided.',
    );
  }
  if (promptTemplate !== undefined && !promptTemplate.includes(PROMPT_TEMPLATE_PLACEHOLDER)) {
    throw new Error2(
      ErrorCodes.VALIDATION_FAILED,
      `prompt_template must include the ${PROMPT_TEMPLATE_PLACEHOLDER} placeholder.`,
      { details: { placeholder: PROMPT_TEMPLATE_PLACEHOLDER } },
    );
  }

  const seenPrompts = new Map<string, number>();
  const specs: AgentSwarmSpec[] = [];
  for (const entry of resumeEntries) {
    specs.push({
      kind: 'resume',
      index: specs.length + 1,
      agentId: entry.agentId,
      item: await getResumeItem(entry.agentId),
      prompt: entry.prompt,
    });
  }
  if (items.length > 0) {
    const itemPromptTemplate = promptTemplate!;
    items.forEach(({ item, personaName }, index) => {
      let prompt = itemPromptTemplate.split(PROMPT_TEMPLATE_PLACEHOLDER).join(item);
      let resolvedPersonaName: string | undefined;
      const persona = resolvePersona(personaName, item, personaCards);
      if (persona !== undefined) {
        resolvedPersonaName = persona.name;
        prompt = `${persona.content}\n\n${prompt}`;
      }
      const previousIndex = seenPrompts.get(prompt);
      if (previousIndex !== undefined) {
        throw new Error2(
          ErrorCodes.VALIDATION_FAILED,
          `Duplicate subagent prompts from items ${String(previousIndex)} and ${String(index + 1)}. AgentSwarm requires distinct subagents.`,
          { details: { previousIndex, index: index + 1 } },
        );
      }
      seenPrompts.set(prompt, index + 1);
      specs.push({
        kind: 'spawn',
        index: specs.length + 1,
        item,
        personaName: resolvedPersonaName,
        prompt,
      });
    });
  }
  if (promptSpawns > 0) {
    const prompt = args.prompt!.trim();
    const previousIndex = seenPrompts.get(prompt);
    if (previousIndex !== undefined) {
      throw new Error2(
        ErrorCodes.VALIDATION_FAILED,
        `Duplicate subagent prompt from prompt and item ${String(previousIndex)}. AgentSwarm requires distinct subagents.`,
        { details: { previousIndex } },
      );
    }
    specs.push({
      kind: 'spawn',
      index: specs.length + 1,
      prompt,
    });
  }
  return specs;
}

function promptSpawnCount(args: AgentSwarmToolInput): number {
  if (args.prompt === undefined) return 0;
  if ((args.items?.length ?? 0) > 0) return 0;
  if (Object.keys(args.resume_agent_ids ?? {}).length > 0) return 0;
  return 1;
}

function hasMinimumAgentSwarmInputs(
  itemCount: number,
  resumeCount: number,
  promptSpawns: number,
): boolean {
  return resumeCount > 0 || itemCount >= 2 || promptSpawns > 0;
}

function childDescription(swarmDescription: string, index: number, profileName: string): string {
  return `${swarmDescription} #${String(index)} (${profileName})`;
}

function renderSwarmResults(results: readonly SwarmRunResult[]): string {
  const completed = results.filter((result) => result.status === 'completed').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  const aborted = results.filter((result) => result.status === 'aborted').length;
  const shouldRenderResumeHint =
    results.some((result) => result.status !== 'completed') &&
    results.some((result) => result.agentId !== undefined);
  const lines = [
    '<agent_swarm_result>',
    `<summary>${renderSwarmSummary(completed, failed, aborted)}</summary>`,
  ];

  if (shouldRenderResumeHint) {
    lines.push(
      '<resume_hint>Call AgentSwarm with resume_agent_ids using the agent_id values in this result to continue unfinished work.</resume_hint>',
    );
  }

  for (const result of results) {
    const agentId = result.agentId === undefined ? '' : ` agent_id="${result.agentId}"`;
    const mode = result.spec.kind === 'resume' ? ' mode="resume"' : '';
    const item = result.spec.item === undefined ? '' : ` item="${escapeXmlAttribute(result.spec.item)}"`;
    const persona = result.spec.kind === 'spawn' && result.spec.personaName !== undefined ? ` persona="${escapeXmlAttribute(result.spec.personaName)}"` : '';
    const state = result.state === undefined ? '' : ` state="${result.state}"`;
    const body = result.status === 'completed' ? (result.result ?? '') : (result.error ?? 'unknown error');
    lines.push(
      `<subagent${mode}${agentId}${item}${persona}${state} outcome="${result.status}">${body}</subagent>`,
    );
  }

  lines.push('</agent_swarm_result>');
  return lines.join('\n');
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function renderSwarmSummary(completed: number, failed: number, aborted = 0): string {
  const parts: string[] = [];
  if (completed > 0) parts.push(`completed: ${String(completed)}`);
  if (failed > 0) parts.push(`failed: ${String(failed)}`);
  if (aborted > 0) parts.push(`aborted: ${String(aborted)}`);
  return parts.join(', ');
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function normalizeSwarmItemEntry(
  entry: SwarmItemEntry,
): { item: string; personaName: string | undefined } {
  if (typeof entry === 'string') {
    return { item: entry, personaName: undefined };
  }
  return { item: entry.item, personaName: entry.persona };
}

export function resolvePersona(
  explicitPersonaName: string | undefined,
  taskDescription: string,
  cards: readonly PersonaCard[],
): PersonaCard | undefined {
  if (cards.length === 0) return undefined;
  if (explicitPersonaName !== undefined) {
    const lowerName = explicitPersonaName.toLowerCase();
    return cards.find(
      (card) =>
        card.name.toLowerCase() === lowerName ||
        card.name.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerName.replace(/[^a-z0-9]/g, ''),
    );
  }
  return matchPersonaForTask(taskDescription, cards);
}

function discoverPersonaCards(workspaceCwd: string): readonly PersonaCard[] {
  const cards: PersonaCard[] = [];
  const personaDirs = [
    join(workspaceCwd, '.agents', 'personas'),
    join(homedir(), '.nighthawk', 'personas'),
  ];
  for (const dir of personaDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        try {
          const filePath = join(dir, file);
          const content = readFileSync(filePath, 'utf-8');
          const name = file.replace(/\.md$/, '').toLowerCase();
          const lines = content.split('\n');
          const description = lines.length > 0 ? lines[0]!.replace(/^#\s*/, '').trim() : name;
          cards.push({
            name,
            description,
            path: filePath,
            content,
          });
        } catch {
          void 0;
        }
      }
    } catch {
      void 0;
    }
  }
  return cards;
}
