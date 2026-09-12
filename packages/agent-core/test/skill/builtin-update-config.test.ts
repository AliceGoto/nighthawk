import { describe, expect, it } from 'vitest';

import { CHECK_NIGHTHAWK_DOCS_SKILL, SessionSkillRegistry, UPDATE_CONFIG_SKILL, registerBuiltinSkills } from '../../src/skill';

describe('builtin skill: update-config', () => {
  it('has the expected identity and inline metadata', () => {
    expect(UPDATE_CONFIG_SKILL.name).toBe('update-config');
    expect(UPDATE_CONFIG_SKILL.source).toBe('builtin');
    expect(UPDATE_CONFIG_SKILL.description.length).toBeGreaterThan(0);
    expect(UPDATE_CONFIG_SKILL.metadata.type).toBe('inline');
  });

  it('is model-invocable (does not disable model invocation)', () => {
    expect(UPDATE_CONFIG_SKILL.metadata.disableModelInvocation).not.toBe(true);
  });

  it('pins the doc URL as the single source of truth and references TOML / FetchURL / /reload', () => {
    const content = UPDATE_CONFIG_SKILL.content;
    expect(content).toContain('config-files.html');
    expect(content).toContain('FetchURL');
    expect(content).toContain('/reload');
    expect(content.toLowerCase()).toContain('toml');
  });

  it('registers through registerBuiltinSkills and shows up as model-invocable', () => {
    const registry = new SessionSkillRegistry();
    registerBuiltinSkills(registry);

    expect(registry.getSkill('update-config')).toBeDefined();
    expect(
      registry.listInvocableSkills().some((skill) => skill.name === 'update-config'),
    ).toBe(true);
  });
});

describe('builtin skill: check-nighthawk-docs', () => {
  it('has the expected identity and inline metadata', () => {
    expect(CHECK_NIGHTHAWK_DOCS_SKILL.name).toBe('check-nighthawk-docs');
    expect(CHECK_NIGHTHAWK_DOCS_SKILL.source).toBe('builtin');
    expect(CHECK_NIGHTHAWK_DOCS_SKILL.description.length).toBeGreaterThan(0);
    expect(CHECK_NIGHTHAWK_DOCS_SKILL.metadata.type).toBe('inline');
  });

  it('is model-invocable (does not disable model invocation)', () => {
    expect(CHECK_NIGHTHAWK_DOCS_SKILL.metadata.disableModelInvocation).not.toBe(true);
  });

  it('pins the official docs site and the module routing list', () => {
    const content = CHECK_NIGHTHAWK_DOCS_SKILL.content;
    expect(content).toContain('https://github.com/AliceGoto/nighthawk/tree/main/docs');
    expect(content).toContain('docs/en/');
    expect(content).toContain('docs/zh/');
    expect(content).toContain('never from memory');
    expect(content).toContain('Never invent config keys, command names, model IDs, or product behaviors.');
  });

  it('registers through registerBuiltinSkills and shows up as model-invocable', () => {
    const registry = new SessionSkillRegistry();
    registerBuiltinSkills(registry);

    expect(registry.getSkill('check-nighthawk-docs')).toBeDefined();
    expect(
      registry.listInvocableSkills().some((skill) => skill.name === 'check-nighthawk-docs'),
    ).toBe(true);
  });
});
