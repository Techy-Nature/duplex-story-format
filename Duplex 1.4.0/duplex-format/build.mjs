import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('./src/template.html', import.meta.url), 'utf8');
const format = {
  name: 'Duplex', version: '1.4.0', author: 'Adularia for Neston',
  description: 'A SugarCube-like Twine 2 format that switches between appended and replacing passages from StoryInit.',
  license: 'MIT', proofing: false, source
};
await writeFile(new URL('./format.js', import.meta.url), `window.storyFormat(${JSON.stringify(format)});\n`);
