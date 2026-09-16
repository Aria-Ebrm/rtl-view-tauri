use ammonia::Builder;
use regex::Regex;
use std::collections::HashSet;
use std::sync::OnceLock;

static BOX_CHARS: OnceLock<HashSet<char>> = OnceLock::new();
static ENG_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_box_chars() -> &'static HashSet<char> {
    BOX_CHARS.get_or_init(|| {
        "│┃─━┌┐└┘├┤┬┴┼╭╮╰╯═║╔╗╚╝╠╣╦╩╬╪╫▏▕".chars().collect()
    })
}

fn get_eng_regex() -> &'static Regex {
    ENG_REGEX.get_or_init(|| {
        Regex::new(r#"[a-zA-Z0-9_\-\.\:\/\@\=\\]*[a-zA-Z][a-zA-Z0-9_\-\.\:\/\@\=\\]*"#).unwrap()
    })
}

/// تشخیص اینکه آیا یک خط بخشی از جدول است یا خیر (کاراکترهای خطی یا جدول مارک‌داون)
fn is_table_line(line: &str) -> bool {
    let box_chars = get_box_chars();
    if line.chars().any(|c| box_chars.contains(&c)) {
        return true;
    }
    let s = line.trim();
    if s.starts_with('|') && s.chars().filter(|&c| c == '|').count() >= 2 {
        return true;
    }
    false
}

/// هایلایت کلمات، مسیرها، URLها و کدهای انگلیسی با حفظ علائم نگارشی متصل به انتهای کلمه
pub fn highlight_inline(text: &str) -> String {
    let re = get_eng_regex();
    let mut result = String::with_capacity(text.len() + 64);
    let mut last_match = 0;

    for mat in re.find_iter(text) {
        // افزودن متن قبل از تطابق (با اسکیپ کردن HTML)
        result.push_str(&html_escape(&text[last_match..mat.start()]));

        let mut val = mat.as_str();
        let mut trailing = "";

        // جداسازی علائم نگارشی انتهای کلمه که متعلق به متن فارسی هستند
        let trimmed = val.trim_end_matches(['.', ':', ',', ';', '!', '?', '"', '\'', ')']);
        if trimmed.len() < val.len() {
            trailing = &val[trimmed.len()..];
            val = trimmed;
        }

        if val.is_empty() || !val.chars().any(|c| c.is_alphabetic()) {
            result.push_str(&html_escape(mat.as_str()));
        } else {
            result.push_str("<code>");
            result.push_str(&html_escape(val));
            result.push_str("</code>");
            result.push_str(&html_escape(trailing));
        }

        last_match = mat.end();
    }

    if last_match < text.len() {
        result.push_str(&html_escape(&text[last_match..]));
    }

    result
}

/// تبدیل کاراکترهای خاص به Entityهای امن HTML
pub fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// پاک‌سازی سخت‌گیرانه HTML با کتابخانه امن Ammonia
pub fn sanitize_html(raw_html: &str) -> String {
    let mut builder = Builder::new();
    let allowed_tags: HashSet<&str> = [
        "p", "br", "hr", "div", "span",
        "ul", "ol", "li",
        "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
        "strong", "b", "em", "i", "u", "s", "code", "pre", "kbd",
        "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
    ].into_iter().collect();

    builder
        .tags(allowed_tags)
        .clean_content_tags(["script", "style", "head", "title", "iframe", "object", "embed"].into_iter().collect())
        .clean(raw_html)
        .to_string()
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ProcessedContent {
    pub html: String,
    pub visible_length: usize,
    pub is_empty: bool,
}

/// پردازش متن ورودی یا قطعه HTML و تولید خروجی کامل
pub fn process_clipboard_payload(payload: &str, is_html: bool) -> ProcessedContent {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return ProcessedContent {
            html: r#"<div class="empty-state">متنی برای نمایش انتخاب نشده است.</div>"#.to_string(),
            visible_length: 0,
            is_empty: true,
        };
    }

    if is_html {
        let clean = sanitize_html(trimmed);
        let text_only = clean.replace(char::is_control, " ");
        let visible_len = text_only.chars().count();
        ProcessedContent {
            html: format!(r#"<div class="html-content">{}</div>"#, clean),
            visible_length: visible_len,
            is_empty: false,
        }
    } else {
        let lines: Vec<&str> = payload.lines().collect();
        let mut blocks: Vec<(&str, Vec<&str>)> = Vec::new();
        let mut cur_type = None;
        let mut cur_lines = Vec::new();

        for &line in &lines {
            if line.trim().is_empty() {
                if !cur_lines.is_empty() {
                    cur_lines.push(line);
                }
                continue;
            }
            let t = if is_table_line(line) { "table" } else { "text" };
            if Some(t) != cur_type {
                if !cur_lines.is_empty() {
                    blocks.push((cur_type.unwrap(), cur_lines));
                }
                cur_type = Some(t);
                cur_lines = vec![line];
            } else {
                cur_lines.push(line);
            }
        }
        if !cur_lines.is_empty() && cur_type.is_some() {
            blocks.push((cur_type.unwrap(), cur_lines));
        }

        let mut parts = Vec::new();
        for (btype, blines) in blocks {
            let joined = blines.join("\n");
            if btype == "table" {
                parts.push(format!(r#"<pre class="table-block">{}</pre>"#, html_escape(&joined)));
            } else {
                parts.push(format!(r#"<pre class="text-block">{}</pre>"#, highlight_inline(&joined)));
            }
        }

        let rendered = parts.join("\n");
        let visible_len = payload.chars().count();

        ProcessedContent {
            html: rendered,
            visible_length: visible_len,
            is_empty: false,
        }
    }
}
