type ApiKeyEnvVar =
  | "OPENAI_API_KEY"
  | "OPENAI_DOMAIN_SECRET_KEY"
  | "OPENAI_SECRET_KEY";

const API_KEY_ENV_PRIORITY: readonly ApiKeyEnvVar[] = [
  "OPENAI_API_KEY",
  "OPENAI_DOMAIN_SECRET_KEY",
  "OPENAI_SECRET_KEY",
];

export interface ResolutionWarning {
  message: string;
  context?: Record<string, unknown>;
}

interface ResolvedApiKey {
  key: string;
  source: ApiKeyEnvVar;
}

interface OpenAICredentialSuccess {
  apiKey: string;
  source: ApiKeyEnvVar;
  projectId: string | null;
  warnings: ResolutionWarning[];
}

interface OpenAICredentialError {
  reason: "missing_key" | "domain_public_key" | "missing_project";
  message: string;
  status: number;
}

type CredentialResult =
  | { ok: true; value: OpenAICredentialSuccess }
  | { ok: false; error: OpenAICredentialError };

export function resolveOpenAICredentials(
  env: NodeJS.ProcessEnv = process.env
): CredentialResult {
  const { selectedKey, warnings } = pickPreferredKey(env);

  if (!selectedKey) {
    return {
      ok: false,
      error: {
        reason: "missing_key",
        message:
          "Missing OpenAI API key. Set OPENAI_API_KEY, OPENAI_DOMAIN_SECRET_KEY, or OPENAI_SECRET_KEY with a valid server-side key.",
        status: 500,
      },
    };
  }

  if (looksLikeDomainPublicKey(selectedKey.key)) {
    return {
      ok: false,
      error: {
        reason: "domain_public_key",
        message: `${selectedKey.source} is set to a domain public key. Move this value to NEXT_PUBLIC_OPENAI_DOMAIN_PUBLIC_KEY and configure a server-side API key (starts with sk-, sk-proj-, or domain_sk-) instead.`,
        status: 400,
      },
    };
  }

  const projectId = env.OPENAI_PROJECT_ID?.trim() ?? null;

  if (looksLikeProjectScopedKey(selectedKey.key) && !projectId) {
    return {
      ok: false,
      error: {
        reason: "missing_project",
        message: `${selectedKey.source} is project-scoped. Set OPENAI_PROJECT_ID to the corresponding project identifier to authenticate.`,
        status: 500,
      },
    };
  }

  return {
    ok: true,
    value: {
      apiKey: selectedKey.key,
      projectId,
      source: selectedKey.source,
      warnings,
    },
  };
}

function pickPreferredKey(env: NodeJS.ProcessEnv): {
  selectedKey: ResolvedApiKey | null;
  warnings: ResolutionWarning[];
} {
  let selectedKey: ResolvedApiKey | null = null;
  const warnings: ResolutionWarning[] = [];
  const environment = env.NODE_ENV ?? process.env.NODE_ENV;

  for (const envVar of API_KEY_ENV_PRIORITY) {
    const candidate = env[envVar];
    const trimmed = candidate?.trim();

    if (!trimmed) {
      continue;
    }

    if (!selectedKey) {
      selectedKey = { key: trimmed, source: envVar };
      continue;
    }

    if (selectedKey.key === trimmed) {
      continue;
    }

    if (environment !== "production") {
      warnings.push({
        message:
          "[create-session] Multiple OpenAI API keys detected; prioritising the highest-precedence value.",
        context: {
          preferred: selectedKey.source,
          ignored: envVar,
        },
      });
    }
  }

  return { selectedKey, warnings };
}

function looksLikeDomainPublicKey(value: string): boolean {
  return value.startsWith("domain_pk_");
}

function looksLikeProjectScopedKey(value: string): boolean {
  return value.startsWith("sk-proj-");
}

