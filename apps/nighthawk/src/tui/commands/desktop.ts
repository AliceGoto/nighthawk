import { nighthawkCodeOfficialInstallUrl } from '#/constant/app';
import { openUrl } from '#/utils/open-url';

import type { SlashCommandHost } from './dispatch';

export async function handleDesktopCommand(host: SlashCommandHost): Promise<void> {
  const url = nighthawkCodeOfficialInstallUrl();
  host.showStatus(`${url} — opened in your browser`);
  openUrl(url);
}
