// ═══════════════════════════════════════════════════════════════════
// 主题系统 — 照搬 nighthawk 的 pi-tui-theme 适配层
// 所有颜色经由 currentTheme 单例读取，切换主题即时生效
// ═══════════════════════════════════════════════════════════════════
import chalk from 'chalk';
import type { MarkdownTheme, EditorTheme } from '@nighthawk/pi-tui';
import { highlight, supportsLanguage } from 'cli-highlight';

export interface Palette {
  primary: string; accent: string; border: string;
  text: string; textMuted: string; textDim: string;
  success: string; warning: string; danger: string;
  banner: string[];
}

const PALETTES: Record<string, Palette> = {
  eva: {
    primary: '#00d4ff', accent: '#ff7edb', border: '#2a4a5e',
    text: '#e8f4f8', textMuted: '#88aabb', textDim: '#5a7a8a',
    success: '#7dffb2', warning: '#ffd166', danger: '#ff6b81',
    banner: [
      '  ██╗ █████╗ ███████╗ ██████╗ ███████╗',
      '  ██║██╔══██╗██╔════╝██╔═══██╗╚══███╔╝',
      '  ██║███████║███████╗██║   ██║  ███╔╝ ',
      '  ██║██╔══██║╚════██║██║   ██║ ███╔╝  ',
      '  ██║██║  ██║███████║╚██████╔╝███████╗',
      '  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝',
    ],
  },
  dark: {
    primary: '#61afef', accent: '#c678dd', border: '#3a3f4b',
    text: '#d7dae0', textMuted: '#8c9299', textDim: '#5c6370',
    success: '#98c379', warning: '#e5c07b', danger: '#e06c75',
    banner: [
      '  ╔═╗╔═╗╔╗╔╦ ╦╦ ╦╔═╗╦═╗',
      '  ║  ║ ║║║║╠═╣║ ║║╣ ╠╦╝',
      '  ╚═╝╚═╝╝╚╝╩ ╩╚═╝╚═╝╩╚═',
    ],
  },
  default: {
    primary: '#2563eb', accent: '#7c3aed', border: '#cbd5e1',
    text: '#1e293b', textMuted: '#64748b', textDim: '#94a3b8',
    success: '#16a34a', warning: '#d97706', danger: '#dc2626',
    banner: [
      '  ┌─┐┌─┐┌┐┌┌┬┐┌─┐┬ ┬┌┬┐┌─┐┬─┐',
      '  │  │ ││││ │ ├┤ │││ │ │├┤ ├┬┘',
      '  └─┘└─┘┘└┘ ┴ └─┘└┴┘ ┴ └─┘┴└─',
    ],
  },
};

class ThemeManager {
  private paletteName = 'eva';
  get name() { return this.paletteName; }
  set(name: string): boolean {
    if (!PALETTES[name]) return false;
    this.paletteName = name;
    return true;
  }
  color(token: string): string {
    const p = PALETTES[this.paletteName];
    return (p as any)[token] || p.text;
  }
  fg(token: string, s: string): string {
    return chalk.hex(this.color(token))(s);
  }
  get banner(): string[] { return PALETTES[this.paletteName].banner; }
}

export const currentTheme = new ThemeManager();

// ── Markdown 主题（照搬 nighthawk pi-tui-theme.ts）─────────────────
export function createMarkdownTheme(options?: { transient?: boolean }): MarkdownTheme {
  const transient = options?.transient === true;
  const stripHash = (text: string): string =>
    // eslint-disable-next-line no-control-characters
    text.replace(/^((?:\u001B\[[0-9;]*m)*)#{1,6}[ \t]+/, '$1');

  return {
    heading: (text) => chalk.bold.hex(currentTheme.color('text'))(stripHash(text)),
    link: (text) => chalk.hex(currentTheme.color('primary'))(text),
    linkUrl: (text) => chalk.hex(currentTheme.color('textMuted'))(text),
    code: (text) => chalk.hex(currentTheme.color('primary'))(text),
    codeBlock: (text) => text,
    codeBlockBorder: (text) => chalk.hex(currentTheme.color('textMuted'))(text),
    quote: (text) => chalk.hex(currentTheme.color('textDim'))(text),
    quoteBorder: (text) => chalk.hex(currentTheme.color('textDim'))(text),
    hr: (text) => chalk.hex(currentTheme.color('border'))(text),
    listBullet: (text) => chalk.hex(currentTheme.color('text'))(text.replace(/^-/, '•')),
    bold: (text) => chalk.bold(text),
    italic: (text) => chalk.italic(text),
    strikethrough: (text) => chalk.strikethrough(text),
    underline: (text) => chalk.underline(text),
    highlightCode: (code: string, lang?: string) => {
      if (transient) return code.split('\n');
      const normalizedLang = lang?.trim().toLowerCase();
      const language = normalizedLang !== undefined && supportsLanguage(normalizedLang) ? normalizedLang : 'text';
      try {
        return highlight(code, { language, ignoreIllegals: true }).split('\n');
      } catch {
        return code.split('\n');
      }
    },
  };
}

// ── Editor 主题（照搬 nighthawk）────────────────────────────────────
export function createEditorTheme(): EditorTheme {
  return {
    borderColor: (s) => chalk.hex(currentTheme.color('border'))(s),
    selectList: {
      selectedPrefix: (s) => chalk.hex(currentTheme.color('primary'))(s),
      selectedText: (s) => chalk.hex(currentTheme.color('primary'))(s),
      description: (s) => chalk.hex(currentTheme.color('textMuted'))(s),
      scrollInfo: (s) => chalk.hex(currentTheme.color('textMuted'))(s),
      noMatch: (s) => chalk.hex(currentTheme.color('textMuted'))(s),
    },
  };
}

export function severityIcon(sev: string): string {
  return { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' }[sev] || '⚪';
}
