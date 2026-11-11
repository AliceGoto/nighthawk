import type { SkillDefinition } from '#/features/skill/catalog/types';
import { parseSkillText } from '#/features/skill/catalog/parser';
import CHECK_NIGHTHAWK_DOCS_BODY from './check-nighthawk-docs.md?raw';

const PSEUDO_PATH = 'builtin://check-nighthawk-docs';

const parsed = parseSkillText({
  skillMdPath: '/builtin/skills/check-nighthawk-docs.md',
  skillDirName: 'check-nighthawk-docs',
  source: 'builtin',
  text: CHECK_NIGHTHAWK_DOCS_BODY,
});

export const CHECK_NIGHTHAWK_DOCS_SKILL: SkillDefinition = {
  ...parsed,
  path: PSEUDO_PATH,
  dir: PSEUDO_PATH,
  metadata: {
    ...parsed.metadata,
    type: parsed.metadata.type ?? 'inline',
  },
  productSpecific: true,
};
