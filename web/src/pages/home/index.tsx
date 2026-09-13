import { ArrowRight, Layers3, Play, Sparkles, Workflow } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { App, Button, Image, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { navigationTools } from "@/constant/navigation-tools";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

function Highlighter({ action, color, children }: { action: "highlight" | "underline"; color: string; children?: ReactNode }) {
    return (
        <span className="relative inline-block px-1">
            {action === "highlight" ? (
                <span className="absolute inset-x-0 bottom-0 top-1 rounded-sm opacity-45" style={{ backgroundColor: color }} />
            ) : (
                <span className="absolute inset-x-0 bottom-0 h-1 rounded-full opacity-80" style={{ backgroundColor: color }} />
            )}
            <span className="relative font-medium text-slate-800 dark:text-slate-100">{children}</span>
        </span>
    );
}

export default function IndexPage() {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [primaryTool] = navigationTools;
    const [promptShowcase, setPromptShowcase] = useState<Prompt[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        void fetchPrompts({ pageSize: 12 })
            .then((data) => setPromptShowcase(data.items))
            .catch((error) => message.error(error instanceof Error ? error.message : i18n.t("home.promptError")));
    }, [message]);

    return (
        <main className="relative h-full overflow-y-auto bg-[#f8fbff] text-slate-950 dark:bg-[#070b16] dark:text-slate-100">
            <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-20">
                <div className="pointer-events-none absolute -left-32 top-16 size-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/10" />
                <div className="pointer-events-none absolute -right-24 top-0 size-[30rem] rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-600/10" />
                <div className="pointer-events-none absolute left-1/2 top-72 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-violet-300/15 blur-3xl dark:bg-violet-500/10" />

                <div className="relative flex min-h-[560px] flex-col items-center justify-center pt-20 text-center">
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/75 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur dark:border-cyan-400/20 dark:bg-white/[0.06] dark:text-cyan-100">
                        <Sparkles className="size-3.5 text-cyan-500 dark:text-cyan-300" />
                        LOVBROWSER CREATIVE
                    </div>
                    <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-7xl lg:text-8xl dark:text-white">
                        <span className="bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-500 bg-clip-text text-transparent dark:from-white dark:via-cyan-100 dark:to-cyan-300">{t("home.heroTitle")}</span>
                    </h1>
                    <p className="mt-7 max-w-3xl text-balance text-lg leading-8 text-slate-600 dark:text-slate-300">
                        <Trans i18nKey="home.description" components={{ canvas: <Highlighter action="underline" color="#FF9800" />, content: <Highlighter action="highlight" color="#87CEFA" /> }} />
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => navigate(`/${primaryTool.slug}`)}
                            icon={<ArrowRight className="size-4" />}
                            iconPlacement="end"
                            className="!h-12 !rounded-xl !border-0 !bg-slate-950 !px-6 !shadow-[0_12px_30px_rgba(15,23,42,0.2)] hover:!bg-blue-700 dark:!bg-cyan-300 dark:!text-slate-950 dark:hover:!bg-cyan-200"
                        >
                            {t("home.start")}
                        </Button>
                        <Button
                            size="large"
                            onClick={() => navigate("/video")}
                            icon={<Play className="size-4" />}
                            className="!h-12 !rounded-xl !border-slate-300 !bg-white/70 !px-6 !text-slate-700 hover:!border-blue-300 hover:!text-blue-700 dark:!border-slate-700 dark:!bg-white/[0.06] dark:!text-slate-200 dark:hover:!border-cyan-400 dark:hover:!text-cyan-200"
                        >
                            {t("home.openVideo")}
                        </Button>
                    </div>
                    <div className="mt-12 grid w-full max-w-2xl grid-cols-3 divide-x divide-slate-200/80 rounded-2xl border border-white/80 bg-white/60 px-4 py-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                        <div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-white">{t("home.stats.canvas")}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("home.stats.canvasLabel")}</div>
                        </div>
                        <div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-white">{t("home.stats.models")}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("home.stats.modelsLabel")}</div>
                        </div>
                        <div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-white">{t("home.stats.local")}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("home.stats.localLabel")}</div>
                        </div>
                    </div>
                </div>

                <section className="relative mx-auto mb-20 grid max-w-6xl gap-4 md:grid-cols-3">
                    {[
                        { icon: Workflow, title: t("home.features.workflowTitle"), text: t("home.features.workflowText") },
                        { icon: Layers3, title: t("home.features.canvasTitle"), text: t("home.features.canvasText") },
                        { icon: Sparkles, title: t("home.features.pluginTitle"), text: t("home.features.pluginText") },
                    ].map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 text-blue-700 dark:from-cyan-400/20 dark:to-blue-500/20 dark:text-cyan-200">
                                <Icon className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
                        </div>
                    ))}
                </section>

                <section className="relative mx-auto max-w-6xl border-t border-slate-200/80 pt-12 dark:border-white/10">
                    <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
                        <div />
                        <div className="max-w-2xl text-center">
                            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{t("home.showcaseTitle")}</h2>
                            <p className="mt-3 text-base leading-7 text-slate-500 dark:text-slate-400">{t("home.showcaseDescription")}</p>
                        </div>
                        <Button type="link" onClick={() => navigate("/prompts")} className="!text-blue-700 justify-self-center md:justify-self-end dark:!text-cyan-300" icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            {t("home.viewPrompts")}
                        </Button>
                    </div>
                    <div className="grid auto-rows-[210px] gap-4 md:grid-cols-4">
                        {promptShowcase.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setPreviewIndex(index);
                                    setPreviewOpen(true);
                                }}
                                className={cn(
                                    "group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-none",
                                    index === 0 && "md:col-span-2 md:row-span-2",
                                    index === 3 && "md:col-span-2",
                                )}
                            >
                                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 text-white">
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {item.tags.slice(0, 2).map((tag) => (
                                            <Tag key={tag} variant="filled" className="m-0 bg-white/15 text-[11px] text-white backdrop-blur">
                                                {tag}
                                            </Tag>
                                        ))}
                                    </div>
                                    <h3 className="text-sm font-medium">{item.title}</h3>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">{item.prompt}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </section>
            <Image.PreviewGroup
                preview={{
                    open: previewOpen,
                    current: previewIndex,
                    onOpenChange: setPreviewOpen,
                    onChange: setPreviewIndex,
                }}
            >
                <div className="hidden">
                    {promptShowcase.map((item) => (
                        <Image key={item.id} src={item.coverUrl} alt={item.title} />
                    ))}
                </div>
            </Image.PreviewGroup>
        </main>
    );
}
