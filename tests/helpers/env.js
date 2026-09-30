/**
 * RTL View Test Environment Helper
 * Zero-dependency sandbox and mock harness for Node.js native test runner
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '../..');
const VIRASTAR_SRC = path.join(ROOT_DIR, 'src/virastar.js');
const CARD_EXPORTER_SRC = path.join(ROOT_DIR, 'src/card-exporter.js');
const APP_SRC = path.join(ROOT_DIR, 'src/app.js');

/**
 * Load Virastar module into a fresh sandbox
 */
function loadVirastar() {
    const code = fs.readFileSync(VIRASTAR_SRC, 'utf8');
    const sandbox = {
        window: {},
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox.window.Virastar;
}

/**
 * Create a mock 2D canvas and context for testing CardExporter
 */
function createMockCanvas(initialWidth = 832, initialHeight = 500) {
    const drawCalls = [];
    const textCalls = [];
    let currentFont = '16px Vazirmatn';
    let currentFillStyle = '#000000';
    let currentStrokeStyle = '#000000';
    let currentLineWidth = 1;
    let currentTextAlign = 'start';
    let currentTextBaseline = 'alphabetic';

    const ctx = {
        get font() { return currentFont; },
        set font(val) { currentFont = val; },
        get fillStyle() { return currentFillStyle; },
        set fillStyle(val) { currentFillStyle = val; },
        get strokeStyle() { return currentStrokeStyle; },
        set strokeStyle(val) { currentStrokeStyle = val; },
        get lineWidth() { return currentLineWidth; },
        set lineWidth(val) { currentLineWidth = val; },
        get textAlign() { return currentTextAlign; },
        set textAlign(val) { currentTextAlign = val; },
        get textBaseline() { return currentTextBaseline; },
        set textBaseline(val) { currentTextBaseline = val; },
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,

        measureText(str) {
            const text = String(str || '');
            // Reasonable approximation for Vazirmatn / Monospace text measurement
            const isMono = currentFont.includes('monospace') || currentFont.includes('Fira');
            const charWidth = isMono ? 9.5 : 8.8;
            return {
                width: text.length * charWidth,
                actualBoundingBoxAscent: 12,
                actualBoundingBoxDescent: 4,
            };
        },

        fillText(text, x, y) {
            const call = {
                type: 'fillText',
                text: String(text),
                x,
                y,
                font: currentFont,
                fillStyle: currentFillStyle,
                textAlign: currentTextAlign,
            };
            drawCalls.push(call);
            textCalls.push(call);
        },

        strokeText(text, x, y) {
            drawCalls.push({ type: 'strokeText', text: String(text), x, y });
        },

        fillRect(x, y, w, h) {
            drawCalls.push({ type: 'fillRect', x, y, w, h, fillStyle: currentFillStyle });
        },

        strokeRect(x, y, w, h) {
            drawCalls.push({ type: 'strokeRect', x, y, w, h, strokeStyle: currentStrokeStyle });
        },

        clearRect(x, y, w, h) {
            drawCalls.push({ type: 'clearRect', x, y, w, h });
        },

        beginPath() { drawCalls.push({ type: 'beginPath' }); },
        closePath() { drawCalls.push({ type: 'closePath' }); },
        moveTo(x, y) { drawCalls.push({ type: 'moveTo', x, y }); },
        lineTo(x, y) { drawCalls.push({ type: 'lineTo', x, y }); },
        quadraticCurveTo(cpx, cpy, x, y) { drawCalls.push({ type: 'quadraticCurveTo', cpx, cpy, x, y }); },
        arc(x, y, r, sa, ea) { drawCalls.push({ type: 'arc', x, y, r, sa, ea }); },
        roundRect(x, y, w, h, r) { drawCalls.push({ type: 'roundRect', x, y, w, h, r }); },
        fill() { drawCalls.push({ type: 'fill', fillStyle: currentFillStyle }); },
        stroke() { drawCalls.push({ type: 'stroke', strokeStyle: currentStrokeStyle }); },
        clip() { drawCalls.push({ type: 'clip' }); },
        save() { drawCalls.push({ type: 'save' }); },
        restore() { drawCalls.push({ type: 'restore' }); },
        scale(sx, sy) { drawCalls.push({ type: 'scale', sx, sy }); },
        translate(tx, ty) { drawCalls.push({ type: 'translate', tx, ty }); },
        drawImage() { drawCalls.push({ type: 'drawImage' }); },

        createLinearGradient(x0, y0, x1, y1) {
            return {
                type: 'LinearGradient',
                x0, y0, x1, y1,
                stops: [],
                addColorStop(pos, color) { this.stops.push({ pos, color }); },
            };
        },
    };

    const canvas = {
        width: initialWidth,
        height: initialHeight,
        style: {},
        getContext(type) {
            if (type === '2d') return ctx;
            return null;
        },
        toDataURL(mime = 'image/png') {
            return `data:${mime};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
        },
        toBlob(callback, mime = 'image/png') {
            if (typeof callback === 'function') {
                callback({ size: 1024, type: mime });
            }
        },
        _ctx: ctx,
        _drawCalls: drawCalls,
        _textCalls: textCalls,
    };

    return canvas;
}

/**
 * Load CardExporter module into a sandbox with canvas and document support
 */
function loadCardExporter() {
    const code = fs.readFileSync(CARD_EXPORTER_SRC, 'utf8');
    const mockCanvas = createMockCanvas();
    const sandbox = {
        window: {
            document: {
                getElementById: (id) => {
                    if (id === 'card-canvas') return mockCanvas;
                    return null;
                },
                createElement: (tag) => {
                    if (tag === 'canvas') return createMockCanvas();
                    return createMockElement('', tag);
                },
                fonts: {
                    ready: Promise.resolve(),
                    check: () => true,
                },
            },
            navigator: {
                userAgent: 'Windows NT 10.0',
                clipboard: {
                    write: async () => {},
                },
            },
        },
    };
    sandbox.document = sandbox.window.document;
    sandbox.navigator = sandbox.window.navigator;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return {
        CardExporter: sandbox.window.CardExporter,
        mockCanvas,
        sandbox,
    };
}

/**
 * Create a mock DOM element
 */
function createMockElement(id = '', tagName = 'div') {
    const listeners = {};
    const classes = new Set();
    const styles = {};
    const attributes = {};
    let childElements = [];
    let _innerHTML = '';
    let _innerText = '';

    const el = {
        id,
        tagName: tagName.toUpperCase(),
        get innerHTML() { return _innerHTML; },
        set innerHTML(val) {
            _innerHTML = String(val);
            // Simple DOM parser for test container children
            childElements = [];
            const blockRegex = /<pre\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/pre>/gi;
            let m;
            while ((m = blockRegex.exec(_innerHTML)) !== null) {
                const child = createMockElement('', 'pre');
                child.classList.add(m[1]);
                child.innerHTML = m[2];
                child.innerText = m[2].replace(/<[^>]+>/g, '');
                childElements.push(child);
            }
            _innerText = _innerHTML.replace(/<[^>]+>/g, '');
        },
        get innerText() { return _innerText || _innerHTML.replace(/<[^>]+>/g, ''); },
        set innerText(val) { _innerText = String(val); },
        textContent: '',
        value: '',
        get children() { return childElements; },
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c),
            toggle: (c, force) => {
                if (force === true) { classes.add(c); return true; }
                if (force === false) { classes.delete(c); return false; }
                if (classes.has(c)) { classes.delete(c); return false; }
                classes.add(c); return true;
            },
            get _classes() { return Array.from(classes); }
        },
        style: {
            setProperty: (prop, val) => { styles[prop] = val; },
            getPropertyValue: (prop) => styles[prop] || '',
            ...styles
        },
        setAttribute: (k, v) => { attributes[k] = String(v); },
        getAttribute: (k) => attributes[k] || null,
        removeAttribute: (k) => { delete attributes[k]; },
        addEventListener: (event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
        },
        removeEventListener: (event, handler) => {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        },
        click: function() {
            if (listeners['click']) {
                listeners['click'].forEach(fn => fn({ preventDefault: () => {}, stopPropagation: () => {} }));
            }
        },
        _dispatch: function(event, evtObj = {}) {
            if (listeners[event]) {
                listeners[event].forEach(fn => fn({ target: el, currentTarget: el, preventDefault: () => {}, stopPropagation: () => {}, ...evtObj }));
            }
        },
        _listeners: listeners,
    };
    return el;
}

/**
 * Load app.js into a fully mocked browser and Tauri environment
 */
function loadApp(overrides = {}) {
    const code = fs.readFileSync(APP_SRC, 'utf8');
    const virastar = loadVirastar();
    const mockCanvas = createMockCanvas();

    const elements = {
        'content-body': createMockElement('content-body', 'div'),
        'char-count': createMockElement('char-count', 'span'),
        'word-count': createMockElement('word-count', 'span'),
        'btn-close': createMockElement('btn-close', 'button'),
        'btn-copy': createMockElement('btn-copy', 'button'),
        'btn-clean-copy': createMockElement('btn-clean-copy', 'button'),
        'btn-virastar': createMockElement('btn-virastar', 'button'),
        'btn-digits': createMockElement('btn-digits', 'button'),
        'btn-pin': createMockElement('btn-pin', 'button'),
        'btn-font-dec': createMockElement('btn-font-dec', 'button'),
        'btn-font-inc': createMockElement('btn-font-inc', 'button'),
        'theme-select': createMockElement('theme-select', 'select'),
        'btn-export-card': createMockElement('btn-export-card', 'button'),
        'card-modal': createMockElement('card-modal', 'div'),
        'card-canvas': mockCanvas,
        'btn-close-modal': createMockElement('btn-close-modal', 'button'),
        'btn-cancel-modal': createMockElement('btn-cancel-modal', 'button'),
        'btn-copy-card-img': createMockElement('btn-copy-card-img', 'button'),
        'btn-save-card-img': createMockElement('btn-save-card-img', 'button'),
        'btn-style-windows': createMockElement('btn-style-windows', 'button'),
        'btn-style-mac': createMockElement('btn-style-mac', 'button'),
    };

    const docListeners = {};
    const winListeners = {};
    const localStorageData = { ...overrides.localStorage };
    const tauriEvents = {};
    const tauriInvocations = [];

    const mockDoc = {
        getElementById: (id) => elements[id] || createMockElement(id),
        documentElement: createMockElement('html', 'html'),
        body: createMockElement('body', 'body'),
        createElement: (tag) => {
            if (tag === 'canvas') return createMockCanvas();
            return createMockElement('', tag);
        },
        addEventListener: (event, fn) => {
            docListeners[event] = docListeners[event] || [];
            docListeners[event].push(fn);
        },
        removeEventListener: (event, fn) => {
            if (docListeners[event]) {
                docListeners[event] = docListeners[event].filter(h => h !== fn);
            }
        },
    };

    const mockWin = {
        Virastar: virastar,
        CardExporter: {
            renderCard: async () => {},
            renderActiveCard: async () => {},
            downloadImage: () => {},
            copyToClipboard: async () => {},
            extractBlocks: () => [],
        },
        localStorage: {
            getItem: (k) => localStorageData[k] !== undefined ? localStorageData[k] : null,
            setItem: (k, v) => { localStorageData[k] = String(v); },
            removeItem: (k) => { delete localStorageData[k]; },
            clear: () => { for (let k in localStorageData) delete localStorageData[k]; },
        },
        navigator: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            clipboard: {
                writeText: async (t) => { mockWin._clipboardText = t; },
                write: async () => {},
            },
        },
        alert: (msg) => { mockWin._lastAlert = msg; },
        document: mockDoc,
        addEventListener: (event, fn) => {
            winListeners[event] = winListeners[event] || [];
            winListeners[event].push(fn);
        },
        __TAURI__: {
            core: {
                invoke: async (cmd, args) => {
                    tauriInvocations.push({ cmd, args });
                    if (cmd === 'get_current_content') {
                        return overrides.initialContent || {
                            raw_text: '',
                            html: '<div class="empty-state">متنی برای نمایش انتخاب نشده است.</div>',
                            visible_length: 0,
                            is_empty: true,
                            is_html: false,
                        };
                    }
                    if (cmd === 'hide_window') return true;
                    if (cmd === 'set_pinned') return true;
                    return null;
                },
            },
            event: {
                listen: (event, handler) => {
                    tauriEvents[event] = tauriEvents[event] || [];
                    tauriEvents[event].push(handler);
                    return () => {
                        tauriEvents[event] = tauriEvents[event].filter(h => h !== handler);
                    };
                },
            },
        },
    };

    const sandbox = {
        window: mockWin,
        document: mockDoc,
        localStorage: mockWin.localStorage,
        navigator: mockWin.navigator,
        console: console,
        alert: mockWin.alert,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
    };

    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    return {
        elements,
        sandbox,
        virastar,
        mockCanvas,
        mockWin,
        mockDoc,
        tauriEvents,
        tauriInvocations,
        emitTauriEvent: (event, payload) => {
            if (tauriEvents[event]) {
                tauriEvents[event].forEach(fn => fn({ payload }));
            }
        },
        pressKey: (key, ctrlKey = false, altKey = false, shiftKey = false) => {
            const evt = {
                key,
                ctrlKey,
                altKey,
                shiftKey,
                preventDefault: () => {},
                stopPropagation: () => {},
            };
            if (docListeners['keydown']) {
                docListeners['keydown'].forEach(fn => fn(evt));
            }
        },
    };
}

module.exports = {
    loadVirastar,
    loadCardExporter,
    createMockCanvas,
    createMockElement,
    loadApp,
};
