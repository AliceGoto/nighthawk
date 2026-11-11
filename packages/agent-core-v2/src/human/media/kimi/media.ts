import type { ProviderMediaContribution } from '#/media/upload';
import { modelKey, type LlmModel } from '#/llm-requester/model';

import { NightHawkFiles } from './files';
import { NIGHTHAWK_DEFAULT_BASE_URL } from '#/llm/builtin/provider/kimi/index';

const filesByModel = new Map<string, NightHawkFiles>();

function resolveFiles(model: LlmModel): NightHawkFiles {
  const key = modelKey(model);
  let files = filesByModel.get(key);
  if (files === undefined) {
    files = new NightHawkFiles({
      apiKey: model.apiKey,
      baseUrl: model.baseUrl ?? NIGHTHAWK_DEFAULT_BASE_URL,
      defaultHeaders:
        model.defaultHeaders === undefined ? undefined : { ...model.defaultHeaders },
    });
    filesByModel.set(key, files);
  }
  return files;
}

export const nighthawkMediaContribution: ProviderMediaContribution = {
  uploadVideo: (video, { model, signal }) => resolveFiles(model).uploadVideo(video, { signal }),
};
