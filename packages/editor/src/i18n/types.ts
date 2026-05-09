export type EditorLocale = 'en-US' | 'zh-CN';

export interface EditorMessages {
    toolbar: {
        bold: string;
        italic: string;
        underline: string;
        strike: string;
        code: string;
        link: string;
        unlink: string;
        bulletList: string;
        orderedList: string;
        taskList: string;
        blockquote: string;
        codeBlock: string;
        table: string;
        heading: string;
        heading1: string;
        heading2: string;
        heading3: string;
        paragraph: string;
        textColor: string;
        backgroundColor: string;
        alignLeft: string;
        alignCenter: string;
        alignRight: string;
        alignJustify: string;
        horizontalRule: string;
        iframe: string;
        undo: string;
        redo: string;
    };
    bubbleMenu: {
        openLink: string;
        editLink: string;
        removeLink: string;
    };
    linkPopover: {
        urlPlaceholder: string;
        textPlaceholder: string;
        save: string;
        remove: string;
        open: string;
    };
    colorPicker: {
        textColor: string;
        backgroundColor: string;
        clear: string;
    };
    tableMenu: {
        addRowBefore: string;
        addRowAfter: string;
        deleteRow: string;
        addColumnBefore: string;
        addColumnAfter: string;
        deleteColumn: string;
        deleteTable: string;
    };
    readonly: {
        empty: string;
    };
}
