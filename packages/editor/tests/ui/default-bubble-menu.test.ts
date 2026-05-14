import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { defaultBubbleMenuShouldShow } from '../../src/ui/menus/DefaultBubbleMenu';
import { resolveEditorUiOptions } from '../../src/ui/types';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: {
            content: 'inline*',
            group: 'block',
            toDOM: () => ['p', 0],
        },
        text: { group: 'inline' },
        image: {
            attrs: { src: { default: '' } },
            atom: true,
            group: 'block',
            selectable: true,
            toDOM: () => ['img'],
        },
        codeBlock: {
            content: 'text*',
            group: 'block',
            code: true,
            toDOM: () => ['pre', ['code', 0]],
        },
    },
});

function createEditorMock(isEditable = true) {
    return { isEditable };
}

function shouldShow(state: EditorState, isEditable = true) {
    const { from, to } = state.selection;

    return defaultBubbleMenuShouldShow({
        editor: createEditorMock(isEditable) as never,
        state,
        from,
        to,
    });
}

describe('defaultBubbleMenuShouldShow', () => {
    it('shows only for non-empty text selections in editable text content', () => {
        const doc = schema.nodes.doc.create(null, [
            schema.nodes.paragraph.create(null, schema.text('Hello')),
        ]);
        const state = EditorState.create({
            doc,
            selection: TextSelection.create(doc, 1, 4),
        });

        expect(shouldShow(state)).toBe(true);
    });

    it('hides for empty selections, readonly editors, node selections, and code blocks', () => {
        const paragraphDoc = schema.nodes.doc.create(null, [
            schema.nodes.paragraph.create(null, schema.text('Hello')),
        ]);
        const imageDoc = schema.nodes.doc.create(null, [
            schema.nodes.image.create({ src: 'https://example.com/image.png' }),
        ]);
        const codeDoc = schema.nodes.doc.create(null, [
            schema.nodes.codeBlock.create(null, schema.text('const value = 1;')),
        ]);

        expect(
            shouldShow(
                EditorState.create({
                    doc: paragraphDoc,
                    selection: TextSelection.create(paragraphDoc, 1, 1),
                }),
            ),
        ).toBe(false);
        expect(
            shouldShow(
                EditorState.create({
                    doc: paragraphDoc,
                    selection: TextSelection.create(paragraphDoc, 1, 4),
                }),
                false,
            ),
        ).toBe(false);
        expect(
            shouldShow(
                EditorState.create({
                    doc: imageDoc,
                    selection: NodeSelection.create(imageDoc, 0),
                }),
            ),
        ).toBe(false);
        expect(
            shouldShow(
                EditorState.create({
                    doc: codeDoc,
                    selection: TextSelection.create(codeDoc, 1, 4),
                }),
            ),
        ).toBe(false);
    });
});

describe('resolveEditorUiOptions', () => {
    it('normalizes bubble menu visibility, z-index, and custom shouldShow', () => {
        const shouldShowOverride = () => true;

        expect(resolveEditorUiOptions({ bubbleMenu: false }).bubbleMenu.enabled).toBe(false);
        expect(
            resolveEditorUiOptions({
                bubbleMenu: {
                    zIndex: 40,
                    shouldShow: shouldShowOverride,
                },
            }).bubbleMenu,
        ).toMatchObject({
            enabled: true,
            zIndex: 40,
            shouldShow: shouldShowOverride,
        });
    });
});
