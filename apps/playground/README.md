# @namelesserlx/editor 示例项目

[English](./README.en-US.md)

这是 `@namelesserlx/editor` 的官方示例项目，用来展示这个编辑器包在真实 React 应用中的集成方式。它不是编辑器包本身，而是一个可部署到 GitHub Pages 的静态演示站点。

## 示例重点

- 通过 `@namelesserlx/editor/style.css` 引入 npm 包默认样式
- 使用 `useEditorController` 和 `Editor` 组合编辑器能力
- 接入 CodeBlock Pro、Drag Handle、File Upload、自定义 AI 自动补全等扩展
- 在气泡菜单中添加自定义 AI 操作入口
- 提供可拖拽宽度的文档问答侧边栏
- 支持 Markdown、HTML、JSON 三种内容导出
- 提供中文和英文两套界面文案，以及中文和英文两份初始化文档

## 本地运行

在仓库根目录执行：

```bash
pnpm --filter @namelesserlx/editor-playground dev
```

构建静态产物：

```bash
pnpm --filter @namelesserlx/editor-playground build
```

预览构建结果：

```bash
pnpm --filter @namelesserlx/editor-playground preview
```

## 国际化

示例项目使用 `i18next` 和 `react-i18next`。

- 默认说明文档：中文
- 支持语言：`zh-CN`、`en-US`
- 首次进入：根据浏览器语言自动识别
- 手动切换：顶部语言切换按钮
- 语言持久化：优先写入 `localStorage`，受限环境下仍可正常切换
- 编辑器内置工具栏语言：跟随当前示例项目语言

相关文件：

```text
src/i18n.ts
src/data/init.zh-CN.json
src/data/init.en-US.json
```

当用户尚未编辑文档时，切换语言会同步切换示例初始化文档；如果用户已经编辑了文档，语言切换只改变界面文案，不会覆盖用户内容。

## AI 配置

这个示例不会内置默认 AI Key。打开页面右上角的 **AI 设置**，可以选择 Google Gemini 或 DeepSeek，并填写你自己的 API Key。

API Key 保存在当前浏览器标签页的 `sessionStorage` 中，关闭标签页后会失效。这样 GitHub Pages 的公开静态页面不会把共享密钥打进前端产物。

## 样式说明

示例项目使用 Tailwind CSS v4 和少量 shadcn 风格的本地 UI token。未使用的 sidebar/chart token 已清理，避免示例项目保留无意义变量。

编辑器包的样式和示例项目样式是分离的。真实用户集成 npm 包时仍然只需要：

```ts
import '@namelesserlx/editor/style.css';
```
