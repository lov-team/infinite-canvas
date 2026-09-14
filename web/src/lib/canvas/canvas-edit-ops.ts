import type { VideoEditorApi } from "@iplex/aicut-react";
import { nanoid } from "nanoid";

import { appendVideoToDraft } from "@/pages/video/edit/project-storage";
import type { CanvasNodeData } from "@/types/canvas";

import { collectCanvasEditMedia, editorSnapshot, type CanvasEditDraft } from "./canvas-edit-storage";

export type CanvasWorkspaceMode = "canvas" | "edit";

export type CanvasEditorOp =
    | { type: "add_clip"; sourceId?: string; nodeId?: string; mode?: "append" | "overlay"; startMs?: number; in?: number; out?: number }
    | { type: "move_clip"; clipId: string; start?: number; trackId?: string; newTrack?: boolean }
    | { type: "split"; timeMs?: number; clipId?: string }
    | { type: "trim_left"; timeMs?: number }
    | { type: "trim_right"; timeMs?: number }
    | { type: "remove_clip"; clipId: string }
    | { type: "set_selection"; clipId?: string | null };

export type CanvasEditorState = ReturnType<typeof editorSnapshot>;

export async function applyCanvasEditorOps(api: VideoEditorApi, draft: CanvasEditDraft, ops: CanvasEditorOp[], nodes: CanvasNodeData[]) {
    let next = { ...draft, project: api.getProject() };
    for (const op of ops) {
        if (op.type === "add_clip") {
            const sourceId = op.sourceId || (op.nodeId ? Object.entries(next.sourceNodeIds).find(([, nodeId]) => nodeId === op.nodeId)?.[0] : undefined);
            const media = op.nodeId ? collectCanvasEditMedia(nodes).find((item) => item.nodeId === op.nodeId) : undefined;
            if (!sourceId && !media) throw new Error("未找到可加入时间线的素材");
            if (media && !sourceId) {
                next = await appendVideoToDraft(next, media, op.mode === "overlay" ? "overlay" : "append", false, op.startMs || 0);
                const mapped = next.project.sources.find((item) => (media.storageKey ? next.sourceStorageKeys[item.id] === media.storageKey : item.name === media.title) && !next.sourceNodeIds[item.id]);
                if (mapped) next = { ...next, sourceNodeIds: { ...next.sourceNodeIds, [mapped.id]: media.nodeId } };
                api.setProject(next.project);
                next = { ...next, project: api.getProject() };
                continue;
            }
            const source = next.project.sources.find((item) => item.id === sourceId);
            if (!source) throw new Error("未找到可加入时间线的素材");
            const clip = {
                id: nanoid(),
                sourceId: source.id,
                in: op.in ?? 0,
                out: op.out ?? source.duration ?? 0,
                start: 0,
                ...(op.mode === "overlay" ? { scale: 0.4 } : {}),
            };
            if (op.mode === "overlay") {
                clip.start = Math.max(0, Math.round(op.startMs ?? api.getTime()));
                next = { ...next, project: { ...next.project, tracks: [{ id: nanoid(), kind: "video", clips: [clip] }, ...next.project.tracks] } };
            } else {
                const kind = source.kind === "audio" ? "audio" : "video";
                let targetIndex = -1;
                for (let index = next.project.tracks.length - 1; index >= 0; index -= 1) {
                    if (next.project.tracks[index].kind === kind) targetIndex = index;
                }
                const tracks = targetIndex < 0
                    ? [...next.project.tracks, { id: nanoid(), kind, clips: [clip] }]
                    : next.project.tracks.map((track, index) => {
                        if (index !== targetIndex) return track;
                        const start = op.startMs ?? track.clips.reduce((end, item) => Math.max(end, item.start + (item.out - item.in) / (item.speed || 1)), 0);
                        return { ...track, clips: [...track.clips, { ...clip, start }] };
                    });
                next = { ...next, project: { ...next.project, tracks } };
            }
            api.setProject(next.project);
            next = { ...next, project: api.getProject() };
            continue;
        }
        if (op.type === "move_clip") api.moveClip(op.clipId, { start: op.start, trackId: op.trackId, newTrack: op.newTrack });
        if (op.type === "split") {
            if (op.clipId) api.setSelection(op.clipId);
            api.split(op.timeMs);
        }
        if (op.type === "trim_left") api.trimLeft(op.timeMs);
        if (op.type === "trim_right") api.trimRight(op.timeMs);
        if (op.type === "remove_clip") api.removeClip(op.clipId);
        if (op.type === "set_selection") api.setSelection(op.clipId ?? null);
        next = { ...next, project: api.getProject() };
    }
    return { draft: { ...next, updatedAt: Date.now() }, state: editorSnapshot(next.project, next.sourceNodeIds, api.getSelection()) };
}
