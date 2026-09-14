import type { Project } from "@iplex/aicut-react";
import localforage from "localforage";
import { nanoid } from "nanoid";

import { resolveMediaUrl } from "@/services/file-storage";

export type EditorVideoInput = {
    url: string;
    storageKey?: string;
    title: string;
    durationMs?: number;
    width?: number;
    height?: number;
    kind?: "video" | "audio";
};

export type VideoEditorDraft = {
    title: string;
    project: Project;
    sourceStorageKeys: Record<string, string>;
    updatedAt: number;
};

const DRAFT_KEY = "default";
const draftStore = localforage.createInstance({ name: "infinite-canvas", storeName: "video_editing_projects" });

export function createEmptyVideoProject(): Project {
    return { version: 1, sources: [], tracks: [{ id: nanoid(), kind: "video", clips: [] }] };
}

export async function loadVideoEditorDraft(defaultTitle: string): Promise<VideoEditorDraft> {
    const stored = await draftStore.getItem<VideoEditorDraft>(DRAFT_KEY);
    if (!stored) return { title: defaultTitle, project: createEmptyVideoProject(), sourceStorageKeys: {}, updatedAt: Date.now() };
    const project = {
        ...stored.project,
        sources: await Promise.all(
            stored.project.sources.map(async (source) => ({
                ...source,
                url: await resolveMediaUrl(stored.sourceStorageKeys[source.id], source.url),
            })),
        ),
    };
    return { ...stored, project };
}

export async function saveVideoEditorDraft(draft: VideoEditorDraft) {
    const sourceIds = new Set(draft.project.sources.map((source) => source.id));
    const sourceStorageKeys = Object.fromEntries(Object.entries(draft.sourceStorageKeys).filter(([sourceId]) => sourceIds.has(sourceId)));
    await draftStore.setItem(DRAFT_KEY, {
        ...draft,
        sourceStorageKeys,
        project: {
            ...draft.project,
            sources: draft.project.sources.map((source) => ({ ...source, url: sourceStorageKeys[source.id] ? "" : source.url })),
        },
        updatedAt: Date.now(),
    });
}

export async function getVideoEditorMediaReferences() {
    const stored = await draftStore.getItem<VideoEditorDraft>(DRAFT_KEY);
    return Object.values(stored?.sourceStorageKeys || {}).map((storageKey) => ({ storageKey }));
}

export async function ensureMediaSource(draft: VideoEditorDraft, input: EditorVideoInput): Promise<{ draft: VideoEditorDraft; sourceId: string; created: boolean }> {
    const url = await resolveMediaUrl(input.storageKey, input.url);
    const kind = input.kind === "audio" ? "audio" : "video";
    const existingSource = draft.project.sources.find((source) => (input.storageKey ? draft.sourceStorageKeys[source.id] === input.storageKey : source.url === url && source.kind === kind));
    if (existingSource) return { draft, sourceId: existingSource.id, created: false };

    const metadata = input.durationMs && input.durationMs > 0 ? { durationMs: input.durationMs, width: input.width, height: input.height } : await readVideoMetadata(url);
    const sourceId = nanoid();
    const hasMedia = draft.project.sources.length > 0;
    const output = !hasMedia && kind === "video" && metadata.width && metadata.height ? { width: even(metadata.width), height: even(metadata.height) } : draft.project.output;
    return {
        draft: {
            ...draft,
            project: { ...draft.project, sources: [...draft.project.sources, { id: sourceId, url, kind, name: input.title, duration: metadata.durationMs }], ...(output ? { output } : {}) },
            sourceStorageKeys: input.storageKey ? { ...draft.sourceStorageKeys, [sourceId]: input.storageKey } : draft.sourceStorageKeys,
            updatedAt: Date.now(),
        },
        sourceId,
        created: true,
    };
}

export async function appendVideoToDraft(draft: VideoEditorDraft, input: EditorVideoInput, mode: "append" | "overlay", skipExisting = false, startMs = 0): Promise<VideoEditorDraft> {
    const kind = input.kind === "audio" ? "audio" : "video";
    const ensured = await ensureMediaSource(draft, { ...input, kind });
    if (!ensured.created && skipExisting) return ensured.draft;
    const source = ensured.draft.project.sources.find((item) => item.id === ensured.sourceId);
    const durationMs = source?.duration || input.durationMs || 0;
    const clip = {
        id: nanoid(),
        sourceId: ensured.sourceId,
        in: 0,
        out: durationMs,
        start: 0,
        ...(mode === "overlay" && kind === "video" ? { scale: 0.4 } : {}),
    };

    if (mode === "overlay" && kind === "video") {
        clip.start = Math.max(0, Math.round(startMs));
        return {
            ...ensured.draft,
            project: { ...ensured.draft.project, tracks: [{ id: nanoid(), kind: "video", clips: [clip] }, ...ensured.draft.project.tracks] },
            updatedAt: Date.now(),
        };
    }

    let targetIndex = -1;
    for (let index = ensured.draft.project.tracks.length - 1; index >= 0; index -= 1) {
        if (ensured.draft.project.tracks[index].kind === kind) {
            targetIndex = index;
            break;
        }
    }
    const tracks = targetIndex < 0
        ? [...ensured.draft.project.tracks, { id: nanoid(), kind, clips: [clip] }]
        : ensured.draft.project.tracks.map((track, index) => {
            if (index !== targetIndex) return track;
            const start = track.clips.reduce((end, item) => Math.max(end, item.start + (item.out - item.in) / (item.speed || 1)), 0);
            return { ...track, clips: [...track.clips, { ...clip, start }] };
        });
    return { ...ensured.draft, project: { ...ensured.draft.project, tracks }, updatedAt: Date.now() };
}

async function readVideoMetadata(url: string) {
    return new Promise<{ durationMs: number; width?: number; height?: number }>((resolve, reject) => {
        const video = document.createElement("video");
        const cleanup = () => {
            video.onloadedmetadata = null;
            video.onerror = null;
            video.removeAttribute("src");
            video.load();
        };
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => {
            const durationMs = Math.round(video.duration * 1000);
            const metadata = { durationMs, width: video.videoWidth || undefined, height: video.videoHeight || undefined };
            cleanup();
            if (!Number.isFinite(durationMs) || durationMs <= 0) reject(new Error("VIDEO_DURATION_UNAVAILABLE"));
            else resolve(metadata);
        };
        video.onerror = () => {
            cleanup();
            reject(new Error("VIDEO_UNREADABLE"));
        };
        video.src = url;
    });
}

function even(value: number) {
    return Math.max(2, Math.round(value / 2) * 2);
}
