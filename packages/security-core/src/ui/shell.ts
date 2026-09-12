// ═══════════════════════════════════════════════════════════════════
// SCA Shell — 照搬 nighthawk 的 TUI 主界面结构
// TuiMainScreen + Editor(带斜杠补全) + 流式 Markdown + MoonLoader
// ═══════════════════════════════════════════════════════════════════
import chalk from 'chalk';
import {
  Container,
  Editor,
  Markdown,
  ProcessTerminal,
  SelectList,
  Text,
  TuiMainScreen,
  CombinedAutocompleteProvider,
  type TUI,
  type SlashCommand,
} from '@nighthawk/pi-tui';
import { currentTheme, createEditorTheme, createMarkdownTheme } from './theme.js';

// ── Moon Loader（照搬 nighthawk moon-loader.ts）─────────────────────
const MOON_SPINNER_FRAMES = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const BRAILLE_SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const MOON_SPINNER_INTERVAL_MS = 160;
const BRAILLE_SPINNER_INTERVAL_MS = 80;

export type SpinnerStyle = 'moon' | 'braille';

export class MoonLoader extends Text {
  private currentFrame = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ui: TUI;
  private frames: string[];
  private interval: number;
  private colorFn?: (s: string) => string;
  private label: string;

  constructor(ui: TUI, style: SpinnerStyle = 'moon', colorFn?: (s: string) => string, label = '') {
    super('', 1, 1);
    this.ui = ui;
    this.frames = style === 'moon' ? [...MOON_SPINNER_FRAMES] : [...BRAILLE_SPINNER_FRAMES];
    this.interval = style === 'moon' ? MOON_SPINNER_INTERVAL_MS : BRAILLE_SPINNER_INTERVAL_MS;
    this.colorFn = colorFn;
    this.label = label;
    this.start();
  }

  start(): void {
    this.updateDisplay();
    this.intervalId = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.updateDisplay();
    }, this.interval);
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  setLabel(label: string): void { this.label = label; this.updateDisplay(); }

  private updateDisplay(): void {
    const frame = this.frames[this.currentFrame]!;
    const colored = this.colorFn ? this.colorFn(frame) : frame;
    this.setText(this.label ? `${colored} ${this.label}` : colored);
    this.ui.requestRender();
  }
}

// ── 流式消息组件（照搬 nighthawk assistant-message.ts）──────────────
export class LiveMessage {
  private container = new Container();
  private markdown?: Markdown;
  private lastText = '';

  constructor(private ui: TUI, private showBullet = true) {}

  get component(): Container { return this.container; }

  update(text: string): void {
    const display = text.trim();
    if (display === this.lastText) return;
    this.lastText = display;
    if (display.length === 0) { this.container.clear(); this.markdown = undefined; return; }
    if (this.markdown === undefined) {
      // 流式期间 transient: true 关闭代码高亮（性能）
      this.markdown = new Markdown(display, 0, 0, createMarkdownTheme({ transient: true }));
      this.container.addChild(this.markdown);
    } else {
      this.markdown.setText(display);
    }
    this.ui.requestRender();
  }

  /** 流式结束：用完整主题重渲染（含代码高亮） */
  finalize(): void {
    const text = this.lastText;
    this.container.clear();
    this.markdown = undefined;
    if (text.length > 0) {
      this.markdown = new Markdown(text, 0, 0, createMarkdownTheme({ transient: false }));
      this.container.addChild(this.markdown);
    }
    this.ui.requestRender();
  }

  render(width: number): string[] {
    const contentLines = this.container.render(Math.max(1, width - 2));
    return contentLines.map((l, i) =>
      (i === 0 && this.showBullet ? currentTheme.fg('primary', '◆ ') : '  ') + l
    );
  }
}

// ── Shell ──────────────────────────────────────────────────────────

export class ScaShell {
  readonly ui: TuiMainScreen;
  readonly editor: Editor;
  private transcript = new Container();
  private activityContainer = new Container();
  private liveMessage: LiveMessage | null = null;
  private loader: MoonLoader | null = null;
  private streamText = '';
  /** 可运行时替换的回调 */
  onSubmit: (text: string) => void | Promise<void> = () => {};
  onInterrupt: () => void = () => {};

  constructor(commands: SlashCommand[], workspace: string) {
    const terminal = new ProcessTerminal();
    this.ui = new TuiMainScreen(terminal);

    this.editor = new Editor(this.ui, createEditorTheme(), { paddingX: 2, inlineSlashTrigger: true });
    this.editor.setAutocompleteProvider(
      new CombinedAutocompleteProvider(commands, workspace)
    );

    this.ui.addChild(this.transcript);
    this.ui.addChild(this.activityContainer);
    this.ui.addChild(this.editor);
    this.ui.setFocus(this.editor);

    this.editor.onSubmit = (text) => { void this.onSubmit(text); };
  }

  start() { this.ui.start(); }
  stop() { this.loader?.stop(); this.ui.stop(); }

  // ── 静态输出 ────────────────────────────────────────────────────
  print(text: string, colorToken?: string) {
    const line = colorToken ? currentTheme.fg(colorToken, text) : text;
    this.transcript.addChild(new Text(line, 0, 1));
    this.ui.requestRender();
  }

  printBlank() { this.transcript.addChild(new Text('', 0, 0)); this.ui.requestRender(); }

  printBanner() {
    for (const l of currentTheme.banner) {
      this.transcript.addChild(new Text(chalk.hex(currentTheme.color('primary'))(l), 0, 1));
    }
    this.ui.requestRender();
  }

  printMarkdown(md: string) {
    const msg = new LiveMessage(this.ui, false);
    msg.update(md);
    msg.finalize();
    this.transcript.addChild(msg.component);
    this.ui.requestRender();
  }

  // ── 流式输出 ────────────────────────────────────────────────────
  streamStart() {
    this.streamText = '';
    this.liveMessage = new LiveMessage(this.ui, true);
    this.transcript.addChild(this.liveMessage.component);
  }

  streamAppend(tok: string) {
    this.streamText += tok;
    this.liveMessage?.update(this.streamText);
  }

  streamEnd(): string {
    this.liveMessage?.update(this.streamText);
    this.liveMessage?.finalize();
    this.liveMessage = null;
    const buf = this.streamText;
    this.streamText = '';
    return buf;
  }

  // ── Loader ──────────────────────────────────────────────────────
  showLoader(label: string, style: SpinnerStyle = 'moon') {
    this.hideLoader();
    this.loader = new MoonLoader(this.ui, style, (s) => currentTheme.fg('primary', s), label);
    this.activityContainer.addChild(this.loader);
  }

  setLoaderLabel(label: string) { this.loader?.setLabel(label); }

  hideLoader() {
    if (this.loader) {
      this.loader.stop();
      this.activityContainer.removeChild(this.loader);
      this.loader = null;
      this.ui.requestRender();
    }
  }

  // ── 确认面板（沙箱权限门禁）─────────────────────────────────────
  confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
      const list = new SelectList(
        [
          { value: 'yes', label: 'Yes — 执行', description: '允许本次执行' },
          { value: 'no', label: 'No — 拒绝', description: '跳过此命令' },
        ],
        2,
        createEditorTheme().selectList,
      );
      const label = new Text(currentTheme.fg('warning', `⚠ ${question}`), 1, 1);
      const box = new Container();
      box.addChild(label);
      box.addChild(list);

      const done = (ok: boolean) => {
        this.ui.hideOverlay();
        this.ui.setFocus(this.editor);
        resolve(ok);
      };
      list.onSelect = (item) => done(item.value === 'yes');
      list.onCancel = () => done(false);

      this.ui.showOverlay(box);
      this.ui.setFocus(list);
    });
  }
}
