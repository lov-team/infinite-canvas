import { nanoid } from "nanoid";

export type PromptSource = {
    id: string;
    name: string;
    url: string;
    homepage: string;
    enabled: boolean;
    builtIn: boolean;
};

export const PROMPT_REGISTRY_HOMEPAGE = "https://github.com/yukkcat/image-prompts";
const PROMPT_REGISTRY_SOURCE_BASE = "https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/sources";

export function createPromptSource(source?: Partial<PromptSource>): PromptSource {
    return {
        id: source?.id?.trim() || nanoid(),
        name: source?.name?.trim() || "",
        url: source?.url?.trim() || "",
        homepage: source?.homepage?.trim() || "",
        enabled: source?.enabled ?? true,
        builtIn: source?.builtIn ?? false,
    };
}

export const DEFAULT_PROMPT_SOURCES: PromptSource[] = [
    registrySource("banana-prompt-quicker", "Banana Prompt Quicker", "https://glidea.github.io/banana-prompt-quicker/"),
    registrySource("davidwu-gpt-image2-prompts", "DavidWu GPT Image 2", "https://github.com/davidwuw0811-boop/awesome-gpt-image2-prompts"),
    registrySource("freestylefly-gpt-image-2", "Freestylefly GPT Image 2", "https://github.com/freestylefly/awesome-gpt-image-2"),
    registrySource("awesome-gpt-image", "Awesome GPT Image", "https://github.com/ZeroLu/awesome-gpt-image"),
    registrySource("awesome-gpt4o-image-prompts", "Awesome GPT-4o", "https://github.com/ImgEdify/Awesome-GPT4o-Image-Prompts"),
    registrySource("youmind-gpt-image-2", "YouMind GPT Image 2", "https://github.com/YouMind-OpenLab/awesome-gpt-image-2"),
    registrySource("youmind-nano-banana-pro", "YouMind Nano Banana Pro", "https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts"),
    remoteSource("lanshu-ai-video-kit", "Lanshu AI Video Kit", "https://gist.githubusercontent.com/jingx8885/1f890c0f39a34edc5aaaf5819d220dcf/raw/infinite-canvas-video-prompts.json", "https://github.com/cclank/lanshu-awesome-ai-video-kit"),
    remoteSource("minimax-h3-video-prompts", "MiniMax H3 精选提示词", "https://raw.githubusercontent.com/SkyNotSilent/awesome-MiniMax-H3-cases/main/data/cases.json", "https://github.com/SkyNotSilent/awesome-MiniMax-H3-cases"),
    remoteSource("seedance-2-5-video-prompts", "Seedance 2.5 提示词库", "https://raw.githubusercontent.com/AtlasCloudAI/awesome-seedance-2.5-prompts-skills/main/data/prompts.json", "https://github.com/AtlasCloudAI/awesome-seedance-2.5-prompts-skills"),
];

function registrySource(id: string, name: string, homepage: string): PromptSource {
    return { id, name, url: `${PROMPT_REGISTRY_SOURCE_BASE}/${id}.json`, homepage, enabled: true, builtIn: true };
}

function remoteSource(id: string, name: string, url: string, homepage: string): PromptSource {
    return { id, name, url, homepage, enabled: true, builtIn: true };
}
