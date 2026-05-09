# Editor 私有 npm 包发布与能力完善路线图

> 状态：按最新架构决策执行中
>
> 包名：`@namelesserlx/editor`
>
> 适用范围：`packages/editor`

## 1. 第一版结论

第一版目标是把编辑器做成通用、JSON-first、可私有发布的 React 19 SDK。它不再兼容旧 API，也不承载博客业务语义。

已确认决策：

- 包名暂定 `@namelesserlx/editor`
- React 只兼容 19
- 内部唯一权威数据格式是 Tiptap JSON
- 数据库继续使用现有 `content` 字段，保存 JSON 字符串
- HTML / Markdown 只作为导入导出格式
- Markdown 第一版支持 GFM 表格、task list、代码块
- raw HTML 默认禁止或净化
- Mermaid / 数学公式后置
- iframe 等第三方嵌入只提供可控开关和 allowlist 配置
- allowlist 默认空，文档只展示配置方式，不内置站点
- 包内不提供上传 contract、上传校验、上传 UI 业务适配或上传服务绑定
- `@tiptap-codeless/*` 等自定义扩展由业务侧导入，通过 `extensions` 注入
- SDK 核心不绑定业务样式；默认 UI 通过 theme tokens 覆盖
- 支持 `zh-CN` 和 `en-US`
- 第一版不暴露 `messages` override，使用者只传 `locale`
- 高亮语言按需注册
- 测试使用 Vitest + jsdom

## 2. 包边界

编辑器包负责：

- Tiptap JSON 文档模型工具
- 通用 Tiptap extension 工厂
- JSON / HTML / Markdown 导入导出
- DOMPurify HTML 净化
- URL 安全策略
- iframe policy 类型和 allowlist 契约
- React 编辑器组件
- 独立只读渲染组件
- 默认 UI primitives
- i18n 内置文案

编辑器包不负责：

- 文章、评论、代码片段等业务 wrapper
- `ArticleEditor`、`CommentEditor`、`SnippetEditor`、`BlogArticleEditor`
- 上传文件类型、大小、asset 契约校验
- 上传请求、存储服务、COS/S3 适配
- 业务 API client
- `@tiptap-codeless/*` 具体集成

业务应用负责：

- 根据业务场景封装自己的编辑器 wrapper
- 导入并配置 codeless 扩展
- 实现上传 handler 和服务端校验
- 控制保存策略、摘要生成、目录生成、搜索索引文本抽取

## 3. 用户 API

普通使用者优先从根入口导入：

```tsx
import { Editor, createEmptyDocument, type EditorValue } from '@namelesserlx/editor';
import '@namelesserlx/editor/style.css';

const initialContent: EditorValue<'json'> = createEmptyDocument();

<Editor
  value={initialContent}
  locale="zh-CN"
  onChange={(nextValue, meta) => {
    console.log(meta.format, meta.reason, meta.isEmpty);
  }}
/>;
```

默认值：

- `inputFormat = 'json'`
- `outputFormat = inputFormat`
- `locale = 'en-US'`

独立入口只用于明确的 bundle 边界或高级场景：

- `@namelesserlx/editor/readonly`
- `@namelesserlx/editor/core`
- `@namelesserlx/editor/format`
- `@namelesserlx/editor/security`
- `@namelesserlx/editor/i18n`
- `@namelesserlx/editor/ui`

前台文章展示建议使用：

```tsx
import { ReadonlyRenderer } from '@namelesserlx/editor/readonly';
```

这样可以避免编辑 UI 进入前台展示 bundle。

## 4. 格式转换方案

内部统一 Tiptap JSON，三种格式之间不做任意互转矩阵，而是全部经由 JSON：

```text
Markdown -> Tiptap JSON -> Markdown
HTML     -> Tiptap JSON -> HTML
JSON     -> Tiptap JSON -> JSON
```

当前方案：

| 能力                     | 方案                                                     |
| ------------------------ | -------------------------------------------------------- |
| Markdown -> Tiptap JSON  | `@tiptap/markdown` / `MarkdownManager.parse`             |
| Tiptap JSON -> Markdown  | `@tiptap/markdown` / `MarkdownManager.serialize`         |
| HTML -> Tiptap JSON      | `@tiptap/html` / `generateJSON`                          |
| Tiptap JSON -> HTML      | `@tiptap/html` / `generateHTML`                          |
| JSON 归一化              | `normalizeEditorJson`                                    |
| raw HTML 安全边界        | DOMPurify + `HtmlPolicy`                                 |
| 自定义 Markdown 语法     | 由 Tiptap extension 自己提供 parse/render/tokenizer 能力 |
| 自定义节点、marks、attrs | 通过调用方传入 `extensions` 保留 schema 信息             |

性能原则：

- 编辑器受控值默认使用 JSON，避免频繁 Markdown/HTML 序列化
- `onChange` 默认输出 JSON，导出 HTML / Markdown 只在保存、预览或显式请求时执行
- 高亮语言按需注册，默认不打包所有语言
- 只读渲染独立入口，避免前台引入编辑 UI

丢失信息风险：

- JSON 是唯一完整格式，能最大程度保留自定义 node、mark、attrs、schema 信息
- Markdown 不是完全无损格式，不适合保存为主存储
- HTML 能表达更多结构，但仍可能因为 sanitize、schema 缺失或扩展缺失丢失自定义信息
- 自定义节点如果需要 Markdown/HTML 无损导入导出，业务 extension 必须提供对应 parse/render 逻辑

## 5. 安全边界

XSS：

- HTML 输入先经过 DOMPurify
- 粘贴 HTML 也经过同一策略
- URL 默认限制危险协议
- raw HTML 默认不作为可信内容
- 只读渲染输出 HTML 前同样经过净化链路

CSRF：

- 编辑器包不直接请求业务 API，因此不在包内处理 CSRF token
- CSRF 由应用和服务端处理：`SameSite`、Origin/Referer 校验、CSRF token、鉴权、上传接口限流

第三方嵌入：

- iframe 默认关闭
- allowlist 默认空
- 使用者显式传入扩展和 policy 后才启用

上传：

- 通用编辑器包不提供上传能力
- 上传 handler、文件校验、asset 校验和服务端安全策略全部在业务侧实现

## 6. 自定义扩展示例

业务侧使用 codeless 扩展：

```tsx
import { Editor } from '@namelesserlx/editor';
import { CodeBlockPro } from '@tiptap-codeless/extension-code-block-pro';
import { DragHandle } from '@tiptap-codeless/extension-drag-handle';
import { FileUpload } from '@tiptap-codeless/extension-file-upload';

<Editor
  value={content}
  extensions={[
    CodeBlockPro.configure({
      defaultLanguage: 'javascript',
      theme: 'auto',
    }),
    DragHandle.configure({
      insertMenu: {
        trigger: '/',
      },
    }),
    FileUpload.configure({
      storageMode: 'custom',
      upload: uploadArticleAssets,
      imgBubbleMenuConfig: {
        enabled: false,
      },
    }),
  ]}
  editorOptions={{
    features: {
      codeBlock: false,
    },
  }}
/>;
```

`features.codeBlock = false` 用于关闭通用 code block，避免和业务自定义代码块扩展重复注册。

## 7. 第一版任务拆分

已完成或执行中：

- 清理旧 preset 和旧 API
- 根入口导出常用 API
- 默认 JSON input/output
- 独立 readonly 入口
- 移除 upload 子入口和 upload 校验
- 移除编辑器包内 codeless 依赖
- 应用侧恢复业务自定义扩展
- 文章内容保存为 JSON 字符串
- 前台只读渲染读取 JSON
- SEO、目录、搜索索引从 JSON 抽取文本
- seed 数据改为 JSON-first
- Vitest 覆盖 package boundary、格式、安全、React、readonly

后续任务：

- 已完成：完善 toolbar、bubble menu、link popover、color picker 的通用 UI；`/` 命令菜单由业务扩展承接
- 已完成：iframe extension spike，默认关闭，allowlist 默认空
- 已完成：Markdown 自定义语法 spike，覆盖自定义 block node、inline mark、attrs 往返
- 已完成：大文档格式转换性能烟测
- 已完成：包体积分析和入口拆分复查，`/readonly` 不引入编辑 UI
- 待发布前最终复查：`README`、`CHANGELOG`、license、exports、peer deps、sideEffects

## 8. 发布前检查

必须通过：

- `pnpm --filter @namelesserlx/editor test`
- `pnpm --filter @namelesserlx/editor build`
- `pnpm --filter @namelesserlx/editor size`
- `pnpm --filter @blog/client build`
- `pnpm --filter @blog/next test:unit`
- `pnpm --filter @blog/next build`
- `pnpm --filter @blog/server test`
- `pnpm --filter @blog/db build`

发布前还要检查：

- `package.json` exports 不包含业务入口
- 根入口 API 简单清晰
- `/readonly` 不依赖编辑 UI
- codeless 依赖只出现在业务应用
- upload 依赖只出现在业务应用或服务端
- docs 不再暗示编辑器包内置上传
