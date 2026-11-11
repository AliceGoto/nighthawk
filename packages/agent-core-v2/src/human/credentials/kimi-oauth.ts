import type { BearerTokenProvider } from '@nighthawk/nighthawk-oauth';

import { createOAuthCredentialProvider } from '#/credentials/credentials';
import type { LlmCredentialProvider } from '#/llm-requester/requester';

export function createNightHawkOAuthCredentialProvider(tokens: BearerTokenProvider): LlmCredentialProvider {
  return createOAuthCredentialProvider((options) => tokens.getAccessToken(options));
}
