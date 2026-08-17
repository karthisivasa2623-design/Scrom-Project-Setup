#!/usr/bin/env node
/**
 * inject-scorm-links.js
 *
 * `simple-scorm-packager` does not insert the SCORM runtime <script> tags
 * into your index.html automatically, so without this step the packaged
 * course can't talk to the LMS. This script inserts them for you,
 * idempotently, right before you run the packager.
 *
 * Usage:
 *   node inject-scorm-links.js
 *     -> opens an arrow-key folder browser. Navigate with Up/Down, press
 *        Enter/Right to open a folder, Left/Backspace to go up, and select
 *        "Use this folder" (or press "u") once you're in the folder that
 *        contains (or contains inside a subfolder) your index.html.
 *
 *   node inject-scorm-links.js "/path/to/extracted/project"
 *     -> skips the browser and searches that folder directly.
 *
 * Once a folder is chosen, it searches that folder (and subfolders) for
 * index.html. If there's more than one, an arrow-key list lets you pick
 * which one to patch. Running this again on an already-patched file is a
 * no-op (it checks for each src before inserting, so it never duplicates
 * tags).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Order matters: pipwerks.js / scormWrapper.js / __settings__.js typically
// need to load in this sequence. Edit this list if your project needs a
// different set or order.
const REQUIRED_SCRIPTS = [
  '__settings__.js',
  'pipwerks.js',
  'scormWrapper.js',
  'manifest.json'
];

// Folders to skip while searching/browsing, so we don't crawl into build
// output, dependencies, or version control metadata.
const SKIP_DIRS = new Set(['node_modules', '.git', 'scorm_build', 'dist', 'build']);

// ---------------------------------------------------------------------
// Generic arrow-key single-select menu (Up/Down to move, Enter to pick).
// Returns the index of the chosen item, or -1 if the user cancels
// (Ctrl+C / Escape).
// ---------------------------------------------------------------------
function selectFromList(renderHeader, items, opts) {
  const upIndex = opts && opts.upIndex;
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      console.error(
        'This terminal is not interactive, so the arrow-key picker is unavailable.\n' +
          'Run this script directly in a normal terminal window, or pass the folder\n' +
          'path as an argument instead: node inject-scorm-links.js "path/to/folder"'
      );
      resolve(-1);
      return;
    }

    let index = 0;

    function render() {
      process.stdout.write('\x1B[2J\x1B[0f'); // clear screen, cursor to top-left
      console.log(renderHeader());
      items.forEach((label, i) => {
        console.log(`${i === index ? '> ' : '  '}${label}`);
      });
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function onKeypress(str, key) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      } else if (key.name === 'escape') {
        cleanup();
        resolve(-1);
      } else if (key.name === 'up') {
        index = (index - 1 + items.length) % items.length;
        render();
      } else if (key.name === 'down') {
        index = (index + 1) % items.length;
        render();
      } else if (key.name === 'return' || key.name === 'space') {
        cleanup();
        resolve(index);
      } else if ((key.name === 'left' || key.name === 'backspace') && upIndex !== undefined) {
        cleanup();
        resolve(upIndex);
      }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);
    render();
  });
}

// ---------------------------------------------------------------------
// Folder browser: navigate the filesystem with the keyboard and confirm
// a folder instead of typing/pasting a path.
// ---------------------------------------------------------------------
function listSubdirs(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function hasIndexHtml(dir) {
  return fs.existsSync(path.join(dir, 'index.html'));
}

async function browseForFolder(startDir) {
  let currentDir = path.resolve(startDir);

  for (;;) {
    const subdirs = listSubdirs(currentDir);
    const atRoot = path.resolve(currentDir, '..') === currentDir;

    // Menu rows, in order:
    //   0: Use this folder
    //   1: .. (go up)              [omitted at filesystem root]
    //   2..: each subfolder
    const rows = [];
    rows.push({ type: 'use', label: `Use this folder${hasIndexHtml(currentDir) ? '  (contains index.html)' : ''}` });
    if (!atRoot) rows.push({ type: 'up', label: '.. (go up)' });
    subdirs.forEach((name) => {
      const full = path.join(currentDir, name);
      rows.push({ type: 'open', name, label: `${name}/${hasIndexHtml(full) ? '  [index.html]' : ''}` });
    });

    const header =
      `Select your project folder\n` +
      `Up/Down move, Enter/Space open or confirm, Backspace/Left go up, Ctrl+C quit\n\n` +
      `Current: ${currentDir}\n`;

    // Row 1 is ".. (go up)" whenever it's present (it's omitted at the
    // filesystem root), so Left/Backspace can jump straight to it.
    const upIndex = atRoot ? undefined : 1;

    const choice = await selectFromList(() => header, rows.map((r) => r.label), { upIndex });

    if (choice === -1) {
      return null; // cancelled
    }

    const picked = rows[choice];
    if (picked.type === 'use') {
      return currentDir;
    } else if (picked.type === 'up') {
      currentDir = path.resolve(currentDir, '..');
    } else if (picked.type === 'open') {
      currentDir = path.join(currentDir, picked.name);
    }
  }
}

// ---------------------------------------------------------------------
// index.html search + injection (unchanged logic, now separated out).
// ---------------------------------------------------------------------
function findIndexHtmlFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        findIndexHtmlFiles(fullPath, results);
      }
    } else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') {
      results.push(fullPath);
    }
  }

  return results;
}

function buildScriptTag(src) {
  return `<script src="${src}"></script>`;
}

function injectIntoFile(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  const missing = REQUIRED_SCRIPTS.filter(
    (src) => !html.includes(`src="${src}"`) && !html.includes(`src='${src}'`)
  );

  if (missing.length === 0) {
    console.log(`All SCORM script tags already present in ${htmlPath}`);
    return;
  }

  const tagsToInsert = missing.map(buildScriptTag).join('\n    ');

  // Preferred spot: right after the existing __loading__.js tag, if the
  // page has one.
  const loadingScriptRegex = /<script[^>]*src=["']__loading__\.js["'][^>]*>\s*<\/script>/i;
  const loadingMatch = html.match(loadingScriptRegex);

  if (loadingMatch) {
    html = html.replace(loadingScriptRegex, `${loadingMatch[0]}\n    ${tagsToInsert}`);
  } else if (/<body[^>]*>/.test(html)) {
    // Fallback: right after the opening <body> tag (not at the end before
    // </body>) so these load before any other scripts in the page that
    // depend on the SCORM API being ready.
    html = html.replace(/<body([^>]*)>/, `<body$1>\n    ${tagsToInsert}`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `    ${tagsToInsert}\n  </head>`);
  } else {
    html = `${tagsToInsert}\n${html}`;
  }

  fs.writeFileSync(htmlPath, html, 'utf8');

  console.log(`Injected ${missing.length} missing SCORM script tag(s) into ${htmlPath}:`);
  missing.forEach((src) => console.log(`  - ${src}`));
}

async function main() {
  let folder = process.argv[2];

  if (folder) {
    folder = path.resolve(folder.replace(/^["']|["']$/g, ''));
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      console.error(`Not a valid folder: ${folder}`);
      process.exitCode = 1;
      return;
    }
  } else {
    folder = await browseForFolder(process.cwd());
    if (!folder) {
      console.log('Cancelled.');
      return;
    }
  }

  const matches = findIndexHtmlFiles(folder);

  if (matches.length === 0) {
    console.error(`Could not find an index.html anywhere under ${folder}`);
    process.exitCode = 1;
    return;
  }

  let target = matches[0];

  if (matches.length > 1) {
    const choice = await selectFromList(
      () => `Found ${matches.length} index.html files — pick one:\n`,
      matches
    );
    if (choice === -1) {
      console.log('Cancelled.');
      return;
    }
    target = matches[choice];
  }

  process.stdout.write('\x1B[2J\x1B[0f');
  injectIntoFile(target);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});