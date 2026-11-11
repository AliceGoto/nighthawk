import { useEffect, useState, type ReactElement } from 'react';

import { getToken } from './api';

export function AuthImage({
  sessionId,
  fileId,
  alt = '',
}: {
  sessionId: string;
  fileId: string;
  alt?: string;
}): ReactElement | null {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (sessionId.length === 0 || fileId.length === 0) return;
    let objectUrl: string | undefined;
    let cancelled = false;
    void fetch(`/api/v1/sessions/${sessionId}/media/${fileId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((response) => (response.ok ? response.blob() : undefined))
      .then((blob) => {
        if (blob === undefined || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl !== undefined) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId, fileId]);

  return url === undefined ? null : <img className="md-image" src={url} alt={alt} />;
}
