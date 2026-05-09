import { useState } from 'react';
import {
    Editor,
    createEmptyDocument,
    type EditorFormat,
    type EditorValue,
    useEditorController,
} from '@namelesserlx/editor';
import '@namelesserlx/editor/style.css';
import './App.css';

const sampleJson: EditorValue<'json'> = {
    type: 'doc',
    content: [
        {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'namelessler editor playground' }],
        },
        {
            type: 'paragraph',
            content: [
                {
                    type: 'text',
                    text: 'This workspace is wired to the local editor package so you can verify package changes before publishing.',
                },
            ],
        },
        {
            type: 'bulletList',
            content: [
                {
                    type: 'listItem',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'JSON-first content model' }],
                        },
                    ],
                },
                {
                    type: 'listItem',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'HTML and Markdown import/export' }],
                        },
                    ],
                },
                {
                    type: 'listItem',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'Workspace-ready React integration' }],
                        },
                    ],
                },
            ],
        },
    ],
};

const sampleMarkdown = `# Shipping notes

- Playground uses the local workspace package
- Editor output can be inspected as JSON, Markdown, or HTML
- This repo is ready to separate from the original Blog monorepo
`;

function App() {
    const [previewFormat, setPreviewFormat] = useState<EditorFormat>('json');
    const controller = useEditorController({
        defaultContent: sampleJson,
        contentFormat: 'json',
        locale: 'en-US',
    });

    const previewValue = !controller.isReady
        ? '// Booting editor...'
        : previewFormat === 'json'
          ? JSON.stringify(controller.getJSON(), null, 2)
          : previewFormat === 'markdown'
            ? controller.getMarkdown()
            : controller.getHTML();

    return (
        <div className="playground-shell">
            <header className="topbar">
                <div>
                    <p className="eyebrow">Standalone Monorepo</p>
                    <h1>Editor Playground</h1>
                </div>
                <div className="status-strip">
                    <span>{controller.isReady ? 'ready' : 'starting'}</span>
                    <span>{controller.isDirty ? 'dirty' : 'clean'}</span>
                    <span>{controller.isEmpty ? 'empty' : 'has content'}</span>
                </div>
            </header>

            <main className="workspace">
                <aside className="sidebar">
                    <section className="panel">
                        <h2>Content</h2>
                        <div className="button-row">
                            <button type="button" onClick={() => controller.setContent(sampleJson)}>
                                Load JSON
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    controller.setContent(sampleMarkdown, { format: 'markdown' })
                                }
                            >
                                Load Markdown
                            </button>
                            <button
                                type="button"
                                onClick={() => controller.setContent(createEmptyDocument())}
                            >
                                Reset
                            </button>
                        </div>
                    </section>

                    <section className="panel">
                        <h2>Preview</h2>
                        <div
                            className="segmented-control"
                            role="tablist"
                            aria-label="Preview format"
                        >
                            {(['json', 'markdown', 'html'] as EditorFormat[]).map((format) => (
                                <button
                                    key={format}
                                    type="button"
                                    className={previewFormat === format ? 'active' : undefined}
                                    onClick={() => setPreviewFormat(format)}
                                >
                                    {format.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <pre>{previewValue}</pre>
                    </section>
                </aside>

                <section className="editor-stage">
                    <div className="editor-stage-header">
                        <h2>Local Package Render</h2>
                        <span>@namelesserlx/editor</span>
                    </div>
                    <div className="editor-canvas">
                        <Editor controller={controller} />
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
