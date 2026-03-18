import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(process.cwd(), '..', '..');
const sourceFile = resolve(repoRoot, 'packages', 'widget-web-component', 'dist', 'chatbot-widget.browser.js');
const destinationFile = resolve(process.cwd(), 'public', 'vendor', 'chatbot-widget.browser.js');

await mkdir(dirname(destinationFile), { recursive: true });
await copyFile(sourceFile, destinationFile);

console.log(`Copied browser bundle to ${destinationFile}`);
