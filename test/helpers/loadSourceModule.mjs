import { readFile } from 'node:fs/promises';

export async function loadSourceModule(relativePath) {
    const moduleUrl = new URL(relativePath, import.meta.url);
    const source = await readFile(moduleUrl, 'utf8');
    return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
}