import { create } from "zustand";
import type { VideoEditorApi } from "@iplex/aicut-react";

import type { CanvasEditorOp, CanvasEditorState, CanvasWorkspaceMode } from "@/lib/canvas/canvas-edit-ops";

type CanvasEditHandlers = {
    getState: () => CanvasEditorState;
    applyOps: (ops: CanvasEditorOp[]) => Promise<CanvasEditorState>;
    addFromNode: (nodeId: string) => Promise<boolean>;
    undo: () => void;
    redo: () => void;
};

type CanvasEditStore = {
    mode: CanvasWorkspaceMode;
    editor: CanvasEditorState | null;
    api: VideoEditorApi | null;
    setMode: (mode: CanvasWorkspaceMode) => void;
    setEditor: (editor: CanvasEditorState | null) => void;
    setApi: (api: VideoEditorApi | null) => void;
    register: (handlers: CanvasEditHandlers | null) => void;
    waitReady: () => Promise<CanvasEditHandlers>;
    applyOps: (ops: CanvasEditorOp[]) => Promise<CanvasEditorState>;
    addFromNode: (nodeId: string) => Promise<boolean>;
    undo: () => void;
    redo: () => void;
};

let handlers: CanvasEditHandlers | null = null;
const readyWaiters: Array<(value: CanvasEditHandlers) => void> = [];

export const useCanvasEditStore = create<CanvasEditStore>((set, get) => ({
    mode: "canvas",
    editor: null,
    api: null,
    setMode: (mode) => set({ mode, ...(mode === "canvas" ? { editor: null, api: null } : {}) }),
    setEditor: (editor) => set({ editor }),
    setApi: (api) => set({ api }),
    register: (next) => {
        handlers = next;
        if (next) readyWaiters.splice(0).forEach((resolve) => resolve(next));
    },
    waitReady: () => {
        if (handlers) return Promise.resolve(handlers);
        return new Promise((resolve, reject) => {
            let timer = 0;
            const waiter = (value: CanvasEditHandlers) => {
                window.clearTimeout(timer);
                resolve(value);
            };
            timer = window.setTimeout(() => {
                const index = readyWaiters.indexOf(waiter);
                if (index >= 0) readyWaiters.splice(index, 1);
                reject(new Error("剪辑器尚未就绪"));
            }, 15000);
            readyWaiters.push(waiter);
        });
    },
    applyOps: async (ops) => {
        if (get().mode !== "edit") get().setMode("edit");
        const current = await get().waitReady();
        return current.applyOps(ops);
    },
    addFromNode: async (nodeId) => {
        if (get().mode !== "edit") get().setMode("edit");
        const current = await get().waitReady();
        return current.addFromNode(nodeId);
    },
    undo: () => handlers?.undo(),
    redo: () => handlers?.redo(),
}));
