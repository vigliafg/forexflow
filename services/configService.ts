import { ForexFlowConfig } from "../types";

const STORAGE_KEY = "forexflow_config_v2";
const STORAGE_KEY_TOML = "forexflow_config_toml_v2";

// --- TOML serializer ---

const escapeTomlString = (str: string): string => {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
};

const serializeToml = (config: ForexFlowConfig): string => {
  const lines: string[] = [];

  lines.push("# ForexFlow AI Configuration");
  lines.push("");

  // [api_keys]
  lines.push("[api_keys]");
  lines.push(`openrouter = "${escapeTomlString(config.api_keys.openrouter)}"`);
  lines.push(`nvidia = "${escapeTomlString(config.api_keys.nvidia)}"`);
  lines.push("");

  // [active_provider]
  lines.push("[active_provider]");
  lines.push(`provider = "${config.active_provider.provider}"`);
  lines.push(`model = "${config.active_provider.model}"`);
  lines.push("");

  // [provider_models]
  lines.push("[provider_models]");
  lines.push(`openrouter = [${config.provider_models.openrouter.map(s => `"${s}"`).join(", ")}]`);
  lines.push(`nvidia = [${config.provider_models.nvidia.map(s => `"${s}"`).join(", ")}]`);
  lines.push("");

  // [setup]
  lines.push("[setup]");
  lines.push(`completed = ${config.setup_completed}`);

  return lines.join("\n");
};

// --- TOML deserializer ---

const deserializeToml = (toml: string): ForexFlowConfig | null => {
  try {
    const config: ForexFlowConfig = {
      config_version: 0,
      api_keys: { openrouter: "", nvidia: "" },
      active_provider: { provider: "openrouter", model: "openrouter/free" },
      provider_models: { openrouter: [], nvidia: [] },
      setup_completed: false,
    };

    let currentSection = "";

    for (const line of toml.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        continue;
      }

      if (currentSection === "api_keys") {
        const match = trimmed.match(/^(\w+)\s*=\s*"(.+)"$/);
        if (match && (match[1] === "openrouter" || match[1] === "nvidia")) {
          config.api_keys[match[1]] = match[2];
        }
      } else if (currentSection === "active_provider") {
        const provMatch = trimmed.match(/^provider\s*=\s*"(\w+)"$/);
        const modelMatch = trimmed.match(/^model\s*=\s*"(.+)"$/);
        if (provMatch) config.active_provider.provider = provMatch[1] as any;
        if (modelMatch) config.active_provider.model = modelMatch[1];
      } else if (currentSection === "provider_models") {
        const arrayMatch = trimmed.match(/^(\w+)\s*=\s*\[(.+)\]$/);
        if (arrayMatch && (arrayMatch[1] === "openrouter" || arrayMatch[1] === "nvidia")) {
          config.provider_models[arrayMatch[1]] = arrayMatch[2]
            .split(",")
            .map(s => s.trim().replace(/^"|"$/g, ""))
            .filter(Boolean);
        }
      } else if (currentSection === "setup") {
        const match = trimmed.match(/^completed\s*=\s*(true|false)$/);
        if (match) config.setup_completed = match[1] === "true";
      }
    }

    return config;
  } catch (e) {
    console.error("Failed to parse TOML config:", e);
    return null;
  }
};

// --- Public API ---

export const getDefaultConfig = (): ForexFlowConfig => ({
  config_version: 2,
  api_keys: {
    openrouter: (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) || "",
    nvidia: (typeof process !== "undefined" && process.env?.NVIDIA_API_KEY) || "",
  },
  active_provider: { provider: "openrouter", model: "openrouter/free" },
  provider_models: {
    openrouter: [],
    nvidia: [],
  },
  setup_completed: false,
});

export const loadConfig = (): ForexFlowConfig | null => {
  try {
    const toml = localStorage.getItem(STORAGE_KEY_TOML);
    if (toml) {
      const parsed = deserializeToml(toml);
      if (parsed) return parsed;
    }

    // Legacy JSON fallback
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      const migrated: ForexFlowConfig = {
        config_version: parsed.config_version || 0,
        api_keys: {
          openrouter: parsed.api_keys?.openrouter || "",
          nvidia: parsed.api_keys?.nvidia || "",
        },
        active_provider: parsed.active_provider || { provider: "openrouter", model: "openrouter/free" },
        provider_models: {
          openrouter: parsed.provider_models?.openrouter || [],
          nvidia: parsed.provider_models?.nvidia || [],
        },
        setup_completed: parsed.setup_completed || false,
      };
      saveConfig(migrated);
      return migrated;
    }

    return null;
  } catch (e) {
    console.error("Failed to load config:", e);
    return null;
  }
};

export const saveConfig = (config: ForexFlowConfig): void => {
  try {
    const toml = serializeToml(config);
    localStorage.setItem(STORAGE_KEY_TOML, toml);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save config:", e);
  }
};

export const exportConfigFile = (config: ForexFlowConfig): void => {
  const toml = serializeToml(config);
  const blob = new Blob([toml], { type: "application/toml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "forexflow.cfg";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importConfigFile = (file: File): Promise<ForexFlowConfig | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const config = deserializeToml(content);
      if (config) resolve(config);
      else reject(new Error("Invalid config file format"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

export const isSetupCompleted = (): boolean => {
  const config = loadConfig();
  return config?.setup_completed || false;
};

export const hasAnyApiKey = (config: ForexFlowConfig): boolean => {
  return !!(config.api_keys.openrouter || config.api_keys.nvidia);
};
