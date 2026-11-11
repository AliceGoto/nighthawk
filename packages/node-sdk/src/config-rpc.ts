import { resolveConfigPath } from '@nighthawk/agent-core-v2';
import { z } from 'zod';

import { parseConfigString } from '#/config/index';
import { ErrorCodes, NightHawkError } from '#/errors';

export type NightHawkConfigValidationPathSegment = string | number;

export interface NightHawkConfigValidationIssue {
  readonly path: readonly NightHawkConfigValidationPathSegment[];
  readonly message: string;
}

export interface ResolveNightHawkConfigPathInput {
  readonly homeDir?: string | undefined;
  readonly configPath?: string | undefined;
}

export interface ValidateNightHawkConfigTomlInput {
  readonly text: string;
  readonly filePath?: string | undefined;
}

export interface NightHawkConfigRpc {
  resolveConfigPath(input?: ResolveNightHawkConfigPathInput): Promise<string>;
  validateConfigToml(input: ValidateNightHawkConfigTomlInput): Promise<void>;
}

export class NightHawkConfigRpcClient implements NightHawkConfigRpc {
  async resolveConfigPath(input: ResolveNightHawkConfigPathInput = {}): Promise<string> {
    return resolveConfigPath(input);
  }

  async validateConfigToml(input: ValidateNightHawkConfigTomlInput): Promise<void> {
    try {
      parseConfigString(input.text, input.filePath);
    } catch (error) {
      const validationIssues = extractValidationIssues(error);
      if (validationIssues !== undefined) {
        throw toConfigValidationError(error, validationIssues);
      }
      throw error;
    }
  }
}

export function createNightHawkConfigRpc(): NightHawkConfigRpc {
  return new NightHawkConfigRpcClient();
}

function toConfigValidationError(
  error: unknown,
  validationIssues: readonly NightHawkConfigValidationIssue[],
): NightHawkError {
  const details =
    error instanceof NightHawkError && error.details !== undefined
      ? { ...error.details, validationIssues }
      : { validationIssues };

  if (error instanceof NightHawkError) {
    return new NightHawkError(error.code, error.message, { details });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new NightHawkError(ErrorCodes.CONFIG_INVALID, message, { details });
}

function extractValidationIssues(error: unknown): readonly NightHawkConfigValidationIssue[] | undefined {
  const zodError = findZodError(error);
  if (zodError === undefined) return undefined;
  return zodError.issues.map((issue) => ({
    path: issue.path.map((segment) =>
      typeof segment === 'number' ? segment : String(segment),
    ),
    message: issue.message,
  }));
}

function findZodError(error: unknown): z.ZodError | undefined {
  if (error instanceof z.ZodError) return error;
  if (error instanceof Error && error.cause instanceof z.ZodError) return error.cause;
  return undefined;
}
