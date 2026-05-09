import { afterEach } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function createRect(): DOMRect {
    return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
    };
}

function createRectList(): DOMRectList {
    const rect = createRect();
    return {
        0: rect,
        length: 1,
        item: (index: number) => (index === 0 ? rect : null),
        [Symbol.iterator]: function* iterator() {
            yield rect;
        },
    };
}

if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = createRect;
}

if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = createRectList;
}

if (!Text.prototype.getClientRects) {
    Text.prototype.getClientRects = createRectList;
}

if (!Text.prototype.getBoundingClientRect) {
    Text.prototype.getBoundingClientRect = createRect;
}

afterEach(() => {
    document.body.innerHTML = '';
});
