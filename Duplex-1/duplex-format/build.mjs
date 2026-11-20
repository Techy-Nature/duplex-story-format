import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('./src/template.html', import.meta.url), 'utf8');
const format = {
  name: 'Duplex', version: '1.9.1', author: 'Adularia for Neston',
  description: 'A SugarCube-like Twine 2 format that switches between appended and replacing passages from StoryInit.',
  license: 'MIT', proofing: false, source
};

// Twine 2.6+ editor extension: tells the story map about links Twine can't see on its own,
// so it draws connector lines for {{button Label|Passage}}, {{Label|Passage}}, <<button "Label" "Passage">>
// and <<link "Label" "Passage">>.
//
// Tweego reads format.js as JSON, from the first "{" to the last "}". This code is added
// after the JSON, so it must not contain a single brace character: objects are built with
// Object.fromEntries, functions use expression bodies, and regexes write braces as \x7b and \x7d.
const quoted = String.raw`"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'`;
const parsePassageText = String.raw`text=>[...String(text??'').matchAll(/\x7b\x7bbutton\s+([\s\S]*?)\x7d\x7d|<<(?:button|link)\s+(?:${quoted})\s+(${quoted})|\x7b\x7b(?!button\s)([^\x7b\x7d\n]*?(?:\||->|<-)[^\x7b\x7d\n]*?)\x7d\x7d/gi)]` +
  String.raw`.map(m=>(m[1]??m[3])!==undefined?(b=>b.includes('->')?b.split(/->(.+)/s)[1]:b.includes('<-')?b.split(/<-(.+)/s)[0]:b.includes('|')?b.split(/\|(.+)/s)[1]:b)(m[1]??m[3]):m[2].slice(1,-1).replace(/\\(.)/g,'$1'))` +
  String.raw`.map(name=>String(name).trim()).filter(name=>name&&!/^(?:transition|t8n)$/i.test(name))`;
const entries = pairs => 'Object.fromEntries([' + pairs.map(([key, value]) => '[' + JSON.stringify(key) + ',' + value + ']').join(',') + '])';
const editorExtensions = entries([['twine', entries([['^2.6.0', entries([['references', entries([['parsePassageText', parsePassageText]])]])]])]]);
if (/[{}]/.test(editorExtensions)) throw new Error('The editor extension must not contain "{" or "}", or Tweego cannot read format.js.');

await writeFile(new URL('./format.js', import.meta.url), `window.storyFormat(Object.assign(${JSON.stringify(format)},${entries([['editorExtensions', editorExtensions]])}));\n`);
