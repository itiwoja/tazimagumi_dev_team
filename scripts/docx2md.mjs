// Minimal docx -> markdown converter (no external deps).
// Reads document.xml from a .docx and emits a best-effort Markdown rendering
// focused on headings, paragraphs, lists, and tables.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const docxPath = process.argv[2];
const outPath = process.argv[3];
if (!docxPath || !outPath) {
  console.error("Usage: node docx2md.mjs <input.docx> <output.md>");
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(process.env.TMP || "/tmp", "docx-"));
execSync(`unzip -o -q "${docxPath}" -d "${tmpDir}"`);

const xml = fs.readFileSync(path.join(tmpDir, "word/document.xml"), "utf8");

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseRuns(pXml) {
  const runs = [];
  const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  let m;
  while ((m = runRe.exec(pXml)) !== null) {
    const runBody = m[1];
    const bold = /<w:b\s*\/>|<w:b\s+[^/]*\/>|<w:b>/.test(runBody);
    let text = "";
    const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
    let tm;
    while ((tm = tRe.exec(runBody)) !== null) {
      if (tm[0].startsWith("<w:tab")) text += "\t";
      else if (tm[0].startsWith("<w:br")) text += "\n";
      else text += decodeEntities(tm[1]);
    }
    if (text) runs.push({ text, bold });
  }
  return runs;
}

function renderRuns(runs) {
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === r.bold) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged
    .map((r) => {
      const t = r.text;
      if (!t.trim()) return t;
      if (r.bold) return `**${t}**`;
      return t;
    })
    .join("");
}

function stripBoldWrap(s) {
  if (/^\*\*[\s\S]*\*\*$/.test(s.trim())) return s.trim().replace(/^\*\*|\*\*$/g, "");
  return s;
}

function paragraphToMd(pXml) {
  const styleMatch = pXml.match(/<w:pStyle\s+w:val="([^"]+)"/);
  const style = styleMatch ? styleMatch[1] : null;
  const numPrMatch = pXml.match(/<w:numPr>[\s\S]*?<\/w:numPr>/);
  const numId = numPrMatch ? (numPrMatch[0].match(/w:numId\s+w:val="(\d+)"/) || [])[1] : null;
  const ilvl = numPrMatch ? Number(((numPrMatch[0].match(/w:ilvl\s+w:val="(\d+)"/) || [])[1]) || 0) : 0;

  const runs = parseRuns(pXml);
  let text = renderRuns(runs).replace(/\s+$/g, "").trimEnd();

  if (!text.trim() && !style && !numId) return "";

  if (style) {
    const m = /^Heading(\d)$/i.exec(style);
    if (m) {
      if (!text.trim()) return "";
      const level = Math.min(6, Math.max(1, Number(m[1])));
      return `${"#".repeat(level)} ${stripBoldWrap(text)}`;
    }
    if (/^Title$/i.test(style)) {
      if (!text.trim()) return "";
      return `# ${stripBoldWrap(text)}`;
    }
    if (/^Subtitle$/i.test(style)) {
      if (!text.trim()) return "";
      return `## ${stripBoldWrap(text)}`;
    }
  }

  if (numId) {
    const indent = "  ".repeat(ilvl);
    return `${indent}- ${text}`;
  }

  return text;
}

function tableToMd(tblXml) {
  const rows = [];
  const trRe = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
  let m;
  while ((m = trRe.exec(tblXml)) !== null) {
    const trBody = m[1];
    const cells = [];
    const tcRe = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
    let cm;
    while ((cm = tcRe.exec(trBody)) !== null) {
      const tcBody = cm[1];
      const cellLines = [];
      const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
      let pm;
      while ((pm = pRe.exec(tcBody)) !== null) {
        const t = renderRuns(parseRuns(pm[1])).trim();
        if (t) cellLines.push(t);
      }
      cells.push(cellLines.join("<br>"));
    }
    rows.push(cells);
  }
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => {
    const copy = r.slice();
    while (copy.length < width) copy.push("");
    return copy.map((c) => c.replace(/\|/g, "\\|"));
  });
  const header = norm[0];
  const sep = header.map(() => "---");
  const body = norm.slice(1);
  return [
    `| ${header.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

const bodyMatch = xml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/);
if (!bodyMatch) {
  console.error("No w:body found");
  process.exit(2);
}
const body = bodyMatch[1];

const blocks = [];
const blockRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>|<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
let bm;
while ((bm = blockRe.exec(body)) !== null) {
  if (bm[0].startsWith("<w:p")) {
    const md = paragraphToMd(bm[0]);
    blocks.push({ kind: "p", md });
  } else {
    const md = tableToMd(bm[0]);
    blocks.push({ kind: "tbl", md });
  }
}

const out = [];
let blankRun = 0;
for (const b of blocks) {
  if (b.kind === "p" && b.md.trim() === "") {
    blankRun++;
    if (blankRun <= 1) out.push("");
    continue;
  }
  blankRun = 0;
  out.push(b.md);
  out.push("");
}

const finalMd = out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
fs.writeFileSync(outPath, finalMd, "utf8");
console.log(`Wrote ${outPath} (${finalMd.length} bytes)`);
