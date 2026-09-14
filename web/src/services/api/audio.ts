import axios from "axios";

import i18n from "@/i18n";
import { audioMimeType, audioVoiceOptions, normalizeAudioFormatValue, normalizeAudioSpeedValue, normalizeAudioVoiceValue } from "@/lib/audio-generation";
import { uploadMediaFile, type UploadedFile } from "@/services/file-storage";
import { buildApiUrl, resolveModelRequestConfig, resolveModelScript, withLocalProxy, type AiConfig } from "@/stores/use-config-store";
import { runModelPlugin } from "./model-plugin";

type RequestOptions = { signal?: AbortSignal };
const apiText = (key: string, options?: Record<string, unknown>) => i18n.t(`apiErrors.${key}`, options);

function aiApiUrl(config: AiConfig, path: string) {
    return buildApiUrl(config.baseUrl, path);
}

function aiHeaders(config: AiConfig) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
    };
}

export async function requestAudioGeneration(config: AiConfig, prompt: string, options?: RequestOptions): Promise<Blob> {
    const requestConfig = resolveModelRequestConfig(config, config.model || config.audioModel);
    const model = requestConfig.model.trim();
    const format = normalizeAudioFormatValue(config.audioFormat);
    const script = resolveModelScript(config, config.model || config.audioModel);
    const voice = resolveSpeechVoice(model, config.audioVoice);
    if (script) {
        if (!model) throw new Error(apiText("audioModelRequired"));
        if (!requestConfig.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
        if (!requestConfig.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
        try {
            const result = await runModelPlugin({
                capability: "audio",
                script,
                config: requestConfig,
                prompt,
                params: { voice, format, speed: normalizeAudioSpeedValue(config.audioSpeed), instructions: config.audioInstructions.trim() },
                signal: options?.signal,
            });
            return await audioPluginBlob(result, format);
        } catch (error) {
            throw new Error(readAxiosError(error, apiText("audioGenerationFailed")));
        }
    }
    assertAudioConfig(requestConfig, model);
    if (isSunoModel(model)) return requestSunoMusic(requestConfig, model, prompt, options);
    const instructions = isFishAudioModel(model) ? "" : config.audioInstructions.trim();

    try {
        const response = await axios.post<Blob>(
            aiApiUrl(requestConfig, "/audio/speech"),
            {
                model,
                input: prompt,
                voice: isFishAudioModel(model) ? voice : voice || "alloy",
                response_format: format,
                speed: Number(normalizeAudioSpeedValue(config.audioSpeed)),
                ...(instructions ? { instructions } : {}),
            },
            { headers: aiHeaders(requestConfig), responseType: "blob", signal: options?.signal },
        );
        await assertAudioBlob(response.data);
        return response.data.type.startsWith("audio/") ? response.data : new Blob([response.data], { type: audioMimeType(format) });
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("audioGenerationFailed")));
    }
}

function originApiUrl(config: AiConfig, path: string) {
    const base = config.baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
    return withLocalProxy(`${base}${path}`);
}

function isSunoModel(model: string) {
    return /suno|chirp/i.test(model);
}

function isFishAudioModel(model: string) {
    return /fish|speech-1|s2\.1|s2-pro/i.test(model);
}

function resolveSpeechVoice(model: string, voice: string) {
    if (isFishAudioModel(model) || isSunoModel(model)) {
        const value = voice.trim();
        if (!value || audioVoiceOptions.some((item) => item.value === value)) return "";
        return value;
    }
    return normalizeAudioVoiceValue(voice);
}

function sunoMv(model: string) {
    const name = model.trim();
    if (/^chirp/i.test(name)) return name;
    const match = name.match(/chirp[-_]?[\w.]+/i);
    if (match) return match[0];
    return "chirp-v4";
}

type SunoSubmitResponse = { code?: number | string; message?: string; msg?: string; data?: unknown };
type SunoClip = { audio_url?: string; status?: string; metadata?: { error_message?: string } };
type SunoTask = { status?: string; fail_reason?: string; data?: SunoClip | SunoClip[] };

async function requestSunoMusic(config: AiConfig, model: string, prompt: string, options?: RequestOptions): Promise<Blob> {
    try {
        const submitted = (await axios.post<SunoSubmitResponse>(
            originApiUrl(config, "/suno/submit/music"),
            { gpt_description_prompt: prompt, model, ...( /^chirp/i.test(model) ? { mv: sunoMv(model) } : {}) },
            { headers: aiHeaders(config), signal: options?.signal },
        )).data;
        const taskId = sunoTaskId(submitted);
        if (!taskId) throw new Error(readApiErrorMessage(submitted) || apiText("audioGenerationFailed"));
        for (let attempt = 0; attempt < 90; attempt += 1) {
            if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
            const fetched = (await axios.get<SunoSubmitResponse>(originApiUrl(config, `/suno/fetch/${taskId}`), { headers: aiHeaders(config), signal: options?.signal })).data;
            const task = sunoTask(fetched);
            const clips = Array.isArray(task.data) ? task.data : task.data ? [task.data] : [];
            const audioUrl = clips.find((clip) => clip.audio_url)?.audio_url;
            if (audioUrl) {
                const audio = await axios.get<Blob>(withLocalProxy(audioUrl), { responseType: "blob", signal: options?.signal });
                return audio.data.type.startsWith("audio/") ? audio.data : new Blob([audio.data], { type: "audio/mpeg" });
            }
            if (/fail/i.test(String(task.status || ""))) throw new Error(task.fail_reason || clips[0]?.metadata?.error_message || apiText("audioGenerationFailed"));
            await delay(4000, options?.signal);
        }
        throw new Error(apiText("audioGenerationFailed"));
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("audioGenerationFailed")));
    }
}

function sunoTaskId(payload: SunoSubmitResponse) {
    if (payload.code !== undefined && payload.code !== 0 && payload.code !== "0" && payload.code !== "success") {
        throw new Error(readApiErrorMessage(payload) || apiText("audioGenerationFailed"));
    }
    const record = payload as SunoSubmitResponse & { task_id?: string; id?: string };
    if (typeof record.task_id === "string" && record.task_id) return record.task_id;
    if (typeof record.id === "string" && record.id) return record.id;
    const data = payload.data;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object") {
        const inner = data as { task_id?: string; id?: string };
        return inner.task_id || inner.id || "";
    }
    return "";
}

function sunoTask(payload: SunoSubmitResponse): SunoTask {
    if (payload.code !== undefined && payload.code !== 0 && payload.code !== "0" && payload.code !== "success") {
        throw new Error(readApiErrorMessage(payload) || apiText("audioGenerationFailed"));
    }
    return (payload.data && typeof payload.data === "object" ? payload.data : payload) as SunoTask;
}

function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}

async function audioPluginBlob(result: unknown, format: string): Promise<Blob> {
    if (result instanceof Blob) return result.type.startsWith("audio/") ? result : new Blob([result], { type: audioMimeType(format) });
    let source = "";
    if (typeof result === "string") source = result;
    else if (result && typeof result === "object") {
        const record = result as Record<string, unknown>;
        source = typeof record.b64_json === "string" ? record.b64_json : typeof record.data === "string" ? record.data : typeof record.url === "string" ? record.url : "";
    }
    if (!source) throw new Error(apiText("scriptNoAudio"));
    const url = source.startsWith("data:") || /^https?:/i.test(source) ? source : `data:${audioMimeType(format)};base64,${source}`;
    const blob = await (await fetch(withLocalProxy(url))).blob();
    return blob.type.startsWith("audio/") ? blob : new Blob([blob], { type: audioMimeType(format) });
}

export async function storeGeneratedAudio(blob: Blob, format = "mp3"): Promise<UploadedFile> {
    const audio = blob.type.startsWith("audio/") ? blob : new Blob([blob], { type: audioMimeType(format) });
    return uploadMediaFile(audio, "audio");
}

function assertAudioConfig(config: AiConfig, model: string) {
    if (!model) throw new Error(apiText("audioModelRequired"));
    if (!config.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
    if (!config.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
    if (config.apiFormat === "gemini") throw new Error(apiText("geminiAudioUnsupported"));
}

async function assertAudioBlob(blob: Blob) {
    if (!blob.type.includes("json")) return;
    let payload: { code?: number; msg?: string; error?: { message?: string } };
    try {
        payload = JSON.parse(await blob.text()) as { code?: number; msg?: string; error?: { message?: string } };
    } catch {
        return;
    }
    if (typeof payload.code === "number" && payload.code !== 0) throw new Error(payload.msg || apiText("audioGenerationFailed"));
    if (payload.error?.message) throw new Error(payload.error.message);
}

function readApiErrorMessage(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            const inner = readApiErrorMessage(parsed) || value;
            if (inner === value && typeof parsed === "object" && Object.keys(parsed).length === 0) return "";
            return inner;
        } catch {
            if (/<[a-z][\s\S]*>/i.test(value)) return apiText("htmlError", { preview: `${value.slice(0, 80)}...` });
            return value;
        }
    }
    if (typeof value !== "object") return "";
    const payload = value as { msg?: unknown; message?: unknown; error?: unknown; detail?: unknown };
    const errorMsg =
        typeof payload.error === "string"
            ? payload.error
            : (payload.error as { message?: unknown })?.message;
    return (
        readApiErrorMessage(payload.msg) ||
        readApiErrorMessage(payload.message) ||
        readApiErrorMessage(errorMsg) ||
        readApiErrorMessage(payload.detail) ||
        ""
    );
}

function readAxiosError(error: unknown, fallback: string) {
    if (axios.isCancel(error)) return apiText("requestCanceled");
    if (axios.isAxiosError(error)) {
        if (!error.response && error.code === "ERR_NETWORK") return apiText("requestFailed");
        const responseData = error.response?.data;
        const apiMsg = readApiErrorMessage(responseData);
        if (apiMsg) return apiMsg;
        const statusMsg = statusMessage(error.response?.status, fallback);
        if (statusMsg) return statusMsg;
        return error.message || fallback;
    }
    if (error instanceof DOMException && error.name === "AbortError") return apiText("requestCanceled");
    return error instanceof Error ? readApiErrorMessage(error.message) || error.message : fallback;
}

function statusMessage(status: number | undefined, fallback: string) {
    if (status === 401 || status === 403) return apiText("authenticationFailed");
    if (status === 429) return apiText("rateLimited");
    if (status === 404) return apiText("notFound");
    if (status === 502) return apiText("badGateway");
    if (status === 503) return apiText("serviceBusy");
    return status ? apiText("httpFailed", { status }) : fallback;
}
