import { gradientText } from '#/tui/theme/gradient-text';

import type { ColorPalette } from '#/tui/theme/colors';

export const NIGHTHAWK_WORDMARK = 'NIGHTHAWK';

const LOGO_TEXT = '◈ N i g h t H a w k ◈';

export class NightHawkLogoComponent {
  invalidate(): void {}

  render(colors: ColorPalette): string[] {
    // Static brand-gradient wordmark. Rendered from the live palette on each
    // frame; deliberately holds no timer or frame counter, so the logo can
    // never keep re-rendering (and thus never force whole-screen redraws).
    return [gradientText(LOGO_TEXT, colors.primary, colors.accent)];
  }
}