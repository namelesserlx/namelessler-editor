import { EditorRoot } from './EditorRoot';
import type { EditorProps } from './types';

export function Editor(props: EditorProps) {
    return <EditorRoot {...props} />;
}

export default Editor;
