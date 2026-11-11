import { OPEN_PLATFORMS } from '@nighthawk/nighthawk-oauth';

import { NIGHTHAWK_GLOBAL_PLATFORM_VALUE } from '#/utils/region';

import { ChoicePickerComponent, type ChoiceOption } from './choice-picker';

const NIGHTHAWK_MAINLAND_CN_OPTION: ChoiceOption = {
  value: 'nighthawk',
  label: 'NightHawk (kimi.com/code)',
};
const NIGHTHAWK_GLOBAL_OPTION: ChoiceOption = {
  value: NIGHTHAWK_GLOBAL_PLATFORM_VALUE,
  label: 'NightHawk (kimi.ai/code)',
};

function platformOptions(): readonly ChoiceOption[] {
  return [
    NIGHTHAWK_MAINLAND_CN_OPTION,
    NIGHTHAWK_GLOBAL_OPTION,
    ...OPEN_PLATFORMS.map((platform) => ({ value: platform.id, label: platform.name })),
  ];
}

export interface PlatformSelectorOptions {
  readonly onSelect: (platformId: string) => void;
  readonly onCancel: () => void;
}

export class PlatformSelectorComponent extends ChoicePickerComponent {
  constructor(opts: PlatformSelectorOptions) {
    super({
      title: 'Select a platform',
      options: [...platformOptions()],
      onSelect: opts.onSelect,
      onCancel: opts.onCancel,
    });
  }
}
