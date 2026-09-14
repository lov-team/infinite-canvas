# AiCut 本地包

这里保存从 AiCut 0.8.6 公开源码构建的本地 npm 包，前端安装时不需要访问私有 AWS CodeArtifact。

- 项目镜像：https://github.com/lov-team/AiCut
- 上游源码：https://github.com/ipmotionmc/AiCut
- 公开构建：https://github.com/lov-team/AiCut/releases/tag/%40iplex/aicut-react%400.8.6
- 标签：`@iplex/aicut-react@0.8.6`
- 提交：`0375d43abb4937c07f3965593a1922d5429df029`
- 许可：MIT；许可文件已包含在两个 npm 包内

当前文件校验值：

```text
72bd9db1562ff110e791a64f1175d55b26be920aef44d2ab8a22c04db831b149  iplex-aicut-core-0.8.6.tgz
9ef5803adc105c7f9a40de596c5640049819f42d5a312afc9289e3f2ff822952  iplex-aicut-react-0.8.6.tgz
```

重新构建时，在上述提交的 AiCut 仓库中执行：

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @iplex/aicut-core build
corepack pnpm --filter @iplex/aicut-react build
cd packages/core && corepack pnpm pack --pack-destination <本目录>
cd ../react && corepack pnpm pack --pack-destination <本目录>
```
