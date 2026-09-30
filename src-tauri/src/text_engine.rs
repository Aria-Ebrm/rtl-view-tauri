use ammonia::Builder;
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

static CODE_REGEX: OnceLock<Regex> = OnceLock::new();
static LINK_REGEX: OnceLock<Regex> = OnceLock::new();
static BOLD_ASTERISK_REGEX: OnceLock<Regex> = OnceLock::new();
static BOLD_UNDERSCORE_REGEX: OnceLock<Regex> = OnceLock::new();
static ITALIC_ASTERISK_REGEX: OnceLock<Regex> = OnceLock::new();
static STRIKE_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_code_regex() -> &'static Regex {
    CODE_REGEX.get_or_init(|| Regex::new(r#"`([^`\n]+)`"#).unwrap())
}

fn get_link_regex() -> &'static Regex {
    LINK_REGEX.get_or_init(|| {
        Regex::new(r#"\[([^\]\n]+)\]\(((?:https?://|mailto:|#)[^\s)]+)\)"#).unwrap()
    })
}

fn get_bold_asterisk_regex() -> &'static Regex {
    BOLD_ASTERISK_REGEX.get_or_init(|| Regex::new(r#"\*\*([^*\n]+)\*\*"#).unwrap())
}

fn get_bold_underscore_regex() -> &'static Regex {
    BOLD_UNDERSCORE_REGEX.get_or_init(|| Regex::new(r#"(?:^|\s)__([^_\n]+)__(?:$|\s)"#).unwrap())
}

fn get_italic_asterisk_regex() -> &'static Regex {
    ITALIC_ASTERISK_REGEX.get_or_init(|| Regex::new(r#"\*([^*\n]+)\*"#).unwrap())
}

fn get_strike_regex() -> &'static Regex {
    STRIKE_REGEX.get_or_init(|| Regex::new(r#"~~([^~\n]+)~~"#).unwrap())
}

/// تبدیل کاراکترهای خاص به Entityهای امن HTML در یک دور (Single-pass buffer allocation)
pub fn html_escape(s: &str) -> String {
    let mut result = String::with_capacity(s.len() + (s.len() / 8).max(16));
    for c in s.chars() {
        match c {
            '&' => result.push_str("&amp;"),
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&#39;"),
            _ => result.push(c),
        }
    }
    result
}

/// حذف برچسب‌های HTML و استخراج متن خالص
pub fn strip_html_tags(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut chars = html.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            if c == '&' {
                let mut entity = String::new();
                while let Some(&next_c) = chars.peek() {
                    if next_c == ';' {
                        chars.next();
                        break;
                    } else if next_c == ' ' || next_c == '<' || entity.len() > 10 {
                        break;
                    } else {
                        entity.push(chars.next().unwrap());
                    }
                }
                match entity.as_str() {
                    "amp" => result.push('&'),
                    "lt" => result.push('<'),
                    "gt" => result.push('>'),
                    "quot" => result.push('"'),
                    "#39" | "apos" => result.push('\''),
                    "nbsp" => result.push(' '),
                    _ => {
                        result.push('&');
                        result.push_str(&entity);
                        result.push(';');
                    }
                }
            } else if !c.is_control() {
                result.push(c);
            }
        }
    }
    result
}

/// شمارش دقیق کاراکترهای مرئی (حذف کامل برچسب‌های HTML و کدهای کنترلی نامرئی BiDi)
pub fn visible_length(html: &str) -> usize {
    let mut count = 0;
    let mut in_tag = false;
    let mut chars = html.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            if c == '&' {
                let mut entity_len = 0;
                while let Some(&next_c) = chars.peek() {
                    if next_c == ';' {
                        chars.next();
                        break;
                    } else if next_c == ' ' || next_c == '<' || entity_len > 10 {
                        break;
                    } else {
                        entity_len += 1;
                        chars.next();
                    }
                }
                count += 1;
            } else if !c.is_control()
                && c != '\u{200E}' // LRM
                && c != '\u{200F}' // RLM
                && c != '\u{202A}' // LRE
                && c != '\u{202B}' // RLE
                && c != '\u{202C}' // PDF
                && c != '\u{202D}' // LRO
                && c != '\u{202E}' // RLO
                && c != '\u{2066}' // LRI
                && c != '\u{2067}' // RLI
                && c != '\u{2068}' // FSI
                && c != '\u{2069}' // PDI
            {
                count += 1;
            }
        }
    }
    count
}

/// بررسی کاراکتر با جهت‌گیری قوی راست‌به‌چپ (فارسی، عربی، عبری و نشانگرهای RTL)
pub fn is_strong_rtl(c: char) -> bool {
    matches!(
        c,
        '\u{0590}'..='\u{05FF}' // Hebrew
        | '\u{0600}'..='\u{06FF}' // Arabic & Persian
        | '\u{0750}'..='\u{077F}' // Arabic Supplement
        | '\u{08A0}'..='\u{08FF}' // Arabic Extended-A
        | '\u{FB50}'..='\u{FDFF}' // Arabic Presentation Forms-A
        | '\u{FE70}'..='\u{FEFF}' // Arabic Presentation Forms-B
        | '\u{200F}' // RLM
        | '\u{202B}' // RLE
        | '\u{202E}' // RLO
        | '\u{2067}' // RLI
    )
}

/// بررسی کاراکتر با جهت‌گیری قوی چپ‌به‌راست (لاتین، الفباهای اروپایی و نشانگرهای LTR)
pub fn is_strong_ltr(c: char) -> bool {
    matches!(
        c,
        'a'..='z'
        | 'A'..='Z'
        | '\u{00C0}'..='\u{024F}' // Latin Extended
        | '\u{0370}'..='\u{03FF}' // Greek
        | '\u{0400}'..='\u{04FF}' // Cyrillic
        | '\u{200E}' // LRM
        | '\u{202A}' // LRE
        | '\u{202D}' // LRO
        | '\u{2066}' // LRI
    )
}

/// تشخیص جهت پاراگراف طبق استانداردهای الگوریتم دوجهته یونیکد (UAX #9 قواعد P2 و P3)
pub fn detect_direction(text: &str) -> &'static str {
    for c in text.chars() {
        if is_strong_rtl(c) {
            return "rtl";
        } else if is_strong_ltr(c) {
            return "ltr";
        }
    }
    "rtl" // پیش‌فرض برای برنامه RTL View
}

/// تشخیص اینکه آیا یک خط بخشی از جدول است یا خیر:
/// - حذف خطاهای مثبت روی متون عادی حاوی خط تیره کشیده `─` (U+2500)
/// - شناسایی جدول‌های استاندارد مارک‌داون GFM بدون نیاز به لوله‌های کناری
pub fn is_table_line(line: &str) -> bool {
    let s = line.trim();
    if s.is_empty() {
        return false;
    }

    // 1. جدول‌های رسم خط یونیکد (Box Drawing)
    // وجود خطوط عمودی یا تقاطع‌ها و گوشه‌های جدول
    let has_vertical_or_corner_box = s.chars().any(|c| {
        matches!(
            c,
            '│' | '┃' | '║' | '╪' | '╫' | '▏' | '▕'
            | '┌' | '┐' | '└' | '┘' | '├' | '┤' | '┬' | '┴' | '┼'
            | '╭' | '╮' | '╰' | '╯'
            | '╔' | '╗' | '╚' | '╝' | '╠' | '╣' | '╦' | '╩' | '╬'
        )
    });
    if has_vertical_or_corner_box {
        return true;
    }

    // بررسی خط جداکننده افقی متشکل صرف از کاراکترهای جدولی (بدون کلمات عادی متنی)
    let is_horizontal_border = s.len() >= 3
        && s.chars().all(|c| {
            matches!(
                c,
                '─' | '━' | '═' | '-' | '+' | '=' | ' ' | '\t'
                | '┌' | '┐' | '└' | '┘' | '├' | '┤' | '┬' | '┴' | '┼'
                | '╔' | '╗' | '╚' | '╝' | '╠' | '╣' | '╦' | '╩' | '╬'
            )
        })
        && s.chars().any(|c| matches!(c, '─' | '━' | '═' | '-' | '+'));
    if is_horizontal_border {
        return true;
    }

    // اگر خط شامل `─` بود اما کلمات متنی فارسی یا انگلیسی داشت و خط مرزی نبود، متن معمولی است و جدول نیست.

    // 2. جدول‌های مارک‌داون لوله‌ای (GFM Pipe Tables)
    let pipe_count = s.chars().filter(|&c| c == '|').count();
    if pipe_count == 0 {
        return false;
    }

    // خط تفکیک‌کننده هدر: مانند |---|---| یا --- | --- یا |:---|---:|
    let is_delimiter_row = s.split('|').all(|cell| {
        let trimmed_cell = cell.trim();
        trimmed_cell.is_empty()
            || (trimmed_cell.chars().all(|c| c == '-' || c == ':' || c == ' ')
                && trimmed_cell.contains('-'))
    }) && pipe_count >= 1 && s.contains('-');
    if is_delimiter_row {
        return true;
    }

    // ردیف جدول با لوله‌های کناری: | col 1 | col 2 |
    if s.starts_with('|') && s.ends_with('|') && pipe_count >= 2 {
        return true;
    }

    // ردیف جدول بدون لوله‌های کناری: col 1 | col 2 | col 3
    if !s.contains("||") && pipe_count >= 1 {
        let cells: Vec<&str> = s.split('|').map(str::trim).collect();
        if cells.len() >= 2
            && cells.iter().all(|c| !c.is_empty())
            && !s.ends_with(';')
            && !s.starts_with("let ")
            && !s.starts_with("const ")
            && !s.starts_with("var ")
        {
            return true;
        }
    }

    false
}

/// محافظت از پرانتزها و براکت‌های تودرتو مانند ((([LTR] RTL))) در متون مختلط راست‌چین
pub fn protect_nested_brackets(text: &str, is_rtl: bool) -> String {
    if !is_rtl || text.is_empty() {
        return text.to_string();
    }

    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();
    let mut result = String::with_capacity(text.len() + 32);

    for i in 0..len {
        let c = chars[i];
        result.push(c);

        // در صورت مشاهده پرانتز یا براکت پایانی
        if c == ')' || c == ']' || c == '}' || c == '»' || c == '›' {
            let mut prev_is_ltr = false;
            for j in (0..i).rev() {
                if is_strong_ltr(chars[j]) || chars[j].is_ascii_digit() {
                    prev_is_ltr = true;
                    break;
                } else if is_strong_rtl(chars[j]) {
                    break;
                }
            }

            let next_is_closing = (i + 1 < len)
                && (chars[i + 1] == ')'
                    || chars[i + 1] == ']'
                    || chars[i + 1] == '}'
                    || chars[i + 1] == '»'
                    || chars[i + 1] == '›');

            // درج نشانگر RLM جهت جلوگیری از پرش براکت به سمت دیگر عبارات انگلیسی
            if prev_is_ltr && !next_is_closing {
                result.push('\u{200F}');
            }
        }
    }

    result
}

/// فرمت‌بندی المان‌های درون‌خطی مارک‌داون (کد، پیوند، پررنگ، مورب، خط‌خورده) و حفاظت دوجهته BiDi
pub fn format_inline(text: &str, is_rtl: bool) -> String {
    if text.is_empty() {
        return String::new();
    }

    let mut tokens: Vec<String> = Vec::new();
    let mut working = String::with_capacity(text.len() + 64);

    // 1. محافظت از کدهای درون‌خطی: `code`
    let code_re = get_code_regex();
    let mut last = 0;
    for mat in code_re.find_iter(text) {
        working.push_str(&text[last..mat.start()]);
        let full = mat.as_str();
        let inner = &full[1..full.len() - 1];
        let placeholder = format!("\x01TOK_{}\x02", tokens.len());
        tokens.push(format!(
            r#"<code class="inline-code">{}</code>"#,
            html_escape(inner)
        ));
        working.push_str(&placeholder);
        last = mat.end();
    }
    if last < text.len() {
        working.push_str(&text[last..]);
    }

    // 2. پیوندهای مارک‌داون با پروتکل امن: [text](url)
    let link_re = get_link_regex();
    let mut link_working = String::with_capacity(working.len() + 32);
    last = 0;
    for caps in link_re.captures_iter(&working) {
        let mat = caps.get(0).unwrap();
        link_working.push_str(&working[last..mat.start()]);
        let label = &caps[1];
        let url = &caps[2];
        let placeholder = format!("\x01TOK_{}\x02", tokens.len());
        tokens.push(format!(
            r#"<a href="{}" class="text-link" target="_blank" rel="noopener noreferrer">{}</a>"#,
            html_escape(url),
            html_escape(label)
        ));
        link_working.push_str(&placeholder);
        last = mat.end();
    }
    if last < working.len() {
        link_working.push_str(&working[last..]);
    }
    working = link_working;

    // 3. متن پررنگ ستاره‌ای: **bold**
    let bold_asterisk_re = get_bold_asterisk_regex();
    working = bold_asterisk_re
        .replace_all(&working, |caps: &regex::Captures| {
            let inner = &caps[1];
            let placeholder = format!("\x01TOK_{}\x02", tokens.len());
            tokens.push(format!("<strong>{}</strong>", html_escape(inner)));
            placeholder
        })
        .to_string();

    // 4. متن پررنگ زیرخط: __bold__
    let bold_underscore_re = get_bold_underscore_regex();
    working = bold_underscore_re
        .replace_all(&working, |caps: &regex::Captures| {
            let inner = &caps[1];
            let placeholder = format!("\x01TOK_{}\x02", tokens.len());
            tokens.push(format!("<strong>{}</strong>", html_escape(inner)));
            placeholder
        })
        .to_string();

    // 5. متن مورب ستاره‌ای: *italic*
    let italic_asterisk_re = get_italic_asterisk_regex();
    working = italic_asterisk_re
        .replace_all(&working, |caps: &regex::Captures| {
            let inner = &caps[1];
            let placeholder = format!("\x01TOK_{}\x02", tokens.len());
            tokens.push(format!("<em>{}</em>", html_escape(inner)));
            placeholder
        })
        .to_string();

    // 6. متن خط‌خورده: ~~strikethrough~~
    let strike_re = get_strike_regex();
    working = strike_re
        .replace_all(&working, |caps: &regex::Captures| {
            let inner = &caps[1];
            let placeholder = format!("\x01TOK_{}\x02", tokens.len());
            tokens.push(format!("<s>{}</s>", html_escape(inner)));
            placeholder
        })
        .to_string();

    // 7. اسکیپ ایمن بخش‌های متنی خام، اعمال حفاظت پرانتزها و بازنشانی توکن‌ها
    let mut result = String::with_capacity(working.len() + 64);
    let mut parts = working.split('\x01');
    if let Some(first) = parts.next() {
        let escaped = html_escape(first);
        result.push_str(&protect_nested_brackets(&escaped, is_rtl));
    }
    for part in parts {
        if let Some((tok_idx_str, remainder)) = part.split_once('\x02') {
            if let Some(idx_str) = tok_idx_str.strip_prefix("TOK_") {
                if let Ok(idx) = idx_str.parse::<usize>() {
                    if idx < tokens.len() {
                        result.push_str(&tokens[idx]);
                    }
                }
            }
            let escaped = html_escape(remainder);
            result.push_str(&protect_nested_brackets(&escaped, is_rtl));
        } else {
            let escaped = html_escape(part);
            result.push_str(&protect_nested_brackets(&escaped, is_rtl));
        }
    }

    result
}

/// هایلایت کدهای درون‌خطی مارک‌داون (سازگار با امضای نسخه قبلی)
pub fn highlight_inline(text: &str) -> String {
    format_inline(text, false)
}

/// پاک‌سازی سخت‌گیرانه HTML با کتابخانه امن Ammonia
/// با حفظ خصوصیات جهت (dir="rtl|ltr")، لینک‌های معتبر با rel="noopener noreferrer" و جدول‌ها
pub fn sanitize_html(raw_html: &str) -> String {
    let mut builder = Builder::new();

    let allowed_tags: HashSet<&str> = [
        "p", "br", "hr", "div", "span",
        "ul", "ol", "li",
        "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
        "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "kbd",
        "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
        "a", "bdi", "bdo",
    ].into_iter().collect();

    // حفظ صفات عمومی مانند dir, class, data-lang
    let generic_attributes: HashSet<&str> = [
        "dir", "class", "data-lang", "title", "id",
    ].into_iter().collect();

    // صفات خاص برای تگ a و جدول‌ها
    let mut tag_attributes = HashMap::new();
    let a_attrs: HashSet<&str> = ["href", "title", "target", "rel"].into_iter().collect();
    let table_attrs: HashSet<&str> = ["colspan", "rowspan", "align", "border"].into_iter().collect();
    tag_attributes.insert("a", a_attrs);
    tag_attributes.insert("td", table_attrs.clone());
    tag_attributes.insert("th", table_attrs);

    let url_schemes: HashSet<&str> = ["http", "https", "mailto"].into_iter().collect();

    builder
        .tags(allowed_tags)
        .generic_attributes(generic_attributes)
        .tag_attributes(tag_attributes)
        .url_schemes(url_schemes)
        .link_rel(Some("noopener noreferrer"))
        .clean_content_tags(["script", "style", "head", "title", "iframe", "object", "embed"].into_iter().collect())
        .clean(raw_html)
        .to_string()
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ProcessedContent {
    pub raw_text: String,
    pub html: String,
    pub visible_length: usize,
    pub is_empty: bool,
    pub is_html: bool,
}

/// بررسی آیا خط یک تیتر مارک‌داون (# تا ######) است
fn parse_heading(line: &str) -> Option<(usize, &str)> {
    let trimmed = line.trim();
    if !trimmed.starts_with('#') {
        return None;
    }
    let mut level = 0;
    for c in trimmed.chars() {
        if c == '#' {
            level += 1;
            if level > 6 {
                return None;
            }
        } else if c == ' ' || c == '\t' {
            break;
        } else {
            return None;
        }
    }
    if level >= 1 && level <= 6 {
        let rest = trimmed[level..].trim();
        Some((level, rest))
    } else {
        None
    }
}

/// بررسی خط نقل‌قول مارک‌داون (> )
fn strip_blockquote_prefix(line: &str) -> Option<&str> {
    let s = line.trim();
    if let Some(rest) = s.strip_prefix('>') {
        Some(rest.strip_prefix(' ').unwrap_or(rest))
    } else {
        None
    }
}

/// بررسی آیتم لیست نامرتب (- , * , + )
fn parse_unordered_list_item(line: &str) -> Option<&str> {
    let s = line.trim();
    if let Some(rest) = s.strip_prefix("- ") {
        Some(rest)
    } else if let Some(rest) = s.strip_prefix("* ") {
        Some(rest)
    } else if let Some(rest) = s.strip_prefix("+ ") {
        Some(rest)
    } else {
        None
    }
}

/// بررسی آیتم لیست مرتب (1. , 2. )
fn parse_ordered_list_item(line: &str) -> Option<&str> {
    let s = line.trim();
    let mut digits = 0;
    let mut chars = s.chars();
    for c in chars.by_ref() {
        if c.is_ascii_digit() {
            digits += 1;
        } else if c == '.' && digits > 0 {
            if chars.next() == Some(' ') {
                return Some(s[digits + 2..].trim());
            }
            return None;
        } else {
            return None;
        }
    }
    None
}

/// بررسی خط جداکننده افقی (--- یا *** یا ___)
fn is_horizontal_rule(line: &str) -> bool {
    let s = line.trim();
    if s.len() < 3 {
        return false;
    }
    let all_dash = s.chars().all(|c| c == '-' || c == ' ') && s.chars().filter(|&c| c == '-').count() >= 3;
    let all_star = s.chars().all(|c| c == '*' || c == ' ') && s.chars().filter(|&c| c == '*').count() >= 3;
    let all_under = s.chars().all(|c| c == '_' || c == ' ') && s.chars().filter(|&c| c == '_').count() >= 3;
    all_dash || all_star || all_under
}

/// پردازش کامل محتوای متنی یا قطعه HTML و تولید خروجی غنی، امن و بهینه
pub fn process_clipboard_payload(payload: &str, is_html: bool) -> ProcessedContent {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return ProcessedContent {
            raw_text: String::new(),
            html: r#"<div class="empty-state">متنی برای نمایش انتخاب نشده است.</div>"#.to_string(),
            visible_length: 0,
            is_empty: true,
            is_html: false,
        };
    }

    if is_html {
        let clean = sanitize_html(trimmed);
        let plain_text = strip_html_tags(&clean);
        let visible_len = visible_length(&clean);
        ProcessedContent {
            raw_text: plain_text,
            html: format!(r#"<div class="html-content">{}</div>"#, clean),
            visible_length: visible_len,
            is_empty: false,
            is_html: true,
        }
    } else {
        let lines: Vec<&str> = payload.lines().collect();
        let mut parts: Vec<String> = Vec::new();

        let mut i = 0;
        let line_count = lines.len();

        while i < line_count {
            let line = lines[i];
            let line_trimmed = line.trim();

            // 1. بلوک‌های کد چندخطی (Fenced Code Blocks)
            if line_trimmed.starts_with("```") || line_trimmed.starts_with("~~~") {
                let fence_prefix = if line_trimmed.starts_with("```") { "```" } else { "~~~" };
                let lang = line_trimmed.strip_prefix(fence_prefix).unwrap_or("").trim();
                let mut code_lines = Vec::new();
                i += 1;

                while i < line_count {
                    let next_trimmed = lines[i].trim();
                    if next_trimmed.starts_with(fence_prefix) {
                        i += 1;
                        break;
                    }
                    code_lines.push(lines[i]);
                    i += 1;
                }

                let code_content = code_lines.join("\n");
                let code_html = if lang.is_empty() {
                    format!(
                        r#"<pre class="code-block" dir="ltr"><code dir="ltr">{}</code></pre>"#,
                        html_escape(&code_content)
                    )
                } else {
                    format!(
                        r#"<pre class="code-block" dir="ltr" data-lang="{}"><code class="language-{}" dir="ltr">{}</code></pre>"#,
                        html_escape(lang),
                        html_escape(lang),
                        html_escape(&code_content)
                    )
                };
                parts.push(code_html);
                continue;
            }

            // خطوط خالی: نادیده گرفته می‌شوند
            if line_trimmed.is_empty() {
                i += 1;
                continue;
            }

            // 2. تیترها (Headings # تا ######)
            if let Some((level, heading_text)) = parse_heading(line) {
                let dir = detect_direction(heading_text);
                let h_html = format!(
                    r#"<h{} dir="{}">{}</h{}>"#,
                    level,
                    dir,
                    format_inline(heading_text, dir == "rtl"),
                    level
                );
                parts.push(h_html);
                i += 1;
                continue;
            }

            // 3. خط جداکننده افقی (---)
            if is_horizontal_rule(line) {
                parts.push("<hr />".to_string());
                i += 1;
                continue;
            }

            // 4. بلوک نقل‌قول (Blockquote > )
            if let Some(first_quote) = strip_blockquote_prefix(line) {
                let mut quote_lines = vec![first_quote];
                i += 1;
                while i < line_count {
                    if let Some(q) = strip_blockquote_prefix(lines[i]) {
                        quote_lines.push(q);
                        i += 1;
                    } else {
                        break;
                    }
                }
                let combined = quote_lines.join("\n");
                let dir = detect_direction(&combined);
                let bq_html = format!(
                    r#"<blockquote dir="{}">{}</blockquote>"#,
                    dir,
                    format_inline(&combined, dir == "rtl")
                );
                parts.push(bq_html);
                continue;
            }

            // 5. لیست‌های نامرتب (- , * , + )
            if let Some(first_item) = parse_unordered_list_item(line) {
                let mut items = vec![first_item];
                i += 1;
                while i < line_count {
                    if let Some(item) = parse_unordered_list_item(lines[i]) {
                        items.push(item);
                        i += 1;
                    } else {
                        break;
                    }
                }
                let all_items_text = items.join(" ");
                let dir = detect_direction(&all_items_text);
                let mut ul_html = format!(r#"<ul dir="{}">"#, dir);
                for item in items {
                    ul_html.push_str(&format!("<li>{}</li>", format_inline(item, dir == "rtl")));
                }
                ul_html.push_str("</ul>");
                parts.push(ul_html);
                continue;
            }

            // 6. لیست‌های مرتب (1. , 2. )
            if let Some(first_item) = parse_ordered_list_item(line) {
                let mut items = vec![first_item];
                i += 1;
                while i < line_count {
                    if let Some(item) = parse_ordered_list_item(lines[i]) {
                        items.push(item);
                        i += 1;
                    } else {
                        break;
                    }
                }
                let all_items_text = items.join(" ");
                let dir = detect_direction(&all_items_text);
                let mut ol_html = format!(r#"<ol dir="{}">"#, dir);
                for item in items {
                    ol_html.push_str(&format!("<li>{}</li>", format_inline(item, dir == "rtl")));
                }
                ol_html.push_str("</ol>");
                parts.push(ol_html);
                continue;
            }

            // 7. جدول‌ها (ASCII / Box / GFM Pipe Tables)
            if is_table_line(line) {
                let mut table_lines = vec![line];
                i += 1;
                while i < line_count {
                    if is_table_line(lines[i]) {
                        table_lines.push(lines[i]);
                        i += 1;
                    } else {
                        break;
                    }
                }
                let combined = table_lines.join("\n");
                let dir = detect_direction(&combined);
                let table_html = format!(
                    r#"<pre class="table-block" dir="{}">{}</pre>"#,
                    dir,
                    html_escape(&combined)
                );
                parts.push(table_html);
                continue;
            }

            // 8. پاراگراف‌های متنی عادی (پشتیبانی از جهت خودکار LTR/RTL)
            let mut text_lines = vec![line];
            i += 1;
            while i < line_count {
                let next_line = lines[i];
                let next_trimmed = next_line.trim();
                if next_trimmed.is_empty()
                    || next_trimmed.starts_with("```")
                    || next_trimmed.starts_with("~~~")
                    || parse_heading(next_line).is_some()
                    || is_horizontal_rule(next_line)
                    || strip_blockquote_prefix(next_line).is_some()
                    || parse_unordered_list_item(next_line).is_some()
                    || parse_ordered_list_item(next_line).is_some()
                    || is_table_line(next_line)
                {
                    break;
                }
                text_lines.push(next_line);
                i += 1;
            }

            let combined = text_lines.join("\n");
            let dir = detect_direction(&combined);
            let p_html = format!(
                r#"<pre class="text-block" dir="auto">{}</pre>"#,
                format_inline(&combined, dir == "rtl")
            );
            parts.push(p_html);
        }

        let rendered = parts.join("\n");
        let visible_len = visible_length(&rendered);

        ProcessedContent {
            raw_text: payload.to_string(),
            html: rendered,
            visible_length: visible_len,
            is_empty: false,
            is_html: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_html_escape_basic() {
        assert_eq!(html_escape("a & b < c > d \" e ' f"), "a &amp; b &lt; c &gt; d &quot; e &#39; f");
        assert_eq!(html_escape(""), "");
        assert_eq!(html_escape("متن ساده فارسی"), "متن ساده فارسی");
    }

    #[test]
    fn test_visible_length_strips_tags_and_entities() {
        assert_eq!(visible_length("<p>تست</p>"), 3);
        assert_eq!(visible_length("<a href=\"https://example.com\" class=\"text-link\">لینک</a>"), 4);
        assert_eq!(visible_length("سلام &amp; خوش آمدید"), 16);
        // Invisible BiDi characters must not be counted as visible
        assert_eq!(visible_length("\u{200E}تست\u{200F}"), 3);
    }

    #[test]
    fn test_direction_detection() {
        assert_eq!(detect_direction("متن فارسی"), "rtl");
        assert_eq!(detect_direction("English text"), "ltr");
        assert_eq!(detect_direction("متن فارسی با کلمات English"), "rtl");
        assert_eq!(detect_direction("English with فارسی words"), "ltr");
        assert_eq!(detect_direction("12345 !@#$%"), "rtl"); // Default
    }

    #[test]
    fn test_table_detection_eliminates_prose_dash_false_positive() {
        // Critical: Prose with `─` (U+2500) must return false
        assert!(!is_table_line("مرحله اول ─ مقدمه"));
        assert!(!is_table_line("بخش دوم ─ توضیحات تکمیلی پروژه"));
    }

    #[test]
    fn test_table_detection_box_drawing() {
        assert!(is_table_line("┌──────┬──────┐"));
        assert!(is_table_line("│ نام  │ سن   │"));
        assert!(is_table_line("├──────┼──────┤"));
        assert!(is_table_line("│ علی  │ ۲۵   │"));
        assert!(is_table_line("└──────┴──────┘"));
        assert!(is_table_line("────────────────────────────"));
    }

    #[test]
    fn test_table_detection_gfm_tables() {
        // Pipe table with outer pipes
        assert!(is_table_line("| Col 1 | Col 2 |"));
        assert!(is_table_line("|:-----:|------:|"));

        // Pipe table WITHOUT outer pipes (Critical requirement)
        assert!(is_table_line("Col 1 | Col 2"));
        assert!(is_table_line("--- | ---"));
        assert!(is_table_line("Value 1 | Value 2"));

        // Non-table code statements must not be detected as tables
        assert!(!is_table_line("let x = a || b;"));
        assert!(!is_table_line("if (cond1 || cond2)"));
    }

    #[test]
    fn test_bidi_nested_brackets_protection() {
        let protected = protect_nested_brackets("((([LTR] RTL)))", true);
        assert!(protected.contains('\u{200F}'));
    }

    #[test]
    fn test_markdown_headings() {
        let payload = "# تیتر یک\n## تیتر دو\n###### تیتر شش";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains(r#"<h1 dir="rtl">تیتر یک</h1>"#));
        assert!(res.html.contains(r#"<h2 dir="rtl">تیتر دو</h2>"#));
        assert!(res.html.contains(r#"<h6 dir="rtl">تیتر شش</h6>"#));
    }

    #[test]
    fn test_markdown_lists() {
        let payload = "- آیتم اول\n- آیتم دوم";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains("<ul dir=\"rtl\">"));
        assert!(res.html.contains("<li>آیتم اول</li>"));
        assert!(res.html.contains("<li>آیتم دوم</li>"));

        let ordered = "1. مورد یک\n2. مورد دو";
        let res_ord = process_clipboard_payload(ordered, false);
        assert!(res_ord.html.contains("<ol dir=\"rtl\">"));
        assert!(res_ord.html.contains("<li>مورد یک</li>"));
    }

    #[test]
    fn test_markdown_blockquotes() {
        let payload = "> نقل قول آزمایشی";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains(r#"<blockquote dir="rtl">نقل قول آزمایشی</blockquote>"#));
    }

    #[test]
    fn test_markdown_links() {
        let payload = "برای اطلاعات بیشتر به [تائوری](https://tauri.app) مراجعه کنید.";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains(r#"<a href="https://tauri.app" class="text-link" target="_blank" rel="noopener noreferrer">تائوری</a>"#));
    }

    #[test]
    fn test_markdown_code_block_with_language_tag() {
        let payload = "```rust\nfn main() {\n    println!(\"hello\");\n}\n```";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains(r#"data-lang="rust""#));
        assert!(res.html.contains(r#"class="language-rust""#));
    }

    #[test]
    fn test_markdown_empty_code_block() {
        let payload = "```\n```";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains(r#"<pre class="code-block" dir="ltr"><code dir="ltr"></code></pre>"#));
        assert!(!res.is_empty);
    }

    #[test]
    fn test_ammonia_preserves_dir_and_links() {
        let html = r#"<p dir="rtl">متن <a href="https://example.com" rel="noopener noreferrer">پیوند</a></p>"#;
        let sanitized = sanitize_html(html);
        assert!(sanitized.contains(r#"dir="rtl""#));
        assert!(sanitized.contains(r#"href="https://example.com""#));
        assert!(sanitized.contains(r#"rel="noopener noreferrer""#));
    }

    #[test]
    fn test_ammonia_strips_malicious_scripts() {
        let malicious = r#"<p>سلام</p><script>alert('xss')</script><iframe src="evil.com"></iframe>"#;
        let sanitized = sanitize_html(malicious);
        assert!(!sanitized.contains("<script>"));
        assert!(!sanitized.contains("<iframe>"));
        assert!(sanitized.contains("<p>سلام</p>"));
    }

    #[test]
    fn test_empty_payload_fallback() {
        let res = process_clipboard_payload("   \n\t  ", false);
        assert!(res.is_empty);
        assert_eq!(res.visible_length, 0);
        assert!(res.html.contains("empty-state"));
    }

    #[test]
    fn test_massive_payload_stress_and_performance() {
        use std::time::Instant;

        // Generate 100,000+ characters with 5,000+ lines
        let mut massive = String::with_capacity(200_000);
        for i in 0..5_200 {
            if i % 100 == 0 {
                massive.push_str("# سرفصل مهم فارسی\n");
            } else if i % 50 == 0 {
                massive.push_str("```rust\nlet x = 42;\n```\n");
            } else if i % 25 == 0 {
                massive.push_str("نام | سن | شهر\n--- | --- | ---\nعلی | ۲۵ | تهران\n");
            } else {
                massive.push_str("این یک خط متن آزمایشی فارسی با کلمات انگلیسی مثل Rust و Tauri برای ارزیابی کارایی است.\n");
            }
        }

        assert!(massive.len() >= 100_000);
        assert!(massive.lines().count() >= 5_000);

        let start = Instant::now();
        let processed = process_clipboard_payload(&massive, false);
        let elapsed = start.elapsed();

        assert!(!processed.is_empty);
        assert!(processed.visible_length > 50_000);
        assert!(elapsed.as_millis() < 50, "Processing took {:?}, expected <50ms", elapsed);
    }

    #[test]
    fn test_html_escape_special_chars_and_quotes() {
        assert_eq!(html_escape("<script>alert(\"xss\" & 'foo')</script>"), "&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;foo&#39;)&lt;/script&gt;");
        assert_eq!(html_escape("&&&"), "&amp;&amp;&amp;");
        assert_eq!(html_escape("'''"), "&#39;&#39;&#39;");
        assert_eq!(html_escape("\"\"\""), "&quot;&quot;&quot;");
    }

    #[test]
    fn test_highlight_inline_single_and_multiple() {
        let text = "استفاده از `first` و سپس `second` در کد";
        let res = highlight_inline(text);
        assert!(res.contains(r#"<code class="inline-code">first</code>"#));
        assert!(res.contains(r#"<code class="inline-code">second</code>"#));
    }

    #[test]
    fn test_highlight_inline_html_special_chars() {
        let text = "تگ `<div>` و خصوصیت `class=\"active\"`";
        let res = highlight_inline(text);
        assert!(res.contains(r#"<code class="inline-code">&lt;div&gt;</code>"#));
        assert!(res.contains(r#"<code class="inline-code">class=&quot;active&quot;</code>"#));
    }

    #[test]
    fn test_highlight_inline_persian_text() {
        let text = "نمونه: `کد تستی فارسی` را ببینید";
        let res = highlight_inline(text);
        assert!(res.contains(r#"<code class="inline-code">کد تستی فارسی</code>"#));
    }

    #[test]
    fn test_highlight_inline_unpaired_and_empty_backticks() {
        let text = "یک ` بک‌تیک تنها و دو `` بک‌تیک خالی";
        let res = highlight_inline(text);
        assert!(!res.is_empty());
    }

    #[test]
    fn test_is_table_line_math_absolute_values() {
        assert!(!is_table_line("|x| + |y| = z"));
        assert!(!is_table_line("مقدار абсолют |value|"));
    }

    #[test]
    fn test_unclosed_code_block_at_eof() {
        let payload = "متن قبل از کد\n```rust\nlet a = 1;\nlet b = 2;";
        let res = process_clipboard_payload(payload, false);
        assert!(!res.is_empty);
        assert!(res.html.contains("let a = 1;"));
    }

    #[test]
    fn test_code_block_with_persian_comments() {
        let payload = "```python\n# این یک کامنت فارسی است\nprint(\"hello\")\n```";
        let res = process_clipboard_payload(payload, false);
        assert!(res.html.contains("این یک کامنت فارسی است"));
        assert!(res.html.contains(r#"class="code-block""#));
    }

    #[test]
    fn test_bidi_nested_complex_brackets() {
        let payload = "متن ((([LTR] RTL))) و پرانتز (نسخه 1.0.229) تست";
        let res = process_clipboard_payload(payload, false);
        assert!(!res.is_empty);
        assert!(res.html.contains("([LTR] RTL)"));
    }

    #[test]
    fn test_ammonia_disallows_dangerous_tags() {
        let dangerous = "<style>body{color:red;}</style><object data=\"test\"></object><embed src=\"test\">";
        let sanitized = sanitize_html(dangerous);
        assert!(!sanitized.contains("<style>"));
        assert!(!sanitized.contains("<object>"));
        assert!(!sanitized.contains("<embed>"));
    }

    #[test]
    fn test_visible_length_multibyte_utf8() {
        // Persian 2-byte characters: each char should count as 1, not 2
        let persian = "سلام دنیا"; // 9 characters (including space)
        let res = process_clipboard_payload(persian, false);
        assert_eq!(res.visible_length, 9);
    }

    #[test]
    fn test_single_character_payloads() {
        let chars = ["آ", "x", "7", "؟", "."];
        for ch in chars {
            let res = process_clipboard_payload(ch, false);
            assert!(!res.is_empty);
            assert_eq!(res.visible_length, 1);
        }
    }
}
