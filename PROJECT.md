# Project: RTL View - Comprehensive Stress Testing, Edge-Case Hardening & Test Suite

## Architecture
RTL View is a lightweight, high-performance desktop utility built with Tauri v2 and Rust for Windows (with cross-platform readiness), designed to render Persian/Arabic RTL text, markdown, and mixed BiDi code with correct typographic rules and export social image cards.

### Module Boundaries & Data Flow:
```
System Clipboard / Hotkey (Ctrl+Alt+F)
       │
       ▼
[src-tauri: clipboard.rs] ──(Atomic SendInput & Retry)──► Win32 Clipboard
       │
       ▼
[src-tauri: text_engine.rs] ──(GFM Markdown, Tables, Ammonia Sanitization, BiDi)
       │
       ▼ Tauri IPC (new-content event / get_current_content command)
[src: app.js] ──(Virastar Pipeline, URL Protection, DOM Rendering)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
[DOM Preview: contentBody]     [src: card-exporter.js] ──(Retina 2x Canvas Card)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Automated Test Suite (Frontend) | Setup Node `node:test` zero-dependency automated test runner in `package.json` covering unit/integration tests | E2E Testing Track | ORIGINAL_REQUEST §R1 |
| 2 | Automated Test Suite (Rust) | Unit tests in `src-tauri/src/text_engine.rs` and integration tests covering parsing, escaping, tables, and fallbacks | E2E Testing Track | ORIGINAL_REQUEST §R1 |
| 3 | Rust Markdown & Block Parser | CommonMark/GFM markdown rendering (headings, bold, italic, blockquotes, lists, links), preserve language tags, keep empty blocks | M1 | Survey E1 & ORIGINAL_REQUEST §R1 |
| 4 | Rust Table Detection Hardening | Fix false positives on `─` prose, support standard markdown tables without outer pipes, isolate table BiDi runs | M1 | Survey E1 & ORIGINAL_REQUEST §R1 |
| 5 | Rust BiDi & Nested Bracket Handling | Insert directional isolates/markers for mixed Persian-English and nested brackets `((([LTR] RTL)))` | M1 | Survey E1 & ORIGINAL_REQUEST §R2 |
| 6 | Ammonia Sanitization & Visible Length | Preserve `dir="rtl|ltr"` attributes on allowed tags, allow sanitized `<a>`, compute visible length excluding HTML tags | M1 | Survey E1 & ORIGINAL_REQUEST §R1 |
| 7 | Rust Allocation & Mutex Safety | Single-pass `html_escape`, eliminate Mutex `.unwrap()` poisoning panic risk, handle massive payloads (>100k chars) | M1 | Survey E1 & ORIGINAL_REQUEST §R2 |
| 8 | OS Shortcut & Clipboard Reliability | Atomic in-flight flag for `trigger_popup`, eliminate synthetic keystroke interleaving/text corruption, clipboard retry loop | M1 | Survey E3 & ORIGINAL_REQUEST §R2 |
| 9 | Virastar Regex & Linguistic Fixes | Fix Teh Marbuta `\b` bug, add Persian punctuation (`؟`, `،`, `؛`) to `bound`, prevent ZWNJ on Heh Malfooz nouns + `است`, fix `بی` pronouns | M2 | Survey E2 & ORIGINAL_REQUEST §R1 |
| 10 | URL & Token Protection | Protect URLs from `toPersianDigits` to avoid corrupting ports/query params, protect unclosed code fences, preserve code tokens | M2 | Survey E2 & ORIGINAL_REQUEST §R1 |
| 11 | Virastar UMD/CJS Module Export | Add CommonJS/UMD export guards to `virastar.js` to enable automated unit testing | M2 | Survey E2 & ORIGINAL_REQUEST §R1 |
| 12 | Frontend Massive Payload DOM Optimization | Mitigate WebView2 layout freezes on 100k+ chars / 5k lines, optimize DOM node creation | M2 | Survey E2 & ORIGINAL_REQUEST §R2 |
| 13 | Canvas Exporter HTML Stripping | Strip non-code HTML tags (e.g. `<a>`, `<span>`) so raw HTML tag attributes are not painted onto canvas | M3 | Survey E3 & ORIGINAL_REQUEST §R1 |
| 14 | Canvas Unicode P2/P3 BiDi Ordering | Base line direction on first strong directional character rather than `hasPersian()` across the line | M3 | Survey E3 & ORIGINAL_REQUEST §R2 |
| 15 | Canvas Memory & Dimension Capping | Bound canvas dimensions (max height <= 4,096px/8,192px) to prevent 4.8GB GPU OOM and Chromium 32,767px crash on 100k+ chars | M3 | Survey E3 & ORIGINAL_REQUEST §R2 |
| 16 | Canvas Line Wrap & Font Readiness | Split oversized tokens exceeding `maxLineWidth`, await `document.fonts.ready` before rendering | M3 | Survey E3 & ORIGINAL_REQUEST §R1 |
| 17 | Canvas Modal State Reset | Invalidate / refresh card modal on new content arrival | M3 | Survey E3 & ORIGINAL_REQUEST §R2 |
| 18 | Massive Payload & Stress Battery | Verify stability, memory, zero panics, zero crashes with >100,000 chars and 5,000+ lines | M4 | ORIGINAL_REQUEST §R2 |
| 19 | Extreme Unicode & BiDi Battery | Verify nested brackets, ZWNJ, RLM/LRM, emojis, ASCII tables across all components | M4 | ORIGINAL_REQUEST §R2 |
| 20 | Rapid Concurrency & Export Battery | Verify rapid shortcut firing, rapid card exports, clipboard concurrency | M4 | ORIGINAL_REQUEST §R2 |
| 21 | 100% E2E Pass Rate & Adversarial Hardening | Pass all Tier 1-4 tests, followed by Tier 5 adversarial stress testing | M4 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Build comprehensive test harness & test suite (Tiers 1-4) in `tests/` across Rust & Frontend | none | DONE |
| M1 | Rust Engine & OS Reliability | Harden `src-tauri/src/text_engine.rs`, `clipboard.rs`, and `lib.rs`: GFM markdown, tables, BiDi isolates, Ammonia attributes, Mutex safety, shortcut atomicity | none | DONE |
| M2 | Frontend Typography & Virastar | Fix `src/virastar.js` regex rules, `src/app.js` URL protection, token isolation, UMD exports, and massive payload DOM performance | none | DONE |
| M3 | Canvas Social Card Exporter | Harden `src/card-exporter.js`: HTML tag stripping, Unicode P2/P3 base direction, dimension capping, word wrap, font readiness | M2 | DONE |
| M4 | Final Milestone: 100% E2E Pass & Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4); Phase 2: Adversarial coverage hardening (Tier 5) | E2E, M1, M2, M3 | IN_PROGRESS |

## Interface Contracts
### Rust Backend ↔ Frontend IPC (`CURRENT_CONTENT` & `new-content`)
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedContent {
    pub raw_text: String,       // Raw input text from clipboard or fallback
    pub html: String,           // Sanitized, GFM-parsed HTML representation
    pub visible_length: usize,  // Count of visible characters (excluding HTML tags)
    pub is_empty: bool,         // True if payload has no substantive text
    pub is_html: bool,          // True if original payload was rich HTML
}
```
- Event: `"new-content"` -> payload: `ProcessedContent`
- Command: `"get_current_content"` -> returns: `ProcessedContent`
- Command: `"toggle_autostart"` -> returns: `Result<bool, String>`

### Frontend `virastar.js` ↔ `app.js`
```javascript
window.Virastar = {
    process: function(text, options),
    normalizeCharacters: function(text),
    fixHalfSpaces: function(text),
    toPersianDigits: function(text),
    cleanupPunctuation: function(text)
};
// UMD / CJS export:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Virastar;
}
```

### Canvas Exporter `card-exporter.js` ↔ `app.js`
```javascript
window.CardExporter = {
    renderCard: async function(canvas, options),
    renderActiveCard: async function(),
    downloadImage: function(canvas, filename),
    copyToClipboard: async function(canvas),
    extractBlocks: function(container)
};
```

## Code Layout
- `src-tauri/src/text_engine.rs`: Rust text processing engine, markdown parsing, tables, sanitization, BiDi.
- `src-tauri/src/clipboard.rs`: Win32 clipboard capture, SendInput simulation, retry mechanisms.
- `src-tauri/src/lib.rs`: Tauri commands, event emissions, window sizing, global shortcuts.
- `src-tauri/src/main.rs`: Application entry point.
- `src/virastar.js`: Persian typographic normalization, ZWNJ rules, digit conversion.
- `src/app.js`: Application logic, UI event handlers, DOM rendering, token protection.
- `src/card-exporter.js`: HTML5 Canvas rendering for social cards, Retina scaling, text wrapping.
- `src/index.html`: Main window structure and card modal.
- `src/style.css`: Application styling, typography, dark/light themes.
- `tests/`: Automated unit, integration, and stress test suites.
