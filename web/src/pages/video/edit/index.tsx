import { App, Button, Input, Tooltip } from "antd";
import { ArrowLeft, Check, FileJson, Film, FolderOpen, LoaderCircle, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import {
    VideoEditor,
    canvasCompositorEngineFactory,
    localeEn,
    localeZh,
    type Project,
    type Theme,
    type VideoEditorApi,
} from "@iplex/aicut-react";
import "@iplex/aicut-core/styles.css";

import { AssetPickerModal, type InsertAssetPayload } from "@/components/canvas/asset-picker-modal";
import { uploadMediaFile } from "@/services/file-storage";
import { useAssetStore } from "@/stores/use-asset-store";
import { useThemeStore, type ThemeName } from "@/stores/use-theme-store";
import { appendVideoToDraft, createEmptyVideoProject, loadVideoEditorDraft, saveVideoEditorDraft, type EditorVideoInput, type VideoEditorDraft } from "./project-storage";

type RouteState = { video?: EditorVideoInput };

const enabled = { enabled: true };
const pictureInPicture = { enabled: true, toolbarAdd: true };
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

export default function VideoEditPage() {
    const { message, modal } = App.useApp();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const apiRef = useRef<VideoEditorApi | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadModeRef = useRef<"append" | "overlay">("append");
    const routeVideoRef = useRef((location.state as RouteState | null)?.video);
    const initialCopyRef = useRef({ untitled: t("videoEditor.untitled"), loadFailed: t("videoEditor.loadFailed") });
    const draftRef = useRef<VideoEditorDraft | null>(null);
    const titleRef = useRef("");
    const saveQueueRef = useRef(Promise.resolve());
    const addAsset = useAssetStore((state) => state.addAsset);
    const themeName = useThemeStore((state) => state.theme);
    const [draft, setDraft] = useState<VideoEditorDraft | null>(null);
    const [titleInputKey, setTitleInputKey] = useState(0);
    const [hasMedia, setHasMedia] = useState(false);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);

    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                let loaded = await loadVideoEditorDraft(initialCopyRef.current.untitled);
                if (routeVideoRef.current) {
                    loaded = await appendVideoToDraft(loaded, routeVideoRef.current, "append", true);
                    await saveVideoEditorDraft(loaded);
                    routeVideoRef.current = undefined;
                    navigate("/video/edit", { replace: true });
                }
                if (!active) return;
                draftRef.current = loaded;
                titleRef.current = loaded.title;
                setDraft(loaded);
                setHasMedia(Boolean(loaded.project.sources.length));
            } catch {
                if (!active) return;
                const fallback = { title: initialCopyRef.current.untitled, project: createEmptyVideoProject(), sourceStorageKeys: {}, updatedAt: Date.now() };
                draftRef.current = fallback;
                titleRef.current = fallback.title;
                setDraft(fallback);
                message.error(initialCopyRef.current.loadFailed);
            }
        })();
        return () => {
            active = false;
        };
    }, [message, navigate]);

    const queueSave = (project: Project) => {
        const current = draftRef.current;
        if (!current) return;
        const next = { ...current, title: titleRef.current, project, updatedAt: Date.now() };
        draftRef.current = next;
        setHasMedia((value) => (value === Boolean(project.sources.length) ? value : Boolean(project.sources.length)));
        saveQueueRef.current = saveQueueRef.current
            .catch(() => undefined)
            .then(() => saveVideoEditorDraft(next))
            .catch(() => {
                message.error(t("videoEditor.saveFailed"));
            });
    };

    const addVideo = async (input: EditorVideoInput, mode: "append" | "overlay") => {
        const current = draftRef.current;
        if (!current || !apiRef.current) return false;
        try {
            const next = await appendVideoToDraft({ ...current, project: apiRef.current.getProject() }, input, mode, false, mode === "overlay" ? apiRef.current.getTime() : 0);
            draftRef.current = next;
            apiRef.current.setProject(next.project);
            message.success(t(mode === "overlay" ? "videoEditor.overlayAdded" : "videoEditor.videoAdded"));
            return true;
        } catch {
            message.error(t("videoEditor.readFailed"));
            return false;
        }
    };

    const importVideo = async (file: File) => {
        try {
            const media = await uploadMediaFile(file, "video-editor");
            if (await addVideo({ ...media, title: file.name }, uploadModeRef.current)) {
                addAsset({
                    kind: "video",
                    title: file.name,
                    coverUrl: "",
                    tags: [],
                    source: t("videoEditor.source"),
                    data: { url: media.url, storageKey: media.storageKey, width: media.width || 0, height: media.height || 0, durationMs: media.durationMs, bytes: media.bytes, mimeType: media.mimeType },
                });
            }
        } catch {
            message.error(t("videoEditor.importFailed"));
        }
    };

    const insertAsset = (payload: InsertAssetPayload) => {
        if (payload.kind !== "video") {
            message.warning(t("videoEditor.videoOnly"));
            return;
        }
        setAssetPickerOpen(false);
        void addVideo(payload, "append");
    };

    const exportProject = (project: Project) => {
        const current = draftRef.current;
        if (!current) return;
        const content = { format: "infinite-canvas-aicut", version: 1, title: titleRef.current, project, sourceStorageKeys: current.sourceStorageKeys };
        saveAs(new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }), `${safeFileName(titleRef.current)}.json`);
        message.success(t("videoEditor.projectExported"));
    };

    const createProject = () => {
        modal.confirm({
            title: t("videoEditor.newProject"),
            content: t("videoEditor.newProjectConfirm"),
            okText: t("common.done"),
            cancelText: t("common.cancel"),
            onOk: () => {
                const next = { title: t("videoEditor.untitled"), project: createEmptyVideoProject(), sourceStorageKeys: {}, updatedAt: Date.now() };
                draftRef.current = next;
                titleRef.current = next.title;
                setDraft(next);
                setTitleInputKey((value) => value + 1);
                apiRef.current?.setProject(next.project);
            },
        });
    };

    if (!draft) {
        return (
            <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500 dark:bg-stone-950 dark:text-stone-400">
                <LoaderCircle className="size-5 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
            <header className="flex h-13 shrink-0 items-center gap-2 border-b border-stone-200 bg-stone-50 px-3 dark:border-stone-800 dark:bg-stone-950">
                <Tooltip title={t("videoEditor.backToStudio")}>
                    <Button type="text" shape="circle" icon={<ArrowLeft className="size-4" />} onClick={() => navigate("/video")} />
                </Tooltip>
                <div className="mx-1 h-5 w-px bg-stone-200 dark:bg-stone-800" />
                <Film className="size-4 shrink-0 text-stone-500" />
                <Input
                    key={titleInputKey}
                    variant="borderless"
                    defaultValue={draft.title}
                    className="!w-48 !px-1 !font-medium sm:!w-64"
                    onChange={(event) => {
                        titleRef.current = event.target.value;
                    }}
                    onBlur={() => queueSave(apiRef.current?.getProject() || draft.project)}
                    aria-label={t("videoEditor.projectName")}
                />
                <span className="hidden items-center gap-1 text-xs text-stone-400 sm:flex">
                    <Check className="size-3.5" />
                    {t("videoEditor.autoSaved")}
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <Tooltip title={t("videoEditor.newProject")}>
                        <Button type="text" icon={<Plus className="size-4" />} onClick={createProject}>
                            <span className="hidden md:inline">{t("workbench.new")}</span>
                        </Button>
                    </Tooltip>
                    <Button
                        type="text"
                        icon={<FolderOpen className="size-4" />}
                        onClick={() => setAssetPickerOpen(true)}
                    >
                        <span className="hidden sm:inline">{t("videoEditor.addAsset")}</span>
                    </Button>
                    <Button
                        type="text"
                        icon={<Upload className="size-4" />}
                        onClick={() => {
                            uploadModeRef.current = "append";
                            fileInputRef.current?.click();
                        }}
                    >
                        <span className="hidden sm:inline">{t("videoEditor.importVideo")}</span>
                    </Button>
                    <Button type="primary" icon={<FileJson className="size-4" />} onClick={() => apiRef.current?.requestExport()}>
                        {t("videoEditor.exportProject")}
                    </Button>
                </div>
            </header>

            <main className="relative min-h-0 flex-1 p-2 sm:p-3">
                <div className="h-full min-h-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-900 dark:border-stone-800">
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
                        }}
                        onChange={queueSave}
                        onExport={exportProject}
                        onPictureInPictureAddRequested={() => {
                            uploadModeRef.current = "overlay";
                            fileInputRef.current?.click();
                        }}
                        onError={() => {
                            message.error(t("videoEditor.playbackFailed"));
                        }}
                        toolbarLeft={<span className="px-1 text-xs text-stone-500 dark:text-stone-400">{t("videoEditor.timeline")}</span>}
                        style={{ height: "100%", minHeight: 0 }}
                    />
                </div>
                {!hasMedia ? (
                    <div className="pointer-events-none absolute inset-x-6 top-[18%] z-10 flex justify-center">
                        <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-stone-200 bg-white/95 p-6 text-center shadow-xl backdrop-blur dark:border-stone-700 dark:bg-stone-900/95">
                            <Film className="mx-auto size-8 text-stone-400" />
                            <h1 className="mt-4 text-lg font-semibold">{t("videoEditor.emptyTitle")}</h1>
                            <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">{t("videoEditor.emptyDescription")}</p>
                            <div className="mt-5 flex justify-center gap-2">
                                <Button icon={<FolderOpen className="size-4" />} onClick={() => setAssetPickerOpen(true)}>
                                    {t("videoEditor.addAsset")}
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<Upload className="size-4" />}
                                    onClick={() => {
                                        uploadModeRef.current = "append";
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    {t("videoEditor.importVideo")}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>

            <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importVideo(file);
                    event.target.value = "";
                }}
            />
            <AssetPickerModal open={assetPickerOpen} defaultTab="my-assets" onInsert={insertAsset} onClose={() => setAssetPickerOpen(false)} />
        </div>
    );
}

function safeFileName(value: string) {
    return value.trim().replace(/[\\/:*?"<>|]/g, "-") || "video-project";
}
