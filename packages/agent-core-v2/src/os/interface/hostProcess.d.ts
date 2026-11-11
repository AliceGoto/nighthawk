import type { Readable, Writable } from 'node:stream';
import { Error2, type Error2Options } from '#/_base/errors/errors';
import { type ServiceIdentifier } from '#/_base/di/instantiation';
export interface HostProcessOptions {
    readonly cwd?: string;
    readonly env?: Record<string, string>;
    readonly shell?: boolean | string;
    readonly detached?: boolean;
    readonly windowsHide?: boolean;
    readonly mergeStderr?: boolean;
    readonly timeout?: number;
}
export interface IHostProcess {
    readonly _serviceBrand: undefined;
    readonly pid: number;
    readonly exitCode: number | null;
    readonly stdin: Writable;
    readonly stdout: Readable;
    readonly stderr: Readable;
    wait(): Promise<number>;
    kill(signal?: NodeJS.Signals): Promise<void>;
    dispose(): void | Promise<void>;
}
export interface IHostProcessService {
    readonly _serviceBrand: undefined;
    spawn(command: string, args?: readonly string[], options?: HostProcessOptions): Promise<IHostProcess>;
}
export declare const IHostProcessService: ServiceIdentifier<IHostProcessService>;
export declare const OsProcessErrors: {
    readonly codes: {
        readonly OS_PROCESS_SPAWN_FAILED: 'os.process.spawn_failed';
        readonly OS_PROCESS_KILL_FAILED: 'os.process.kill_failed';
        readonly SHELL_GIT_BASH_NOT_FOUND: 'shell.git_bash_not_found';
    };
    readonly info: {
        readonly 'os.process.spawn_failed': {
            readonly title: 'Failed to spawn process';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check that the command exists and is executable.';
        };
        readonly 'os.process.kill_failed': {
            readonly title: 'Failed to kill process';
            readonly retryable: false;
            readonly public: true;
        };
        readonly 'shell.git_bash_not_found': {
            readonly title: 'Git Bash not found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Install Git for Windows so shell commands can run under Git Bash.';
        };
    };
};
export declare const HostProcessErrorCode: {
    readonly SpawnFailed: "os.process.spawn_failed";
    readonly KillFailed: "os.process.kill_failed";
    readonly ShellGitBashNotFound: "shell.git_bash_not_found";
};
export type HostProcessErrorCode = (typeof HostProcessErrorCode)[keyof typeof HostProcessErrorCode];
export declare class HostProcessError extends Error2 {
    constructor(code: HostProcessErrorCode, message: string, options?: Error2Options);
}
