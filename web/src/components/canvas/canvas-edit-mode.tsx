import { App } from "antd";
import { Film, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    VideoEditor,
    canvasCompositorEngineFactory,
    localeEn,
    localeZh,
    type Theme,
    type VideoEditorApi,
} from "@iplex/aicut-react";
import "@iplex/aicut-core/styles.css";

import { applyCanvasEditorOps } from "@/lib/canvas/canvas-edit-ops";
import { editorSnapshot, loadCanvasEditDraft, saveCanvasEditDraft, syncCanvasMediaSources, type CanvasEditDraft } from "@/lib/canvas/canvas-edit-storage";
import { canvasThemes } from "@/lib/canvas-theme";
import { useCanvasEditStore } from "@/stores/canvas/use-canvas-edit-store";
import { useThemeStore, type ThemeName } from "@/stores/use-theme-store";
import type { CanvasNodeData } from "@/types/canvas";

const enabled = { enabled: true };
const pictureInPicture = { enabled: true, toolbarAdd: false };
const editorThemes: Record<ThemeName, Theme> = {
    light: {
        brand: "#292524",
        secondary: "#57534e",
        controlsBg: "#f5f5f4",
        controlsBorder: "rgba(68, 64, 60, 0.16)",
        controlsText: "#292524",
        controlsHover: "rgba(41, 37, 36, 0.07)",
        controlsActive: "rgba(41, 37, 36, 0.12)",
        previewBg: "#1c1917",
    },
    dark: {
        brand: "#fafaf9",
        secondary: "#d6d3d1",
        controlsBg: "#181715",
        controlsBorder: "rgba(250, 250, 249, 0.1)",
        controlsText: "#f5f5f4",
        controlsHover: "rgba(250, 250, 249, 0.08)",
        controlsActive: "rgba(250, 250, 249, 0.14)",
        previewBg: "#090909",
    },
};

export function CanvasEditMode({ projectId, nodes }: { projectId: string; nodes: CanvasNodeData[] }) {
    const { message } = App.useApp();
    const { t, i18n } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const themeName = useThemeStore((state) => state.theme);
    const register = useCanvasEditStore((state) => state.register);
    const setApi = useCanvasEditStore((state) => state.setApi);
    const setEditor = useCanvasEditStore((state) => state.setEditor);
    const editor = useCanvasEditStore((state) => state.editor);
    const apiRef = useRef<VideoEditorApi | null>(null);
    const draftRef = useRef<CanvasEditDraft | null>(null);
    const nodesRef = useRef(nodes);
    const saveQueueRef = useRef(Promise.resolve());
    const [draft, setDraft] = useState<CanvasEditDraft | null>(null);
    const [apiReady, setApiReady] = useState(false);
    nodesRef.current = nodes;

    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                const loaded = await syncCanvasMediaSources(await loadCanvasEditDraft(projectId), nodesRef.current);
                if (!active) return;
                draftRef.current = loaded;
                setDraft(loaded);
                setEditor(editorSnapshot(loaded.project, loaded.sourceNodeIds));
                await saveCanvasEditDraft(projectId, loaded);
            } catch {
                if (!active) return;
                message.error(t("videoEditor.loadFailed"));
            }
        })();
        return () => {
            active = false;
        };
    }, [message, projectId, setEditor, t]);

    useEffect(() => {
        const current = draftRef.current;
        const api = apiRef.current;
        if (!current || !api) return;
        void (async () => {
            try {
                const synced = await syncCanvasMediaSources({ ...current, project: api.getProject() }, nodes);
                if (synced.project.sources.length === current.project.sources.length) return;
                draftRef.current = synced;
                api.setProject(synced.project);
                setEditor(editorSnapshot(synced.project, synced.sourceNodeIds, api.getSelection()));
            } catch {
                /* keep current sources when a new node cannot be probed */
            }
        })();
    }, [nodes, setEditor]);

    const queueSave = (project: CanvasEditDraft["project"]) => {
        const current = draftRef.current;
        if (!current) return;
        const next = { ...current, project, updatedAt: Date.now() };
        draftRef.current = next;
        setEditor(editorSnapshot(project, next.sourceNodeIds, apiRef.current?.getSelection() || null));
        saveQueueRef.current = saveQueueRef.current
            .catch(() => undefined)
            .then(() => saveCanvasEditDraft(projectId, next))
            .catch(() => {
                message.error(t("videoEditor.saveFailed"));
            });
    };

    useEffect(() => {
        if (!draft || !apiReady) return;
        register({
            getState: () => {
                const current = draftRef.current;
                return editorSnapshot(apiRef.current?.getProject() || current?.project || { version: 1, sources: [], tracks: [] }, current?.sourceNodeIds || {}, apiRef.current?.getSelection() || null);
            },
            applyOps: async (ops) => {
                const current = draftRef.current;
                const api = apiRef.current;
                if (!current || !api) throw new Error(t("canvas.edit.notReady"));
                const result = await applyCanvasEditorOps(api, { ...current, project: api.getProject() }, ops, nodesRef.current);
                draftRef.current = result.draft;
                setEditor(result.state);
                await saveCanvasEditDraft(projectId, result.draft);
                return result.state;
            },
            addFromNode: async (nodeId) => {
                const current = draftRef.current;
                const api = apiRef.current;
                if (!current || !api) return false;
                const result = await applyCanvasEditorOps(api, { ...current, project: api.getProject() }, [{ type: "add_clip", nodeId }], nodesRef.current);
                draftRef.current = result.draft;
                setEditor(result.state);
                await saveCanvasEditDraft(projectId, result.draft);
                return true;
            },
            undo: () => apiRef.current?.undo(),
            redo: () => apiRef.current?.redo(),
        });
        return () => register(null);
    }, [apiReady, draft, projectId, register, setEditor, t]);

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center" style={{ color: theme.node.muted }}>
                <LoaderCircle className="size-5 animate-spin" />
            </div>
        );
    }

    const hasClips = (editor?.tracks || draft.project.tracks).some((track) => track.clips.length > 0);

    return (
        <div className="absolute inset-0 flex min-h-0 flex-col pt-16">
            <div className="relative min-h-0 flex-1 p-2 sm:p-3">
                <div className="h-full min-h-0 overflow-hidden rounded-lg border" style={{ borderColor: theme.toolbar.border, background: themeName === "dark" ? "#090909" : "#1c1917" }}>
                    <VideoEditor
                        apiRef={apiRef}
                        defaultProject={draft.project}
                        locale={i18n.resolvedLanguage?.startsWith("zh") ? localeZh : localeEn}
                        theme={editorThemes[themeName]}
                        playbackEngine={canvasCompositorEngineFactory}
                        previewLayout="fullWidth"
                        timelineHeight={260}
                        trackHeight={52}
                        rulerHeight={24}
                        rulerMinTickPx={80}
                        keyframes={enabled}
                        clipEdgeNav={enabled}
                        clipResize={enabled}
                        pictureInPicture={pictureInPicture}
                        aspect={enabled}
                        onReady={(api) => {
                            apiRef.current = api;
                            setApi(api);
                            setApiReady(true);
                            const current = draftRef.current;
                            if (current) setEditor(editorSnapshot(api.getProject(), current.sourceNodeIds, api.getSelection()));
                        }}
                        onChange={queueSave}
                        onError={() => {
                            message.error(t("videoEditor.playbackFailed"));
                        }}
                        toolbarLeft={<span className="px-1 text-xs opacity-60">{t("videoEditor.timeline")}</span>}
                        style={{ height: "100%", minHeight: 0 }}
                    />
                </div>
                {!hasClips ? (
                    <div className="pointer-events-none absolute inset-x-6 top-[18%] z-10 flex justify-center">
                        <div className="w-full max-w-md rounded-xl border p-6 text-center shadow-xl backdrop-blur" style={{ borderColor: theme.toolbar.border, background: themeName === "dark" ? "rgba(28,25,23,.92)" : "rgba(255,255,255,.95)", color: theme.node.text }}>
                            <Film className="mx-auto size-8 opacity-40" />
                            <h1 className="mt-4 text-lg font-semibold">{t("canvas.edit.emptyTitle")}</h1>
                            <p className="mt-2 text-sm leading-6 text-pretty opacity-60">{t("canvas.edit.emptyDescription")}</p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
