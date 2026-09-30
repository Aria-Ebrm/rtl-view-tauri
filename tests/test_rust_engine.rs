// Standalone test suite for text_engine pure logic
// Compiles to wasm32-unknown-unknown to execute and verify in Node.js without requiring host MSVC C++ Build Tools

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
                && c != '\u{200E}'
                && c != '\u{200F}'
                && c != '\u{202A}'
                && c != '\u{202B}'
                && c != '\u{202C}'
                && c != '\u{202D}'
                && c != '\u{202E}'
                && c != '\u{2066}'
                && c != '\u{2067}'
                && c != '\u{2068}'
                && c != '\u{2069}'
            {
                count += 1;
            }
        }
    }
    count
}

pub fn is_strong_rtl(c: char) -> bool {
    matches!(
        c,
        '\u{0590}'..='\u{05FF}'
        | '\u{0600}'..='\u{06FF}'
        | '\u{0750}'..='\u{077F}'
        | '\u{08A0}'..='\u{08FF}'
        | '\u{FB50}'..='\u{FDFF}'
        | '\u{FE70}'..='\u{FEFF}'
        | '\u{200F}'
        | '\u{202B}'
        | '\u{202E}'
        | '\u{2067}'
    )
}

pub fn is_strong_ltr(c: char) -> bool {
    matches!(
        c,
        'a'..='z'
        | 'A'..='Z'
        | '\u{00C0}'..='\u{024F}'
        | '\u{0370}'..='\u{03FF}'
        | '\u{0400}'..='\u{04FF}'
        | '\u{200E}'
        | '\u{202A}'
        | '\u{202D}'
        | '\u{2066}'
    )
}

pub fn detect_direction(text: &str) -> &'static str {
    for c in text.chars() {
        if is_strong_rtl(c) {
            return "rtl";
        } else if is_strong_ltr(c) {
            return "ltr";
        }
    }
    "rtl"
}

pub fn is_table_line(line: &str) -> bool {
    let s = line.trim();
    if s.is_empty() {
        return false;
    }

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

    let pipe_count = s.chars().filter(|&c| c == '|').count();
    if pipe_count == 0 {
        return false;
    }

    let is_delimiter_row = s.split('|').all(|cell| {
        let trimmed_cell = cell.trim();
        trimmed_cell.is_empty()
            || (trimmed_cell.chars().all(|c| c == '-' || c == ':' || c == ' ')
                && trimmed_cell.contains('-'))
    }) && pipe_count >= 1 && s.contains('-');
    if is_delimiter_row {
        return true;
    }

    if s.starts_with('|') && s.ends_with('|') && pipe_count >= 2 {
        return true;
    }

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

            if prev_is_ltr && !next_is_closing {
                result.push('\u{200F}');
            }
        }
    }

    result
}

pub fn parse_heading(line: &str) -> Option<(usize, &str)> {
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

pub fn is_horizontal_rule(line: &str) -> bool {
    let s = line.trim();
    if s.len() < 3 {
        return false;
    }
    let all_dash = s.chars().all(|c| c == '-' || c == ' ') && s.chars().filter(|&c| c == '-').count() >= 3;
    let all_star = s.chars().all(|c| c == '*' || c == ' ') && s.chars().filter(|&c| c == '*').count() >= 3;
    let all_under = s.chars().all(|c| c == '_' || c == ' ') && s.chars().filter(|&c| c == '_').count() >= 3;
    all_dash || all_star || all_under
}

#[no_mangle]
pub extern "C" fn run_all_tests() -> u32 {
    let mut failed = 0;

    // Test 1: HTML escape
    if html_escape("a & b < c > d \" e ' f") != "a &amp; b &lt; c &gt; d &quot; e &#39; f" {
        failed += 1;
    }
    if html_escape("") != "" {
        failed += 1;
    }
    if html_escape("متن ساده فارسی") != "متن ساده فارسی" {
        failed += 1;
    }

    // Test 2: Visible length
    if visible_length("<p>تست</p>") != 3 {
        failed += 1;
    }
    if visible_length("<a href=\"https://example.com\" class=\"text-link\">لینک</a>") != 4 {
        failed += 1;
    }
    if visible_length("سلام &amp; خوش آمدید") != 16 {
        failed += 1;
    }
    if visible_length("\u{200E}تست\u{200F}") != 3 {
        failed += 1;
    }

    // Test 3: Strip HTML tags
    if strip_html_tags("<p>سلام <b>جهان</b> &amp; دوستان</p>") != "سلام جهان & دوستان" {
        failed += 1;
    }

    // Test 4: Direction detection
    if detect_direction("متن فارسی") != "rtl" {
        failed += 1;
    }
    if detect_direction("English text") != "ltr" {
        failed += 1;
    }
    if detect_direction("متن فارسی with English") != "rtl" {
        failed += 1;
    }
    if detect_direction("English with متن فارسی") != "ltr" {
        failed += 1;
    }
    if detect_direction("12345 !@#$%") != "rtl" {
        failed += 1;
    }

    // Test 5: Table detection eliminates false positive on prose containing ─
    if is_table_line("مرحله اول ─ مقدمه") {
        failed += 1;
    }
    if is_table_line("بخش دوم ─ توضیحات تکمیلی پروژه") {
        failed += 1;
    }

    // Test 6: Table detection on box drawing
    if !is_table_line("┌──────┬──────┐") {
        failed += 1;
    }
    if !is_table_line("│ نام  │ سن   │") {
        failed += 1;
    }
    if !is_table_line("├──────┼──────┤") {
        failed += 1;
    }
    if !is_table_line("│ علی  │ ۲۵   │") {
        failed += 1;
    }
    if !is_table_line("└──────┴──────┘") {
        failed += 1;
    }
    if !is_table_line("────────────────────────────") {
        failed += 1;
    }

    // Test 7: Table detection on GFM tables
    if !is_table_line("| Col 1 | Col 2 |") {
        failed += 1;
    }
    if !is_table_line("|:-----:|------:|") {
        failed += 1;
    }
    // GFM table WITHOUT outer pipes (CRITICAL requirement)
    if !is_table_line("Col 1 | Col 2") {
        failed += 1;
    }
    if !is_table_line("--- | ---") {
        failed += 1;
    }
    if !is_table_line("Value 1 | Value 2") {
        failed += 1;
    }
    // Non-table expressions
    if is_table_line("let x = a || b;") {
        failed += 1;
    }
    if is_table_line("if (cond1 || cond2)") {
        failed += 1;
    }

    // Test 8: BiDi nested brackets protection
    let protected = protect_nested_brackets("((([LTR] RTL)))", true);
    if !protected.contains('\u{200F}') {
        failed += 1;
    }

    // Test 9: Markdown heading parsing
    if parse_heading("# تیتر ۱") != Some((1, "تیتر ۱")) {
        failed += 1;
    }
    if parse_heading("### تیتر ۳") != Some((3, "تیتر ۳")) {
        failed += 1;
    }
    if parse_heading("###### تیتر ۶") != Some((6, "تیتر ۶")) {
        failed += 1;
    }
    if parse_heading("#notahead").is_some() {
        failed += 1;
    }
    if parse_heading("متن معمولی").is_some() {
        failed += 1;
    }

    // Test 10: Horizontal rule detection
    if !is_horizontal_rule("---") {
        failed += 1;
    }
    if !is_horizontal_rule("***") {
        failed += 1;
    }
    if !is_horizontal_rule("___") {
        failed += 1;
    }
    if is_horizontal_rule("--") {
        failed += 1;
    }

    // Test 11: Massive payload stress test (100,000+ chars, 5,000+ lines)
    let mut massive = String::with_capacity(250_000);
    for i in 0..5_200 {
        if i % 100 == 0 {
            massive.push_str("# تیتر آزمایشی فارسی در سند بزرگ\n");
        } else if i % 50 == 0 {
            massive.push_str("نام | سن | شهر\n--- | --- | ---\nعلی | ۲۵ | تهران\n");
        } else {
            massive.push_str("این یک خط از متن طولانی برای سنجش کارایی، سرعت پردازش و عدم بروز هرگونه بن‌بست یا خطاست.\n");
        }
    }
    if massive.len() < 100_000 || massive.lines().count() < 5_000 {
        failed += 1;
    }

    // Process all lines of massive payload
    let mut table_count = 0;
    let mut heading_count = 0;
    let mut total_visible = 0;
    for line in massive.lines() {
        if is_table_line(line) {
            table_count += 1;
        }
        if parse_heading(line).is_some() {
            heading_count += 1;
        }
        total_visible += visible_length(line);
    }
    if table_count == 0 || heading_count == 0 || total_visible < 50_000 {
        failed += 1;
    }

    failed
}

#[no_mangle]
pub extern "C" fn bench_massive_payload(line_count: u32) -> u32 {
    let mut massive = String::with_capacity((line_count as usize) * 60);
    for i in 0..line_count {
        if i % 100 == 0 {
            massive.push_str("# سرفصل مهم فارسی در سند بزرگ\n");
        } else if i % 50 == 0 {
            massive.push_str("نام | سن | شهر\n--- | --- | ---\nعلی | ۲۵ | تهران\n");
        } else {
            massive.push_str("این یک خط از متن طولانی برای سنجش کارایی، سرعت پردازش و عدم بروز هرگونه بن‌بست یا خطاست.\n");
        }
    }

    let mut total_visible: u32 = 0;
    for line in massive.lines() {
        if is_table_line(line) {
            total_visible += 1;
        }
        if parse_heading(line).is_some() {
            total_visible += 1;
        }
        total_visible += visible_length(line) as u32;
    }
    total_visible
}

#[no_mangle]
pub extern "C" fn bench_nested_brackets(depth: u32) -> u32 {
    let mut text = String::with_capacity((depth as usize) * 4 + 32);
    for _ in 0..depth {
        text.push('(');
    }
    text.push_str("متن [LTR] فارسی");
    for _ in 0..depth {
        text.push(')');
    }
    let protected = protect_nested_brackets(&text, true);
    protected.len() as u32
}
