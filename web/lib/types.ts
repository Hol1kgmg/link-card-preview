export type Status = "ok" | "warn" | "ng";

export type Issue = {
  level: "warn" | "ng";
  code: string;
  message: string;
  hint?: string;
};

export type ImageInfo = {
  url: string;
  reachable: boolean;
  width?: number;
  height?: number;
  bytes?: number;
  contentType?: string;
};

export type CheckResponse = {
  requestedUrl: string;
  finalUrl: string;
  fetchedAt: string;
  ogp: {
    status: Status;
    tags: Record<string, string>;
    image?: ImageInfo;
    issues: Issue[];
  };
  twitter: {
    status: Status;
    cardType: string;
    tags: Record<string, string>;
    fallbacks: string[];
    image?: ImageInfo;
    issues: Issue[];
  };
  oembed: {
    status: Status;
    endpoint: string | null;
    data: Record<string, unknown> | null;
    issues: Issue[];
  };
};

export type ErrorResponse = { error: { code: string; message: string } };

export type ParsedMeta = {
  og: Record<string, string>;
  twitter: Record<string, string>;
  oembedEndpoint: string | null;
};
