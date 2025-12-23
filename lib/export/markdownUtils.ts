const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const INLINE_CODE_REGEX = /`([^`]+)`/g;
const BOLD_ASTERISK_REGEX = /\*\*([^*]+)\*\*/g;
const BOLD_UNDERSCORE_REGEX = /__([^_]+)__/g;
const STRIKE_REGEX = /~~([^~]+)~~/g;
const ITALIC_ASTERISK_REGEX = /\*([^*]+)\*/g;
const ITALIC_UNDERSCORE_REGEX = /_([^_]+)_/g;
const HTML_TAG_REGEX = /<\/?[^>]+>/g;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const HR_REGEX = /^(-{3,}|_{3,}|\*{3,})\s*$/;
const BULLET_REGEX = /^[-*•]\s+(.*)$/;
const NUMBERED_REGEX = /^\s*\d+[.)]\s+(.*)$/;
const TABLE_SEPARATOR_REGEX = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export type MarkdownTable = { rows: string[][]; endIndex: number };

export function parseMarkdownTable(lines: string[], startIndex: number): MarkdownTable | null {
    if (startIndex >= lines.length - 1) return null;
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];
    if (!headerLine || !separatorLine) return null;
    if (!TABLE_SEPARATOR_REGEX.test(separatorLine.trim())) return null;

    const separatorColumns = separatorLine
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean).length;

    const parseWhitespaceRow = (line: string) => {
        const splitByGap = line.split(/\s{2,}/).map((cell) => stripInlineMarkdown(cell.trim())).filter(Boolean);
        if (separatorColumns > 0 && splitByGap.length >= separatorColumns) {
            return splitByGap;
        }
        const splitBySpace = line.split(/\s+/).map((cell) => stripInlineMarkdown(cell.trim())).filter(Boolean);
        return splitBySpace;
    };

    const parseRow = (line: string) =>
        line.includes("|")
            ? line
                  .replace(/^\s*\|/, "")
                  .replace(/\|\s*$/, "")
                  .split("|")
                  .map((cell) => stripInlineMarkdown(cell.trim()))
            : parseWhitespaceRow(line);

    const headerCells = parseRow(headerLine);
    if (!headerCells.some((cell) => cell.length > 0)) return null;

    const rows: string[][] = [headerCells];
    let i = startIndex + 2;
    for (; i < lines.length; i += 1) {
        const raw = lines[i];
        if (!raw) break;
        const trimmed = raw.trim();
        if (!trimmed) break;
        if (TABLE_SEPARATOR_REGEX.test(trimmed)) continue;

        if (trimmed.includes("|")) {
            rows.push(parseRow(raw));
            continue;
        }

        const whitespaceCells = parseWhitespaceRow(raw);
        if (separatorColumns > 0 && whitespaceCells.length >= Math.min(2, separatorColumns)) {
            rows.push(whitespaceCells);
            continue;
        }

        break;
    }

    const maxColumns = Math.max(...rows.map((row) => row.length));
    const normalized = rows.map((row) => row.concat(Array(Math.max(0, maxColumns - row.length)).fill("")));
    return { rows: normalized, endIndex: i };
}

export function stripInlineMarkdown(input: string): string {
    return (input || "")
        .replace(IMAGE_REGEX, (_m, alt) => (alt ? `${alt}` : ""))
        .replace(LINK_REGEX, (_m, text, url) => `${text} (${url})`)
        .replace(INLINE_CODE_REGEX, (_m, code) => code)
        .replace(BOLD_ASTERISK_REGEX, (_m, text) => text)
        .replace(BOLD_UNDERSCORE_REGEX, (_m, text) => text)
        .replace(STRIKE_REGEX, (_m, text) => text)
        .replace(ITALIC_ASTERISK_REGEX, (_m, text) => text)
        .replace(ITALIC_UNDERSCORE_REGEX, (_m, text) => text)
        .replace(HTML_TAG_REGEX, "")
        .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1")
        .trim();
}

export function markdownToPlainText(markdown: string): string {
    const text = typeof markdown === "string" ? markdown : "";
    if (!text.trim()) return "";

    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    let inCodeBlock = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, "    ");
        const trimmed = line.trim();

        if (trimmed.startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock) {
            out.push(line);
            continue;
        }

        if (!trimmed) {
            if (out.length > 0 && out[out.length - 1] !== "") out.push("");
            continue;
        }

        if (HR_REGEX.test(trimmed)) continue;

        const heading = trimmed.match(HEADING_REGEX);
        if (heading) {
            out.push(stripInlineMarkdown(heading[2]));
            continue;
        }

        const bullet = trimmed.match(BULLET_REGEX);
        if (bullet) {
            out.push(`- ${stripInlineMarkdown(bullet[1])}`);
            continue;
        }

        const numbered = trimmed.match(NUMBERED_REGEX);
        if (numbered) {
            out.push(stripInlineMarkdown(trimmed));
            continue;
        }

        const quote = trimmed.startsWith(">") ? trimmed.replace(/^>\s?/, "") : trimmed;

        if (TABLE_SEPARATOR_REGEX.test(trimmed)) continue;
        if (trimmed.includes("|")) {
            const cells = trimmed
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map((c) => stripInlineMarkdown(c));
            out.push(cells.filter(Boolean).join("    "));
            continue;
        }

        out.push(stripInlineMarkdown(quote));
    }

    while (out.length > 0 && out[out.length - 1] === "") out.pop();
    return out.join("\n");
}
