#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDocsDir = path.join(root, 'docs', 'public');
const markdownFiles = [
  path.join(root, 'README.md'),
  path.join(root, 'docs', 'public-release-roadmap.md'),
  ...fs
    .readdirSync(publicDocsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(publicDocsDir, file))
    .sort(),
];

const sensitivePatterns = [
  /\/Users\/bytedance\//i,
  /bytedance\.larkoffice\.com/i,
  /\.uploads\//i,
  /\bcli_[a-z0-9]{8,}/i,
  /\bou_[a-z0-9]{8,}/i,
  /\boc_[a-z0-9]{8,}/i,
  /\bom_[a-z0-9]{8,}/i,
  /gho_[A-Za-z0-9_]+/,
  /sk-(?:proj|live|test|ant|org)-[A-Za-z0-9_-]{12,}/,
];

const markdownLinkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function checkMarkdownFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(root, filePath);

  text.split('\n').forEach((line, index) => {
    if (line.replace(/\r$/, '').trimEnd() !== line.replace(/\r$/, '')) {
      fail(`${rel}:${index + 1}: trailing whitespace`);
    }
  });

  for (const pattern of sensitivePatterns) {
    if (pattern.test(text)) {
      fail(`${rel}: sensitive-looking pattern matched: ${pattern}`);
    }
  }

  for (const match of text.matchAll(markdownLinkPattern)) {
    const rawLink = match[1];
    if (!rawLink || rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.startsWith('mailto:')) {
      continue;
    }

    const withoutAnchor = rawLink.split('#', 1)[0];
    if (!withoutAnchor) continue;

    const targetPath = path.resolve(path.dirname(filePath), withoutAnchor);
    const relativeTarget = path.relative(root, targetPath);
    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
      fail(`${rel}: local link escapes repository: ${rawLink}`);
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      fail(`${rel}: broken local link: ${rawLink}`);
    }
  }
}

for (const filePath of markdownFiles) {
  if (!fs.existsSync(filePath)) {
    fail(`missing public markdown file: ${path.relative(root, filePath)}`);
    continue;
  }
  checkMarkdownFile(filePath);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Verified ${markdownFiles.length} public markdown files`);
