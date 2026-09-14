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
        <span
            className="px-1 font-medium text-slate-800 dark:text-slate-100"
            style={
                action === "highlight"
                    ? { backgroundColor: `${color}73`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }
                    : { textDecoration: "underline", textDecorationColor: color, textDecorationThickness: 3, textUnderlineOffset: 5 }
            }
        >
            {children}
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

    const stats = [
        { value: t("home.stats.canvas"), label: t("home.stats.canvasLabel") },
        { value: t("home.stats.models"), label: t("home.stats.modelsLabel") },
        { value: t("home.stats.local"), label: t("home.stats.localLabel") },
    ];
    const features = [
        { icon: Workflow, title: t("home.features.workflowTitle"), text: t("home.features.workflowText") },
        { icon: Layers3, title: t("home.features.canvasTitle"), text: t("home.features.canvasText") },
        { icon: Sparkles, title: t("home.features.pluginTitle"), text: t("home.features.pluginText") },
    ];

    return (
        <main className="relative h-full overflow-y-auto bg-[#f8fbff] text-slate-950 dark:bg-[#070b16] dark:text-slate-100">
            <div className="pointer-events-none absolute -left-32 top-16 size-96 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/10" />
            <div className="pointer-events-none absolute -right-24 top-0 size-[30rem] rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-600/10" />
            <div className="pointer-events-none absolute left-1/2 top-72 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-violet-300/15 blur-3xl dark:bg-violet-500/10" />

            <div className="relative mx-auto max-w-6xl px-6 pb-16">
                <section className="flex flex-col items-center pt-14 pb-10 text-center sm:pt-16 sm:pb-12">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-white/75 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur dark:border-cyan-400/20 dark:bg-white/[0.06] dark:text-cyan-100">
                        <Sparkles className="size-3.5 text-cyan-500 dark:text-cyan-300" />
                        LOVBROWSER CREATIVE
                    </div>
                    <h1 className="w-full max-w-4xl text-balance text-4xl font-semibold leading-[1.15] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
                        <span className="bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-500 bg-clip-text text-transparent dark:from-white dark:via-cyan-100 dark:to-cyan-300">{t("home.heroTitle")}</span>
                    </h1>
                    <p className="mt-6 w-full max-w-4xl text-balance text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">
                        <Trans i18nKey="home.description" components={{ canvas: <Highlighter action="underline" color="#FF9800" />, content: <Highlighter action="highlight" color="#87CEFA" /> }} />
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
                </section>

                <section className="grid grid-cols-3 divide-x divide-slate-200/80 overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                    {stats.map((item) => (
                        <div key={item.label} className="px-3 py-4 text-center sm:px-4 sm:py-5">
                            <div className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">{item.value}</div>
                            <div className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs dark:text-slate-400">{item.label}</div>
                        </div>
                    ))}
                </section>

                <section className="mt-4 grid gap-3 sm:grid-cols-3">
                    {features.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 text-blue-700 dark:from-cyan-400/20 dark:to-blue-500/20 dark:text-cyan-200">
                                <Icon className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
                            <p className="mt-2 text-sm leading-6 text-pretty text-slate-500 dark:text-slate-400">{text}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-16 border-t border-slate-200/80 pt-12 dark:border-white/10">
                    <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                        <div className="max-w-2xl">
                            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{t("home.showcaseTitle")}</h2>
                            <p className="mt-2 text-sm leading-7 text-slate-500 sm:text-base dark:text-slate-400">{t("home.showcaseDescription")}</p>
                        </div>
                        <Button type="link" onClick={() => navigate("/prompts")} className="!h-auto !px-0 !text-blue-700 dark:!text-cyan-300" icon={<ArrowRight className="size-4" />} iconPlacement="end">
                            {t("home.viewPrompts")}
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {promptShowcase.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setPreviewIndex(index);
                                    setPreviewOpen(true);
                                }}
                                className={cn(
                                    "group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-none",
                                    index === 0 && "col-span-2",
                                )}
                            >
                                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-3 text-white sm:p-4">
                                    <div className="mb-1.5 flex flex-wrap gap-1.5">
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
            </div>
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
