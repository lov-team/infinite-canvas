export const APP_VERSION = __APP_VERSION__ || "dev";

export const DOCS_URL = import.meta.env.VITE_DOC_URL || "https://docs.canvas.best";

// Official plugin registry URL: CI publishes to plugins-dist for jsDelivr delivery; an environment variable may override it for self-hosting.
export const PLUGIN_REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/basketikun/infinite-canvas@plugins-dist/official-plugins.json";

// Trusted video workflow plugins enabled for every new browser profile.
// Keep these URLs pinned to reviewed commits so a remote update cannot silently
// change code that runs in the page and can access the user's AI configuration.
export const DEFAULT_VIDEO_PLUGIN_URLS = [
    "https://cdn.jsdelivr.net/gh/YaoGuaiLi/infinite-canvas-plugin-comfyui-autodl@4b7b873e8891fed47f760a6c85d008de7672de66/dist/comfyui-autodl.js",
    "https://cdn.jsdelivr.net/gh/Pannix/grok-product-i2v-plugin@b2e70ce/grok-product-i2v.js",
    "https://cdn.jsdelivr.net/gh/esncy/infinite-canvas-director-plugin@8bfa2beaf84c8adc546e39ca6f94c9f890e6056f/dist/director.js",
] as const;
