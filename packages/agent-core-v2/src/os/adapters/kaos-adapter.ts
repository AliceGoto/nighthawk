import type { Kaos } from '@nighthawk/kaos';
import type { TextDecodeErrors } from '#/_base/execEnv/decodeText';
import type { HostDirEntry, HostFileStat, IHostFileSystem } from '#/os/interface/hostFileSystem';
import type { HostEnvironmentInfo, IHostEnvironment, OsKind, PathClass, ShellName } from '#/os/interface/hostEnvironment';
import type { HostProcessOptions, IHostProcess, IHostProcessService } from '#/os/interface/hostProcess';
import { HostFsError, OsFsErrors } from '#/os/interface/hostFsErrors';

export class KaosHostFileSystemAdapter implements IHostFileSystem {
  declare readonly _serviceBrand: undefined;

  constructor(private readonly kaos: Kaos) {}

  async readText(
    path: string,
    options?: { encoding?: BufferEncoding; errors?: TextDecodeErrors },
  ): Promise<string> {
    try {
      return await this.kaos.readText(path, options as { encoding?: BufferEncoding; errors?: 'strict' | 'replace' | 'ignore' });
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'read' });
    }
  }

  async writeText(path: string, data: string): Promise<void> {
    try {
      await this.kaos.writeText(path, data);
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'write' });
    }
  }

  async appendText(path: string, data: string): Promise<void> {
    try {
      await this.kaos.writeText(path, data, { mode: 'a' });
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'append' });
    }
  }

  async readBytes(path: string, n?: number, offset?: number): Promise<Uint8Array> {
    try {
      const buf = await this.kaos.readBytes(path, n !== undefined && offset === undefined ? n : undefined);
      if (offset !== undefined && offset > 0) {
        return buf.subarray(offset);
      }
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'read' });
    }
  }

  async writeBytes(path: string, data: Uint8Array): Promise<void> {
    try {
      await this.kaos.writeBytes(path, Buffer.from(data));
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'write' });
    }
  }

  async *readLines(
    path: string,
    options?: { encoding?: BufferEncoding; errors?: TextDecodeErrors },
  ): AsyncGenerator<string> {
    try {
      yield* this.kaos.readLines(path, options as { encoding?: BufferEncoding; errors?: 'strict' | 'replace' | 'ignore' });
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'read' });
    }
  }

  async createExclusive(path: string, data: Uint8Array): Promise<boolean> {
    try {
      await this.kaos.stat(path);
      return false;
    } catch {
      try {
        await this.kaos.writeBytes(path, Buffer.from(data));
        return true;
      } catch {
        return false;
      }
    }
  }

  async stat(path: string): Promise<HostFileStat> {
    try {
      const s = await this.kaos.stat(path);
      return statResultToHostFileStat(s);
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'stat' });
    }
  }

  async lstat(path: string): Promise<HostFileStat> {
    try {
      const s = await this.kaos.stat(path, { followSymlinks: false });
      return statResultToHostFileStat(s);
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'lstat' });
    }
  }

  async readdir(path: string): Promise<readonly HostDirEntry[]> {
    const entries: HostDirEntry[] = [];
    try {
      const sep = this.kaos.pathClass() === 'win32' ? '\\' : '/';
      for await (const name of this.kaos.iterdir(path)) {
        let isFile = false;
        let isDirectory = false;
        let isSymbolicLink: boolean | undefined;
        try {
          const s = await this.kaos.stat(`${path}${sep}${name}`);
          isFile = (s.stMode & 0o170000) === 0o100000;
          isDirectory = (s.stMode & 0o170000) === 0o040000;
          isSymbolicLink = (s.stMode & 0o170000) === 0o120000;
        } catch {
          void 0;
        }
        entries.push({ name, isFile, isDirectory, isSymbolicLink });
      }
      return entries;
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'readdir' });
    }
  }

  async mkdir(path: string, options?: { readonly recursive?: boolean }): Promise<void> {
    try {
      await this.kaos.mkdir(path, { parents: options?.recursive, existOk: true });
    } catch (error) {
      throw toKaosFsError(error, { path, op: 'mkdir' });
    }
  }

  async remove(path: string): Promise<void> {
    const proc = await this.kaos.exec('rm', '-rf', path);
    const exitCode = await proc.wait();
    if (exitCode !== 0) {
      throw new HostFsError(OsFsErrors.codes.OS_FS_UNKNOWN, `remove failed for ${path}`, { details: { path, op: 'remove' } });
    }
  }

  async realpath(path: string): Promise<string> {
    const proc = await this.kaos.exec('realpath', path);
    const output = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.stdout.on('end', () => resolve(Buffer.concat(chunks).toString().trim()));
      proc.stdout.on('error', reject);
    });
    const exitCode = await proc.wait();
    if (exitCode !== 0) {
      throw new HostFsError(OsFsErrors.codes.OS_FS_NOT_FOUND, `realpath failed: ${path}`, { details: { path, op: 'realpath' } });
    }
    return output;
  }
}

export class KaosHostProcessAdapter implements IHostProcessService {
  declare readonly _serviceBrand: undefined;

  constructor(private readonly kaos: Kaos) {}

  async spawn(command: string, args?: readonly string[], options?: HostProcessOptions): Promise<IHostProcess> {
    let kaos = this.kaos;
    if (options?.cwd !== undefined) {
      kaos = kaos.withCwd(options.cwd);
    }
    if (options?.env !== undefined) {
      return kaos.execWithEnv([command, ...(args ?? [])], options.env) as unknown as IHostProcess;
    }
    return kaos.exec(command, ...(args ?? [])) as unknown as IHostProcess;
  }
}

export class KaosHostEnvironment implements IHostEnvironment {
  declare readonly _serviceBrand: undefined;
  readonly ready: Promise<void> = Promise.resolve();

  constructor(private readonly kaos: Kaos) {}

  get osKind(): OsKind {
    return this.kaos.osEnv.osKind;
  }

  get osArch(): string {
    return this.kaos.osEnv.osArch;
  }

  get osVersion(): string {
    return this.kaos.osEnv.osVersion;
  }

  get shellName(): ShellName {
    return this.kaos.osEnv.shellName;
  }

  get shellPath(): string {
    return this.kaos.osEnv.shellPath;
  }

  get pathClass(): PathClass {
    return this.kaos.pathClass() as PathClass;
  }

  get homeDir(): string {
    return this.kaos.gethome();
  }
}

export function kaosEnvironmentToInfo(kaos: Kaos): HostEnvironmentInfo {
  return {
    osKind: kaos.osEnv.osKind,
    osArch: kaos.osEnv.osArch,
    osVersion: kaos.osEnv.osVersion,
    shellName: kaos.osEnv.shellName,
    shellPath: kaos.osEnv.shellPath,
    pathClass: kaos.pathClass() as PathClass,
    homeDir: kaos.gethome(),
  };
}

function statResultToHostFileStat(s: { stMode: number; stSize: number; stMtime: number; stIno: number }): HostFileStat {
  return {
    isFile: (s.stMode & 0o170000) === 0o100000,
    isDirectory: (s.stMode & 0o170000) === 0o040000,
    isSymbolicLink: (s.stMode & 0o170000) === 0o120000,
    size: s.stSize,
    mtimeMs: s.stMtime * 1000,
    ino: s.stIno,
  };
}

function toKaosFsError(error: unknown, ctx: { path: string; op: string }): HostFsError {
  if (error instanceof HostFsError) return error;
  return new HostFsError(OsFsErrors.codes.OS_FS_UNKNOWN, `${ctx.op} failed on ${ctx.path}`, {
    details: ctx,
    cause: error,
  });
}