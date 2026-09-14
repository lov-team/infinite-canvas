import type { Project } from "@iplex/aicut-react";
import localforage from "localforage";

import { createEmptyVideoProject, ensureMediaSource, type EditorVideoInput, type VideoEditorDraft } from "@/pages/video/edit/project-storage";
import { resolveMediaUrl } from "@/services/file-storage";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

export type CanvasEditDraft = VideoEditorDraft & { sourceNodeIds: Record<string, string> };

const store = localforage.createInstance({ name: "infinite-canvas", storeName: "canvas_editing_projects" });

export function collectCanvasEditMedia(nodes: CanvasNodeData[]): Array<EditorVideoInput & { nodeId: string }> {
    return nodes.flatMap((node) => {
        const url = node.metadata?.content;
        if (!url || (node.type !== CanvasNodeType.Video && node.type !== CanvasNodeType.Audio)) return [];
        return [{
            nodeId: node.id,
            url,
            storageKey: node.metadata?.storageKey,
            title: node.title || node.id,
            durationMs: node.metadata?.durationMs,
            width: node.metadata?.naturalWidth,
            height: node.metadata?.naturalHeight,
            kind: node.type === CanvasNodeType.Audio ? "audio" : "video",
        }];
    });
}

export async function loadCanvasEditDraft(projectId: string): Promise<CanvasEditDraft> {
    const stored = await store.getItem<CanvasEditDraft>(projectId);
    if (!stored) return { title: "", project: createEmptyVideoProject(), sourceStorageKeys: {}, sourceNodeIds: {}, updatedAt: Date.now() };
    return {
        ...stored,
        sourceNodeIds: stored.sourceNodeIds || {},
        project: {
            ...stored.project,
            sources: await Promise.all(
                stored.project.sources.map(async (source) => ({
                    ...source,
                    url: await resolveMediaUrl(stored.sourceStorageKeys[source.id], source.url),
                })),
            ),
        },
    };
}

export async function saveCanvasEditDraft(projectId: string, draft: CanvasEditDraft) {
    const sourceIds = new Set(draft.project.sources.map((source) => source.id));
    const sourceStorageKeys = Object.fromEntries(Object.entries(draft.sourceStorageKeys).filter(([sourceId]) => sourceIds.has(sourceId)));
    const sourceNodeIds = Object.fromEntries(Object.entries(draft.sourceNodeIds).filter(([sourceId]) => sourceIds.has(sourceId)));
    await store.setItem(projectId, {
        ...draft,
        sourceStorageKeys,
        sourceNodeIds,
        project: {
            ...draft.project,
            sources: draft.project.sources.map((source) => ({ ...source, url: sourceStorageKeys[source.id] ? "" : source.url })),
        },
        updatedAt: Date.now(),
    });
}

export async function syncCanvasMediaSources(draft: CanvasEditDraft, nodes: CanvasNodeData[]): Promise<CanvasEditDraft> {
    let next = draft;
    const nodeIds = new Map(Object.entries(next.sourceNodeIds).map(([sourceId, nodeId]) => [nodeId, sourceId]));
    for (const item of collectCanvasEditMedia(nodes)) {
        if (nodeIds.has(item.nodeId)) continue;
        const ensured = await ensureMediaSource(next, item);
        next = { ...ensured.draft, sourceNodeIds: { ...next.sourceNodeIds, [ensured.sourceId]: item.nodeId } };
        nodeIds.set(item.nodeId, ensured.sourceId);
    }
    return next;
}

export async function getCanvasEditMediaReferences() {
    const keys = await store.keys();
    const drafts = await Promise.all(keys.map((key) => store.getItem<CanvasEditDraft>(key)));
    return drafts.flatMap((draft) => Object.values(draft?.sourceStorageKeys || {}).map((storageKey) => ({ storageKey })));
}

export function editorSnapshot(project: Project, sourceNodeIds: Record<string, string>, selection: string | null = null) {
    return {
        sources: project.sources.map((source) => ({ id: source.id, name: source.name, kind: source.kind, duration: source.duration, nodeId: sourceNodeIds[source.id] })),
        tracks: project.tracks.map((track) => ({
            id: track.id,
            kind: track.kind,
            clips: track.clips.map((clip) => ({ id: clip.id, sourceId: clip.sourceId, in: clip.in, out: clip.out, start: clip.start, speed: clip.speed })),
        })),
        durationMs: project.tracks.reduce((duration, track) => Math.max(duration, ...track.clips.map((clip) => clip.start + (clip.out - clip.in) / (clip.speed || 1)), 0), 0),
        selection,
    };
}
