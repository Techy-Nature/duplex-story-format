import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { indexedDB } from 'fake-indexeddb';

let format;
vm.runInNewContext(await readFile(new URL('../format.js', import.meta.url), 'utf8'), {
  window: { storyFormat: value => { format = value; } }
});

const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const passage = (pid,name,text,tags='') => `<tw-passagedata pid="${pid}" name="${name}" tags="${tags}">${escape(text)}</tw-passagedata>`;
const story = `<tw-storydata name="Test" startnode="1">
  ${passage('9','StoryInit',`<<if tags("Start").includes("scrolling")>><<set $passageMode = "append">><<elseif hasTag("Start", "pages")>><<set $passageMode = "replace">><<else>><<set $passageMode = "replace">><</if>>
<<set $x = 1>>
<<set $unsafe = "<script id='injected'>window.injectionRan = true;</script>">>
<<cacheaudio "tone" "data:audio/wav;base64,UklGRg==">>
<<createaudiogroup ":ui">><<track "tone">><</createaudiogroup>>
<<createplaylist "music">><<track "tone" volume 0.5>><</createplaylist>>`)}
  ${passage('1','Start',`<<run $x += 1>>
<<set $section to "ExpressionInclude">>
Literal: <<include "LiteralInclude">>
Expression: <<include $section>>
Missing: <<include "DoesNotExist">>
Nested: <<include "NestedInclude">>
Recursive: <<include "RecursiveA">>
<<script>>State.variables.scripted = true;<</script>>
<<switch $x>><<case 2>>switch-ok<<default>>switch-bad<</switch>>
<<button "Add">><<set $x += 3>><</button>>
<<linkreplace "Reveal">>secret<</linkreplace>>
<<checkbox "$check" false true>>
<<radiobutton "$pick" "bird" checked>>
<<cycle "$cycle">><<option "A" 1>><<option "B" 2>><</cycle>>
<<listbox "$list">><<option "One" 1>><<option "Two" 2>><</listbox>>
<<set $target to { variable: "before" }>>
<<set $targetlist to ["hare", "fox"]>>
<<set $targetmap to { Owl: "owl", Hawk: "hawk" }>>
<<dropdown $target.variable>><<option "deer">><<option "dog">><<options $targetlist[]>><<options $targetmap>><<option "hunted">><</dropdown>>
<<numberbox "$num" 4>>
<<textbox "$text" "hi">>
<<textarea "$area" "long">>
<<audio "tone" volume 0.3 mute>>
<<masteraudio volume 0.8>>
<<playlist "music" volume 0.4>>
<<bird "Nighthawk">>
Inline before <<bird "Inline">> inline after
Grammar call: [<<bird-call>>] kept [<<bird-call keep>>][<<bird-call keep>>] generic [<<grammar "bird-call">>]
<<run Grammar.save("call-line", "$savedCall")>>
Grammar case: [<<beast>>][<<beast.upperFirst>>][<<beast.upper>>][<<beast.lower>>][<<beast.UPPERFIRST>>][<<grammar "beast" upper>>][<<grammar "beast.lower">>][<<beast.upper keep>>]
Grammar link case: <<beast-link.upper>>
Grammar widget: <<creature>>
Grammar names: [<<runes>>][<<runes.upperFirst>>][<<link-word.upper>>][<<audio-cue>>]
Grammar bad case: [<<beast.shout>>]
<<twopara>>
<<birdnote>>flies at dusk<</birdnote>>
<<speech "Captain">>Hello, $unsafe.

<<if _args[0] === "Captain">>[[Trusted link->Next]] and <<bird "Nested">>.<</if>><</speech>>
Unsafe naked: $unsafe
Unsafe print: <<print $unsafe>>
Unsafe shorthand: <<= $unsafe>>
<<rawnote>><<if true>>raw source<</if>><</rawnote>>
<<if hasTag("scrolling")>>current-tag-ok<</if>>
// this line is hidden
Visible before // this trailing comment is hidden
/* this block is hidden */
<<comment>>this macro is hidden and <<set $x = 500>><</comment>>
<<markdown>>
# Markdown heading
**bold words** and [Duplex](https://example.test/)
- first item
- second item with $x
<</markdown>>
[[Next]]`,'scrolling opening')}
  ${passage('2','Next','Done')}
  ${passage('3','StoryCaption','Caption $x')}
  ${passage('4','StoryMenu','[[Menu link->Next]]')}
  ${passage('5','StoryLeftBar','Left custom')}
  ${passage('6','StoryRightBar','Right custom')}
  ${passage('7','Widgets',`<<widget "bird">>Widget bird: <<print _args[0]>><</widget>>
<<widget "twopara">>First widget paragraph.

Second widget paragraph.<</widget>>
<<widget "birdnote" container>><strong><<print _contents>></strong><</widget>>`,'widget')}
  ${passage('8','More Widgets',`<<widget "speech" container>><div class="speech-text"><<= _contents>></div><</widget>>
<<widget "rawnote" container>><code class="raw-contents"><<print _contentsRaw>></code><</widget>>`,'widget')}
  ${passage('10','LiteralInclude','literal-include-ok')}
  ${passage('11','ExpressionInclude','expression-include-ok')}
  ${passage('12','NestedInclude','nested-before <<include "NestedLeaf">> nested-after')}
  ${passage('13','NestedLeaf','<<set $includedMacro to "macro-include-ok">>$includedMacro')}
  ${passage('14','RecursiveA','recursive-a <<include "RecursiveB">>')}
  ${passage('15','RecursiveB','recursive-b <<include "RecursiveA">>')}
  ${passage('16','UnsafeInclude','nested-script <<script>>window.modNestedRan=true;<</script>>')}
  ${passage('17','DuplexMod:collision.mod:hook','base collision passage')}
  ${passage('19','bird-call','hoot\ntrill\n// not an option\n\ncaw','grammar')}
  ${passage('20','call-line','a <<bird-call>> at dusk','grammar')}
  ${passage('21','beast','wOlf pack','grammar')}
  ${passage('22','beast-link','[[sly fox->Next]]','grammar')}
  ${passage('23','runes','ash rune','grammar')}
  ${passage('24','link-word','glyph','grammar')}
  ${passage('25','audio-cue','chime','grammar')}
  ${passage('26','Grammar Widgets','<<widget "creature">>A <<beast.lower>> and a <<beast.upperFirst>> appear.<</widget>>','widget')}
  ${passage('18','StorySettings','<strong id="author-settings">Author settings</strong>')}
</tw-storydata>`;

const html = format.source.replace('{{STORY_NAME}}','Test').replace('{{STORY_DATA}}',story);
const consoleWarnings=[];
const consoleErrors=[];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/story',
  beforeParse(window) {
    window.console.warn=(...args)=>consoleWarnings.push(args.join(' '));
    window.console.error=(...args)=>consoleErrors.push(args.join(' '));
    window.scrollTo = () => {};
    window.requestAnimationFrame = callback => callback();
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open',''); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
    window.HTMLMediaElement.prototype.load = () => {};
    window.confirm = () => true;
    window.browserEscape = false;
    window.alert = window.fetch = () => { window.browserEscape = true; };
  }
});
const { document, State, Duplex, duplex, Save } = dom.window;
const assert = (condition,message) => { if (!condition) throw new Error(message); };

assert(format.version === '1.9.0','format version');
assert(duplex===Duplex && typeof duplex.random==='function','lowercase Duplex API alias and random helper');
assert(duplex.random(null)===undefined && duplex.random('red')===undefined && duplex.random([])===undefined,'random helper rejects non-arrays and empty arrays');
const colors=dom.window.Array.from(['red','blue','green']);
assert(colors.includes(duplex.random(colors)) && colors.includes(colors.random()),'random helper and array convenience return array items');
assert(Object.getOwnPropertyDescriptor(dom.window.Array.prototype,'random')?.enumerable===false && !Object.keys(colors).includes('random'),'array random convenience is non-enumerable');
assert(document.body.textContent.includes('switch-ok'),'switch macro');
assert(State.variables.x === 2 && State.variables.scripted,'run and script macros');
assert(Duplex.audio.tracks.size === 1 && Duplex.audio.groups.has(':ui') && Duplex.audio.playlists.has('music'),'audio registration macros');
assert(State.variables.passageMode === 'append','StoryInit tags condition');
const renderedPassage=document.querySelector('.duplex-passage-body').textContent;
assert(renderedPassage.includes('literal-include-ok'),'literal passage include');
assert(renderedPassage.includes('expression-include-ok'),'variable/expression passage include');
assert(renderedPassage.includes('macro-include-ok')&&State.variables.includedMacro==='macro-include-ok','macros in included passages are processed');
assert(renderedPassage.includes('nested-before')&&renderedPassage.includes('nested-after'),'nested passage includes');
assert(!renderedPassage.includes('DoesNotExist')&&consoleWarnings.some(message=>message.includes('DoesNotExist')),'missing include renders nothing and warns with passage name');
assert(renderedPassage.includes('recursive-a')&&renderedPassage.includes('recursive-b')&&consoleErrors.some(message=>message.includes('RecursiveA -> RecursiveB -> RecursiveA')),'recursive includes are stopped with a useful error');
assert(State.history.length===1&&State.history[0].title==='Start','includes do not navigate, change the current passage, or add history entries');
assert(document.body.textContent.includes('current-tag-ok'),'current passage hasTag');
assert(!renderedPassage.includes('this line is hidden') && !renderedPassage.includes('this block is hidden') && !renderedPassage.includes('this macro is hidden'),'comment syntaxes');
assert(renderedPassage.includes('Visible before') && !renderedPassage.includes('this trailing comment is hidden'),'inline comment');
assert(document.querySelector('.duplex-passage-body h1')?.textContent === 'Markdown heading' && [...document.querySelectorAll('.duplex-passage-body strong')].some(element=>element.textContent==='bold words'),'markdown headings and emphasis');
assert(document.querySelector('.duplex-passage-body a[href="https://example.test/"]') && document.querySelectorAll('.duplex-passage-body li').length===2 && document.body.textContent.includes('second item with 2'),'markdown links, lists, and variables');
assert(JSON.stringify(dom.window.tags('Start'))===JSON.stringify(['scrolling','opening']) && dom.window.hasTag('Start','opening'),'tag helper values');
assert(document.body.textContent.includes('Widget bird: Nighthawk'),'non-container widget');
assert(document.body.textContent.includes('flies at dusk'),'container widget');
assert([...document.querySelectorAll('.duplex-passage-body p')].some(p=>p.textContent.includes('Inline before Widget bird: Inline inline after')),'single-paragraph widget output stays inline');
const grammarLine=[...document.querySelectorAll('.duplex-passage-body p')].map(p=>p.textContent).join('\n').match(/Grammar call: \[(hoot|trill|caw)\] kept \[(hoot|trill|caw)\]\[(hoot|trill|caw)\] generic \[(hoot|trill|caw)\]/);
assert(grammarLine,'grammar macros print a random option inline, with <<grammar "name">> as the generic form');
assert(grammarLine[2]===grammarLine[3]&&State.variables.grammarKept['bird-call']===grammarLine[2],'grammar keep repeats one remembered pick stored in $grammarKept');
assert(JSON.stringify(Duplex.grammar.list('bird-call'))===JSON.stringify(['hoot','trill','caw'])&&Duplex.grammar.names().includes('call-line'),'grammar passages skip blank and // lines');
assert(/^a (hoot|trill|caw) at dusk$/.test(State.variables.savedCall),'Grammar.save stores finished plain text with nested lists expanded');
assert(![...document.querySelectorAll('.duplex-passage-body')].some(body=>body.textContent.includes('not an option')),'grammar comment lines are never printed');
const grammarParagraphs=[...document.querySelectorAll('.duplex-passage-body p')].map(p=>p.textContent).join('\n');
assert(grammarParagraphs.includes('Grammar case: [wOlf pack][WOlf pack][WOLF PACK][wolf pack][WOlf pack][WOLF PACK][wolf pack][WOLF PACK]'),'grammar .upperFirst, .upper and .lower change case, in both macro and generic forms');
assert(State.variables.grammarKept.beast==='wOlf pack','kept grammar picks store the original text, not the cased text');
const casedLink=[...document.querySelectorAll('.duplex-passage-body a[data-passage]')].find(a=>a.textContent==='SLY FOX');
assert(casedLink&&casedLink.getAttribute('data-passage')==='Next','grammar case styles change link text but never link targets');
assert(grammarParagraphs.includes('Grammar widget: A wolf pack and a WOlf pack appear.'),'grammar case macros work inside widgets');
assert(grammarParagraphs.includes('Grammar names: [ash rune][Ash rune][GLYPH][chime]'),'grammar names that start with a built-in macro name (run, link, audio) are not read as that macro');
assert(grammarParagraphs.includes('Grammar bad case: [')&&consoleWarnings.some(message=>message.includes('beast.shout')),'an unknown case style warns instead of printing');
assert(Duplex.grammar.pick('beast.upper')==='WOLF PACK'&&Duplex.grammar.pick('beast.upperFirst')==='WOlf pack'&&Duplex.grammar.has('beast.lower')&&Duplex.grammar.list('beast.upper')[0]==='wOlf pack','Grammar API accepts case suffixes');
assert([...document.querySelectorAll('.duplex-passage-body p')].some(p=>p.textContent==='First widget paragraph.')&&[...document.querySelectorAll('.duplex-passage-body p')].some(p=>p.textContent.startsWith('Second widget paragraph.')),'multi-paragraph widget output keeps its paragraphs');
assert(document.querySelector('.speech-text [data-passage=Next]')?.textContent === 'Trusted link' && document.querySelector('.speech-text')?.textContent.includes('Widget bird: Nested'),'container widget compiles links, conditions, variables, and nested widgets with arguments available');
assert(!document.querySelector('#injected') && !dom.window.injectionRan && document.body.textContent.includes("<script id='injected'>"),'ordinary values remain escaped for naked, print, and shorthand output');
assert(document.querySelector('.raw-contents')?.textContent === '<<if true>>raw source<</if>>','container widget exposes original source through _contentsRaw');
assert(document.querySelector('#story-caption').textContent.includes('Caption 2'),'StoryCaption UI update');
assert(document.querySelector('#story-menu [data-passage=Next]'),'StoryMenu UI update');
assert(document.querySelector('#story-left-bar').textContent.includes('Left custom'),'left custom passage');
assert(document.querySelector('#story-right-bar').textContent.includes('Right custom'),'right custom passage');
assert(document.querySelector('#duplex-current-passage').textContent === 'Start','right status');
assert(Duplex.shortcuts.get('inventory').shortcut==='Shift+I'&&Duplex.shortcuts.get('story-settings').shortcut==='Shift+Alt','built-in shortcut defaults');
Duplex.shortcuts.add('test-action',{label:'Test action',defaultShortcut:'T',action:()=>{dom.window.shortcutAction=true;}});
dom.window.UI.settings();
assert(document.querySelector('#author-settings')&&[...document.querySelectorAll('.duplex-shortcut-row')].some(row=>row.textContent.includes('Inventory')&&row.querySelector('button').textContent==='Shift+I'),'StorySettings content and separate shortcut labels render accurately');
const inventoryShortcutButton=document.querySelector('[data-shortcut-id="inventory"]');inventoryShortcutButton.click();
inventoryShortcutButton.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Shift',shiftKey:true,bubbles:true,cancelable:true}));
assert(inventoryShortcutButton.textContent==='Shift+…','shortcut recorder waits for a second key after a modifier');
inventoryShortcutButton.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'J',shiftKey:true,bubbles:true,cancelable:true}));
assert(inventoryShortcutButton.textContent==='Shift+J'&&Duplex.shortcuts.get('inventory').shortcut==='Shift+J'&&JSON.parse(dom.window.localStorage.getItem('duplex-shortcuts-Test')).inventory==='Shift+J','set shortcut updates button, runtime, and persistence immediately');
document.querySelector('#duplex-dialog-actions button:last-child').click();
document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true}));assert(dom.window.shortcutAction,'author-added shortcut action');
document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Alt',shiftKey:true,altKey:true,bubbles:true,cancelable:true}));assert(document.querySelector('#duplex-dialog').open&&document.querySelector('#author-settings'),'settings keyboard shortcut');document.querySelector('#duplex-dialog-actions button:last-child').click();
document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'0',bubbles:true,cancelable:true}));assert(State.history.at(-1).title==='Next','zero activates the last visible story link');Duplex.back();
dom.window.UIBar.hide();assert(dom.window.UIBar.isHidden(),'left bar hide');dom.window.UIBar.show().stow(true);assert(dom.window.UIBar.isStowed(),'left bar stow');dom.window.UIBar.unstow(true);
dom.window.UIBarRight.stow(true);assert(dom.window.UIBarRight.isStowed(),'right bar stow');dom.window.UIBarRight.unstow(true);
assert(dom.window.UIBarL===dom.window.UIBar && dom.window.UIBarR===dom.window.UIBarRight,'short UI bar names and aliases');
assert(Duplex.Save===Save && typeof Save.export==='function' && typeof Save.import==='function','Save API globals');
const { Inventory }=dom.window;
const validMod={schema:1,id:'neston.more-birds',name:'More Birds',version:'1.0.0',author:'Neston',forStory:'Test',requires:{duplex:'>=1.5.0'},items:[{id:'nighthawk-feather',name:'Nighthawk Feather',properties:{value:15},tags:['bird']}]};
const extensionMod={schema:1,id:'example.quest-pack',name:'Quest Pack',version:'1.0.0',items:[],passageExtensions:[
  {id:'first-before',target:'Next',placement:'before',content:'before-one <<set $modSafe to 7>><<if $modSafe === 7>>conditional-ok<</if>><<switch $modSafe>><<case 7>>switch-safe<</switch>> [[Safe link->Start]] <<button \"Safe button\">><<set $modClicked to true>><</button>>'},
  {id:'second-before',target:'Next',placement:'before',content:'before-two'},
  {id:'after-hook',target:'Next',placement:'after',content:'after-one <<script>>window.modScriptRan=true;<</script>> <<include \"UnsafeInclude\">>'},
  {id:'unsafe-print',target:'Next',placement:'after',content:'<<print this.alert(\"escaped\")>>'},
  {id:'unsafe-set',target:'Next',placement:'after',content:'<<set $result to fetch(\"https://example.com\")>>'},
  {id:'unsafe-html',target:'Next',placement:'after',content:'<img src=\"invalid\" onerror=\"alert(1)\"><a href=\"javascript:alert(1)\" onclick=\"alert(1)\">raw-danger</a> <<markdown>>\n[markdown-danger](javascript:alert(1))\n<</markdown>>'},
  {id:'unsafe-audio-group',target:'Next',placement:'after',content:'<<createaudiogroup \"mod-group\">><<track \"tone\">><</createaudiogroup>>'},
  {id:'unsafe-playlist',target:'Next',placement:'after',content:'<<createplaylist \"mod-playlist\">><<track \"tone\">><</createplaylist>>'}
]};
const normalizedExtension=Duplex.mods.register(extensionMod);Duplex.go('Next');
let extensionText=document.querySelector('article:last-child .duplex-passage-body').textContent;
assert(extensionText.indexOf('before-one')<extensionText.indexOf('before-two')&&extensionText.indexOf('before-two')<extensionText.indexOf('Done')&&extensionText.indexOf('Done')<extensionText.indexOf('after-one'),'before/after extensions use stable import and manifest order');
assert(normalizedExtension.passageExtensions.length===8&&Duplex.mods.get(extensionMod.id).passageExtensions.length===8,'normalized extensions exposed through list/get APIs');
assert(JSON.stringify(dom.window.tags('DuplexMod:example.quest-pack:after-hook'))===JSON.stringify(['mod','restricted'])&&dom.window.hasTag('DuplexMod:example.quest-pack:after-hook','restricted'),'virtual passage lookup and restricted tags');
assert(State.variables.modSafe===7&&extensionText.includes('conditional-ok')&&extensionText.includes('switch-safe')&&document.querySelector('article:last-child [data-passage=Start]'),'safe restricted conditionals, switches, printing, links, variables, and controls compile');
assert(!dom.window.modScriptRan&&!dom.window.modNestedRan&&consoleErrors.some(message=>message.includes('after-hook')&&message.includes('script')),'restricted scripts and nested-include scripts are blocked with context');
assert(!dom.window.browserEscape&&!Object.hasOwn(State.variables,'result'),'restricted expressions cannot access browser globals or execute functions');
assert(!Duplex.audio.groups.has('mod-group')&&!Duplex.audio.playlists.has('mod-playlist'),'restricted audio group and playlist definitions cannot register');
const extensionBody=document.querySelector('article:last-child .duplex-passage-body');
assert(!extensionBody.querySelector('[onerror],[onclick]')&&[...extensionBody.querySelectorAll('a')].filter(link=>/danger/.test(link.textContent)).every(link=>!link.hasAttribute('href')),'restricted HTML removes event handlers and dangerous raw/Markdown URLs');
assert(!Save.serialize().includes('before-one')&&!Save.serialize().includes('after-one'),'save history excludes rendered mod extension HTML');
const laterExtension={schema:1,id:'later.quest-pack',name:'Later Pack',version:'1.0.0',items:[],passageExtensions:[{id:'later-after',target:'Next',placement:'after',content:'after-two'}]};Duplex.mods.register(laterExtension);Duplex.go('Next');extensionText=document.querySelector('article:last-child .duplex-passage-body').textContent;
assert(extensionText.indexOf('after-one')<extensionText.indexOf('after-two'),'multiple mods use stable import order');
await Duplex.mods.disable(extensionMod.id);Duplex.go('Next');assert(!document.querySelector('article:last-child .duplex-passage-body').textContent.includes('before-one'),'disabled mod contributes no extensions');Duplex.go('Start');Duplex.back();assert(!document.querySelector('article:last-child .duplex-passage-body').textContent.includes('before-one'),'back navigation reconstructs history without disabled extensions');
await Duplex.mods.enable(extensionMod.id);Duplex.go('Next');assert(document.querySelector('article:last-child .duplex-passage-body').textContent.includes('before-one'),'re-enabling restores extensions');
await Duplex.mods.remove(extensionMod.id);await Duplex.mods.remove(laterExtension.id);Duplex.go('Next');assert(!document.querySelector('article:last-child .duplex-passage-body').textContent.includes('before-one')&&!dom.window.hasTag('DuplexMod:example.quest-pack:after-hook','mod'),'removing mod removes extensions and virtual passages');
for(const [bad,message] of [
  [{...extensionMod,id:'bad-array',passageExtensions:{}},'array'],
  [{...extensionMod,id:'bad-target',passageExtensions:[{id:'x',target:'Missing',placement:'after',content:''}]},'missing target'],
  [{...extensionMod,id:'bad-init',passageExtensions:[{id:'x',target:'StoryInit',placement:'after',content:''}]},'protected target'],
  [{...extensionMod,id:'bad-widget',passageExtensions:[{id:'x',target:'Widgets',placement:'after',content:''}]},'protected tag'],
  [{...extensionMod,id:'bad-duplicate',passageExtensions:[{id:'x',target:'Next',placement:'after',content:''},{id:'x',target:'Next',placement:'before',content:''}]},'duplicate extension'],
  [{...extensionMod,id:'bad-placement',passageExtensions:[{id:'x',target:'Next',placement:'around',content:''}]},'invalid placement']
]){let failed=false;try{Duplex.mods.register(bad);}catch(_){failed=true;}assert(failed,message+' rejected');}
for(const target of ['StoryTitle','StoryCaption','StoryMenu','StoryLeftBar','StoryRightBar']){let failed=false;try{Duplex.mods.register({...extensionMod,id:'protected-'+target.toLowerCase(),passageExtensions:[{id:'x',target,placement:'after',content:''}]});}catch(_){failed=true;}assert(failed,target+' protected');}
let collisionFailed=false;try{Duplex.mods.register({...extensionMod,id:'collision.mod',passageExtensions:[{id:'hook',target:'Next',placement:'after',content:'collision'}]});}catch(_){collisionFailed=true;}assert(collisionFailed&&!Duplex.mods.has('collision.mod')&&dom.window.tags('DuplexMod:collision.mod:hook').length===0,'virtual passage collision rejection is transactional and preserves the base passage');

[...document.querySelectorAll('article')].slice(1).forEach(article=>article.remove());State.history.splice(1);
const registered=Duplex.mods.register(validMod);
assert(registered.items[0].quantity===1&&Duplex.mods.has(validMod.id)&&Duplex.mods.isEnabled(validMod.id),'register valid mod and item defaults');
const definition=Duplex.mods.getItem(validMod.id,'nighthawk-feather'),first=Duplex.mods.createItem(validMod.id,'nighthawk-feather',{quantity:2}),second=Duplex.mods.createItem(validMod.id,'nighthawk-feather');
first.properties.value=99;first.tags.push('changed');
assert(first.id==='neston.more-birds:nighthawk-feather'&&first.modId===validMod.id&&first.definitionId==='nighthawk-feather'&&first.quantity===2,'created item identity and quantity override');
assert(second!==first&&definition.properties.value===15&&Duplex.mods.getItem(validMod.id,'nighthawk-feather').tags.length===1,'definitions and instances are independent');
await Duplex.mods.import(JSON.stringify({...validMod,id:'another-author.alchemy',name:'Alchemy',items:[{id:'nighthawk-feather',name:'Other Feather'}]}));
await Duplex.mods.import({...validMod,id:'plain-object.mod',name:'Plain Object'});
assert(Duplex.mods.createItem('another-author.alchemy','nighthawk-feather').id==='another-author.alchemy:nighthawk-feather'&&Duplex.mods.has('plain-object.mod'),'JSON string and plain object import with namespacing');
const file=new dom.window.File([JSON.stringify({...validMod,id:'file.mod',name:'File Mod'})],'mod.json',{type:'application/json'});file.text=()=>Promise.resolve(JSON.stringify({...validMod,id:'file.mod',name:'File Mod'}));await Duplex.mods.import(file);assert(Duplex.mods.has('file.mod'),'File import');
let rejected=0;for(const bad of [
  {...validMod,id:'duplicate-items',items:[validMod.items[0],validMod.items[0]]},
  validMod,
  {...validMod,id:'bad-schema',schema:2},
  {...validMod,id:'wrong-story',forStory:'Elsewhere'},
  {...validMod,id:'bad-quantity',items:[{id:'bad',name:'Bad',quantity:1001}]},
  {...validMod,id:'decimal-quantity',items:[{id:'bad',name:'Bad',quantity:1.5}]}
]){try{Duplex.mods.register(bad);}catch(_){rejected++;}}try{await Duplex.mods.import('{broken');}catch(_){rejected++;}try{await Duplex.mods.import('{"schema":1,"id":"danger","name":"Danger","version":"1","items":[],"nested":{"__proto__":{}}}');}catch(_){rejected++;}
assert(rejected===8&&!Duplex.mods.has('duplicate-items')&&!Duplex.mods.has('bad-schema'),'invalid, duplicate, dangerous, incompatible, and malformed mods rejected atomically');
await Duplex.mods.disable(validMod.id);assert(!Duplex.mods.isEnabled(validMod.id)&&Duplex.mods.getItem(validMod.id,'nighthawk-feather')===null,'disabled mod hides definitions');await Duplex.mods.enable(validMod.id);assert(Duplex.mods.isEnabled(validMod.id),'mod re-enabled');
assert(!Object.hasOwn(State.variables,'inventory'),'mod registration does not create $inventory');
State.variables.inventory=['author-owned'];dom.window.UI.update();
assert(State.variables.inventory[0]==='author-owned'&&Inventory.bags.length===0,'inventory state does not collide with the author-owned $inventory variable');
assert(dom.window.Duplex.inventory===Inventory,'Duplex.inventory aliases the global Inventory API');
const numbered=Inventory.createBag('Numbered',{id:'bag-50'}),generated=Inventory.createBag('Generated');
assert(numbered.id==='bag-50'&&generated.id==='bag-51','explicit generated-style IDs advance automatic bag IDs');
let duplicateRejected=false;try{Inventory.createBag('Duplicate',{id:'bag-50'});}catch(error){duplicateRejected=/already exists/.test(error.message);}assert(duplicateRejected&&Inventory.getBag('bag-50')===numbered,'duplicate explicit bag IDs are rejected');
const pack=Inventory.createBag({id:'pack',name:'Pack'},{id:'pack',properties:{capacity:20}});
const pouch=Inventory.createBag({id:'pouch',name:'Pouch'},{id:'pouch',properties:{color:'red'}});
Inventory.addItem('pouch',{name:'Coin',quantity:4});
Inventory.addItem('pouch',second);assert(pouch.items[1].modId===validMod.id,'created mod item added through existing inventory');
await Duplex.mods.remove(validMod.id);assert(!Duplex.mods.has(validMod.id)&&pouch.items[1].id==='neston.more-birds:nighthawk-feather','removing a mod preserves inventory instances');
const tiny=Inventory.createBag({id:'tiny',name:'Tiny'},{id:'tiny'});
Inventory.moveBag('tiny','pouch');
Inventory.moveBag('pouch','pack');
assert(pack.children[0]===pouch&&pouch.items[0].quantity===4&&pouch.children[0]===tiny,'bag movement preserves intact nested instances');
let cycleRejected=false;try{Inventory.moveBag('pack','tiny');}catch(error){cycleRejected=/descendant/.test(error.message);}assert(cycleRejected,'bag ancestry cycle rejection');
const stack=Inventory.createBag({id:'sack',name:'Sack'},{properties:{cloth:true},quantity:600});
const merged=Inventory.createBag({id:'sack',name:'Sack'},{properties:{cloth:true},quantity:400});
assert(stack===merged&&stack.quantity===1000,'compatible empty bags stack through 1000');
Inventory.addItem(stack.id,{name:'Apple'});
assert(stack.quantity===1&&Inventory.bags.some(bag=>bag!==stack&&bag.name==='Sack'&&bag.quantity===999),'populating a stacked bag splits one instance');
const full=Inventory.createBag('Full',{properties:{capacity:0}});const before=JSON.stringify(Inventory.bags);
let atomic=false;try{Inventory.unpackBag('pouch',full.id);}catch(error){atomic=/capacity/.test(error.message);}assert(atomic&&JSON.stringify(Inventory.bags)===before,'failed unpack is atomic');
Inventory.openBag('pack');
const pouchRow=document.querySelector('[data-bag-id="pouch"]');pouchRow.click();await new Promise(resolve=>setTimeout(resolve,250));
assert(Inventory.activeBagId==='pouch','single click opens nested bag');
Inventory.openBag('pack');document.querySelector('[data-bag-id="pouch"]').dispatchEvent(new dom.window.MouseEvent('dblclick',{bubbles:true}));
assert(pouch.items.length===0&&pouch.children.length===0&&pack.items.some(item=>item.name==='Coin')&&pack.children.includes(tiny),'double click unpacks immediate contents');
Inventory.moveBag('tiny','pouch');Inventory.openBag('pouch');document.querySelector('#duplex-dialog-actions button').click();
assert(pouch.children.length===0&&pack.children.includes(tiny),'Take Everything button matches double click unpack');
const safeRoom=Inventory.createBag('Safe Room',{room:true,id:'safe'}),safeNest=Inventory.createBag('Safe Nest',{parentId:safeRoom.id,id:'safe-nest'});Inventory.addItem(safeNest.id,{name:'Map'});Inventory.leaveRoom(safeRoom.id,true);
assert(Inventory.getBag('safe-nest').items[0].name==='Map','safe room preserves nested hierarchy');
const danger=Inventory.createBag('Danger Room',{room:true,id:'danger'}),dangerChild=Inventory.createBag('Danger Child',{parentId:danger.id,id:'danger-child'});Inventory.addItem(dangerChild.id,{name:'Ash'});Inventory.leaveRoom(danger.id,false);
assert(!Inventory.getBag('danger')&&!Inventory.getBag('danger-child')&&Inventory.getBag('pouch'),'danger room cleanup recursively removes only that room tree');
Save.save();
const exported=Save.serialize(),parsed=JSON.parse(exported);
assert(parsed.format==='DuplexSave'&&parsed.schema===1&&parsed.story==='Test'&&parsed.history.length>=1,'portable save payload');
assert(parsed.mods.some(mod=>mod.id==='another-author.alchemy'&&mod.version==='1.0.0'),'save metadata includes enabled mod IDs and versions');
State.variables.x=99;
Save.import(exported);
assert(State.variables.x===2&&dom.window.localStorage.getItem('duplex-save-Test'),'JSON save import and browser persistence');
assert(Inventory.getBag('safe-nest')?.items[0].name==='Map','nested inventory survives save export/import');
let wrongStory=false;try{Save.import(JSON.stringify({...parsed,story:'Other Story'}));}catch(error){wrongStory=/different story/.test(error.message);}
assert(wrongStory,'reject wrong-story save');
let damaged=false;try{Save.import('{broken');}catch(error){damaged=/valid JSON/.test(error.message);}
assert(damaged,'reject malformed save');
const legacy={...parsed};delete legacy.mods;Save.import(legacy);assert(State.variables.x===2,'older save without mod metadata loads');
const oldHistorySave={...parsed,variables:{...parsed.variables,x:42},history:[{title:'Start',html:'<p>old-history-output</p>',variables:{...parsed.variables,x:42},mode:'replace'}]};
Save.import(oldHistorySave);assert(State.variables.x===42&&document.querySelector('.duplex-passage-body').textContent.includes('old-history-output'),'old html history entries migrate without recompiling passage side effects');Save.import(exported);
await Duplex.mods.disable('another-author.alchemy');const warnings=Duplex.mods.checkSave([{id:'missing.mod',version:'1.0.0'},{id:'another-author.alchemy',version:'1.0.0'},{id:'plain-object.mod',version:'9.0.0'}]);assert(warnings.length===3&&warnings.some(message=>message.includes('disabled')),'missing, disabled, and mismatched save mods warn without rejection');await Duplex.mods.enable('another-author.alchemy');
Save.import({...parsed,mods:[{id:'missing.mod',version:'1.0.0'}]});assert(document.querySelector('#duplex-dialog-body').textContent.includes('missing.mod 1.0.0')&&document.querySelector('#duplex-dialog-body').textContent.includes('save was loaded'),'save mod warnings are displayed to players after loading');document.querySelector('#duplex-dialog-actions button:last-child').click();
Duplex.mods.open();assert(document.querySelector('#duplex-mod-list').textContent.includes('Alchemy'),'mod manager lists installed mods');document.querySelector('#duplex-dialog-actions button:last-child').click();
await Duplex.mods.import({...validMod,id:'hostile.mod',name:'<img src=x onerror=alert(1)>',description:'<script>bad()</script>'});Duplex.mods.open();assert(!document.querySelector('#duplex-mod-list img')&&!document.querySelector('#duplex-mod-list script')&&document.querySelector('#duplex-mod-list').textContent.includes('<img'),'mod manager treats hostile metadata as text');document.querySelector('#duplex-dialog-actions button:last-child').click();
dom.window.UI.alert('Hello');assert(document.querySelector('#duplex-dialog').hasAttribute('open') && document.querySelector('#duplex-dialog-body').textContent.includes('Hello'),'UI alert');document.querySelector('#duplex-dialog-actions button:last-child').click();

[...document.querySelectorAll('[data-duplex-action]')].find(el => el.textContent === 'Add').click();
assert(State.variables.x === 5,'button body');
[...document.querySelectorAll('[data-duplex-action]')].find(el => el.textContent === 'Reveal').click();
assert(document.body.textContent.includes('secret'),'linkreplace body');

const checkbox=document.querySelector('input[type=checkbox]'); checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
assert(State.variables.check === true,'checkbox');
const cycle=[...document.querySelectorAll('a[data-duplex-action]')].find(el=>el.textContent==='A');cycle.click();
assert(State.variables.cycle === 2 && cycle.textContent === 'B','cycle');
const [listbox,dropdown]=document.querySelectorAll('select');listbox.value='1';listbox.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
assert(State.variables.list === 2,'listbox');
assert([...dropdown.options].map(option=>option.textContent).join(',')==='deer,dog,hare,fox,Owl,Hawk,hunted'&&State.variables.target.variable==='deer','dropdown options from inline values, arrays, and object lists');
dropdown.value='5';dropdown.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
assert(State.variables.target.variable==='hawk','dropdown updates an object variable receiver');
const textbox=document.querySelector('input[type=text]');textbox.value='changed';textbox.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
assert(State.variables.text === 'changed','textbox');

document.querySelector('[data-passage=Next]').click();
assert(document.querySelectorAll('article').length === 2,'append navigation');
Inventory.createBag('Temporary',{id:'temporary'});
document.querySelector('#duplex-back').click();
assert(document.querySelectorAll('article').length === 1,'back navigation');
assert(!Inventory.getBag('temporary')&&Inventory.getBag('safe-nest'),'Back restores the complete prior inventory hierarchy');

const persistentStory=`<tw-storydata name="Persistent Test" ifid="PERSISTENT-IFID" startnode="1">${passage('1','Start','Ready')}${passage('2','StoryInit','<<script>>State.variables.modWasReady = Duplex.mods.createItem("persist.mod", "token").id;<</script>>')}</tw-storydata>`;
const persistentHtml=format.source.replace('{{STORY_NAME}}','Persistent Test').replace('{{STORY_DATA}}',persistentStory);
const persistentOptions={runScripts:'dangerously',url:'https://example.test/persistent',beforeParse(window){window.indexedDB=indexedDB;window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};}};
const emptyPersistentHtml=format.source.replace('{{STORY_NAME}}','Persistent Test').replace('{{STORY_DATA}}',`<tw-storydata name="Persistent Test" ifid="PERSISTENT-IFID" startnode="1">${passage('1','Start','Ready')}</tw-storydata>`);
const firstPersistent=new JSDOM(emptyPersistentHtml,persistentOptions);await firstPersistent.window.Duplex.ready;await firstPersistent.window.Duplex.mods.import({schema:1,id:'persist.mod',name:'Persistent',version:'1.0.0',items:[{id:'token',name:'Token'}]});firstPersistent.window.close();
const restoredPersistent=new JSDOM(persistentHtml,persistentOptions);await restoredPersistent.window.Duplex.ready;
assert(restoredPersistent.window.Duplex.mods.has('persist.mod')&&restoredPersistent.window.State.variables.modWasReady==='persist.mod:token','IndexedDB mods restore before StoryInit and the starting passage');restoredPersistent.window.close();

// Content tags: notice + Skip button, reader auto-skip settings, <<skipto>>, <<skipsummary>>, saves, and the shortcut.
const skipStory=`<tw-storydata name="Skip Test" ifid="SKIP-IFID" startnode="1">
  ${passage('1','Start','Choose. [[Fight]] [[Quiet->Calm]]')}
  ${passage('2','Fight','<<set $fought to true>>Blood everywhere. <<skipsummary>>You win the fight. [[Summary link->Calm]]<</skipsummary>>[[Back home->Start]] [[After]]<<skipto "After">>','violence gore')}
  ${passage('3','Calm','Peaceful. [[Romance]]')}
  ${passage('4','Romance','A tender moment. [[After]]','Sex')}
  ${passage('5','After','The end.')}
  ${passage('6','Dead end','Nothing links out.','skip')}
  ${passage('7','Broken','<<skipto "Nowhere">>[[After]]','skip')}
</tw-storydata>`;
const skipDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Skip Test').replace('{{STORY_DATA}}',skipStory),{runScripts:'dangerously',url:'https://example.test/skip',beforeParse(window){window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};}});
const sw=skipDom.window, sd=sw.document, last=()=>sd.querySelector('#duplex-passages > article:last-child');
sd.querySelector('.duplex-passage-body p').click();
assert(sw.State.history.length===1,'clicking passage text does not re-navigate to the same passage');
assert(!sd.querySelector('.duplex-content-notice'),'untagged passages have no content notice');
sw.Duplex.go('Fight');
let notice=last().querySelector('.duplex-content-notice');
assert(notice&&notice.textContent.includes('Violence, Gore')&&!notice.classList.contains('is-skipped')&&!last().querySelector('.duplex-passage-body').hidden,'tagged passage shows a labelled content notice and its text');
assert(sw.Duplex.skip.target()==='After','<<skipto>> sets the skip target ahead of the first link');
assert(!last().querySelector('.duplex-passage-body').textContent.includes('You win the fight'),'skip summary is hidden while the passage is shown');
notice.querySelector('[data-duplex-skip]').click();
assert(sw.State.history.at(-1).title==='After'&&sw.State.variables.fought===true,'Skip button jumps to the target, and the skipped passage still ran');
sw.Duplex.go('Romance');
assert(last().querySelector('.duplex-content-notice').textContent.includes('Sexual content'),'tag matching ignores case and uses labels');
assert(sw.Duplex.skip.target()==='After','first link is the fallback skip target');
sw.Duplex.go('Dead end');
assert(last().querySelector('[data-duplex-skip]').disabled&&sw.Duplex.skip.skip()===false,'Skip is disabled when there is nowhere to go');
sw.UI.settings();
const rows=[...sd.querySelectorAll('[data-duplex-skip-tag]')].map(input=>input.dataset.duplexSkipTag);
assert(rows.join(',')==='skip,sex,violence,gore','settings list only content tags the story uses, in configured order');
const violenceBox=sd.querySelector('[data-duplex-skip-tag="violence"]');violenceBox.checked=true;violenceBox.dispatchEvent(new sw.Event('change',{bubbles:true}));
assert(sw.Duplex.skip.isSkipped('violence')&&JSON.parse(sw.localStorage.getItem('duplex-skip-SKIP-IFID')).violence===true,'reader choice is stored per story');
sd.querySelector('#duplex-dialog-actions button:last-child').click();
sw.Duplex.go('Fight');
notice=last().querySelector('.duplex-content-notice');
assert(notice.classList.contains('is-skipped')&&last().querySelector('.duplex-passage-body').hidden&&notice.querySelector('.duplex-skip-summary').textContent.includes('You win the fight'),'auto-skipped passage is hidden behind a placeholder with its summary');
assert(notice.querySelector('.duplex-skip-summary [data-passage=Calm]'),'links in the skip summary work');
notice.querySelector('[data-duplex-reveal]').click();
assert(!last().querySelector('.duplex-passage-body').hidden&&sw.State.history.at(-1).revealed===true&&!last().querySelector('.duplex-content-notice.is-skipped'),'Show anyway reveals the passage and remembers it');
sw.Save.save();sw.Duplex.go('Calm');sw.Save.load();
assert(sw.State.history.at(-1).title==='Fight'&&sw.State.history.at(-1).revealed===true&&!last().querySelector('.duplex-passage-body').hidden,'saves keep revealed passages revealed');
sw.Duplex.go('Calm');sw.Duplex.back();
assert(!last().querySelector('.duplex-passage-body').hidden,'revealed passages stay revealed after Back');
sw.Duplex.skip.set('violence',false);
assert(!last().querySelector('.duplex-content-notice.is-skipped'),'changing a setting refreshes visible passages');
sd.dispatchEvent(new sw.KeyboardEvent('keydown',{key:'S',shiftKey:true,bubbles:true,cancelable:true}));
assert(sw.State.history.at(-1).title==='After','Shift+S skips the current tagged passage');
sw.Config.skip.autoAdvance=true;sw.Duplex.skip.set('gore',true);sw.Duplex.go('Fight');
assert(sw.State.history.at(-1).title==='After'&&sw.State.history.at(-2).title==='Fight','autoAdvance passes straight through auto-skipped passages');
sw.Config.skip.autoAdvance=false;
sw.Config.skip.defaults='death';sw.Config.skip.labels=sw.Object.assign(sw.Object.create(null),{});
assert(sw.Duplex.skip.isSkipped('death')&&sw.Duplex.skip.label('constructor')==='constructor','a single default tag string works and labels ignore inherited keys');
sw.Config.skip.labels={};sw.Duplex.skip.set('constructor',true);assert(sw.Duplex.skip.label('constructor')==='constructor'&&sw.Duplex.skip.isSkipped('constructor')&&!sw.Duplex.skip.isSkipped('toString'),'stored choices ignore inherited keys');
sw.Duplex.go('Broken');
assert(last().querySelector('[data-duplex-skip]').disabled&&sw.Duplex.skip.skip()===false&&sw.State.history.at(-1).title==='Broken','Skip is disabled when <<skipto>> names a missing passage');
sw.Duplex.mods.register({schema:1,id:'skip.mod',name:'Skip Mod',version:'1.0.0',items:[],passageExtensions:[
  {id:'lead-in',target:'Fight',placement:'before',content:'A quest marker glows. [[Follow the marker->Calm]]'},
  {id:'redirect',target:'Fight',placement:'after',content:'<<skipto "Calm">><<skipsummary>>The mod adds a twist.<</skipsummary>><template data-duplex-skip-target="Start" onclick="x"><img src="x" onerror="window.modSkipRan=1"></template><template class="other"><b>dropped</b></template>'},
  {id:'lead-in-2',target:'Romance',placement:'before',content:'[[Mod detour->Calm]]'}
]});
sw.Duplex.go('Fight');
const modNotice=last().querySelector('.duplex-content-notice');
assert(modNotice.classList.contains('is-skipped')&&sw.Duplex.skip.target()==='After','a mod\'s <<skipto>> never changes where a story passage skips to');
assert(modNotice.textContent.includes('You win the fight')&&modNotice.textContent.includes('The mod adds a twist'),'mod <<skipsummary>> text is shown with the passage summary');
assert(!last().querySelector('[onclick],[onerror],template.other')&&[...last().querySelectorAll('template')].every(marker=>!/onerror|onclick/.test(marker.outerHTML))&&!sw.modSkipRan,'only clean skip markers survive the mod sanitizer');
modNotice.querySelector('[data-duplex-skip]').click();
assert(sw.State.history.at(-1).title==='After','Continue follows the story\'s own target');
sw.Duplex.go('Romance');
assert(sw.Duplex.skip.target()==='After','links added by mods are not used as the first-link fallback');
// Quest mods can add their own places; their links and <<skipto>> find those places first.
const questMod={schema:1,id:'quest.mod',name:'Quest',version:'1.0.0',items:[],
  passageExtensions:[{id:'cave-door',target:'Calm',placement:'after',content:'[[Enter the cave->Cave]]'}],
  passages:[
    {name:'Cave',tags:['violence'],text:'<<skipto "Shrine">><<skipsummary>>You escape the cave.<</skipsummary>>Bats everywhere. <<script>>window.questScript=1<</script>>[[Home->Start]] [[Deeper->Shrine]]'},
    {name:'Shrine',text:'A quiet shrine. <<include "Lore">> [[Back to the story->After]]'},
    {name:'Lore',text:'old-lore-ok'}
  ]};
sw.Duplex.mods.register(questMod);
const cavePassage='DuplexModPassage:quest.mod:Cave',shrinePassage='DuplexModPassage:quest.mod:Shrine';
sw.Duplex.skip.set('violence',false);sw.Duplex.go('Calm');
const caveLink=[...last().querySelectorAll('[data-passage]')].find(link=>link.textContent==='Enter the cave');
assert(caveLink?.dataset.passage===cavePassage,'a mod extension links to the mod\'s own place');
caveLink.click();
assert(sw.State.history.at(-1).title===cavePassage&&last().querySelector('.duplex-passage-title').textContent==='Cave'&&sd.querySelector('#duplex-current-passage').textContent==='Cave','mod places show their own name');
assert(last().querySelector('.duplex-content-notice')&&sw.Duplex.skip.target()===shrinePassage,'a mod place can be content-tagged and its <<skipto>> goes to the mod\'s own place');
assert(!sw.questScript&&last().textContent.includes('Blocked'),'mod places are restricted like other mod text');
assert([...last().querySelectorAll('[data-passage]')].some(link=>link.dataset.passage==='Start'),'mod links to names the mod does not define go to the story');
last().querySelector('[data-duplex-skip]').click();
assert(sw.State.history.at(-1).title===shrinePassage&&last().textContent.includes('old-lore-ok'),'Skip follows the mod target, and <<include>> finds the mod\'s own passage');
assert(sw.tags(cavePassage).includes('violence')&&sw.tags(cavePassage).includes('restricted'),'mod places carry their tags plus mod and restricted');
sw.Duplex.go('Cave');assert(sd.querySelector('#duplex-passages').textContent.includes('Passage not found: Cave'),'story code cannot reach a mod place by its bare name');
const questSave=sw.Save.serialize();
const noModDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Skip Test').replace('{{STORY_DATA}}',skipStory),{runScripts:'dangerously',url:'https://example.test/skip2',beforeParse(window){window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};}});
let questError='';try{noModDom.window.Save.import(questSave);}catch(error){questError=error.message;}
assert(questError.includes('quest.mod'),'a save in a mod place explains which mod it needs');noModDom.window.close();
for(const [bad,why] of [[{name:'Lair',text:'',tags:['widget']},'protected tag'],[{name:'A->B',text:''},'link syntax in name'],[{name:'Cave',text:''},'duplicate name']]){
  let rejected=false;try{sw.Duplex.mods.register({schema:1,id:'bad.'+why.replace(/\W/g,''),name:'Bad',version:'1.0.0',items:[],passages:why==='duplicate name'?[bad,bad]:[bad]});}catch(_){rejected=true;}
  assert(rejected,'mod passages with a '+why+' are rejected');
}
skipDom.window.close();

// Regression checks from the 1.7.0 bug comb.
const combPassages=[
  ['StoryInit','<<set $inits to ($inits or 0) + 1>>'],
  ['Start',`<<set $msg to "cats and dogs or birds, it is not here">><<set $my_var to 3>><<set $a to 1, $b to 2>><<set _who to "Nest">>
[$msg] [$my_var] [$a$b] snake_case_word
<<markdown>>
Hi _who, see [docs](https://a.test/c_d_e) and _emphasis_
<</markdown>>
<<link [[Square link->Shop]]>><</link>> [[Quote "name"]]
<<nosuchmacro 1>> <<big $a > 0>>
[[Shop]]`],
  ['Shop','<<set $gold to 5>><<button "Buy">><<set $gold -= 1>><</button>>'],
  ['Quote "name"','quoted'],
  ['Md','# Heading\n- item','markdown'],
  ['StoryCaption','<<if true>>unclosed'],
  ['W','<<widget "big">>[big <<print _args.length>>]<</widget>><<widget "bad name">>x<</widget>>','widget']
];
const combStory=`<tw-storydata name="Comb" ifid="COMB-IFID" startnode="2">${combPassages.map(([name,text,tags=''],index)=>passage(String(index+1),name,text,tags)).join('')}</tw-storydata>`;
const combErrors=[];
const combOptions={runScripts:'dangerously',url:'https://example.test/comb',beforeParse(window){window.console.error=(...args)=>combErrors.push(args.join(' '));window.console.warn=(...args)=>combErrors.push(args.join(' '));window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};}};
const combHtml=format.source.replace('{{STORY_NAME}}','Comb').replace('{{STORY_DATA}}',combStory);
const comb=new JSDOM(combHtml,combOptions), cw=comb.window, cd=cw.document, cbody=()=>cd.querySelector('#duplex-passages > article:last-child .duplex-passage-body');
assert(cw.State.history.length===1&&cw.State.history[0].title==='Start','an invalid widget definition does not stop the story from starting');
assert(combErrors.some(message=>message.includes('bad name')),'invalid widget names are reported');
assert(cw.State.variables.msg==='cats and dogs or birds, it is not here','keyword operators are not rewritten inside strings');
assert(cw.State.variables.my_var===3&&cbody().textContent.includes('[3]'),'variable names may contain underscores');
assert(cw.State.variables.a===1&&cw.State.variables.b===2,'<<set>> accepts several "to" assignments');
assert(cbody().textContent.includes('snake_case_word'),'underscores inside words are not read as temporary variables');
assert(cbody().textContent.includes('Hi Nest')&&cbody().querySelector('a[href="https://a.test/c_d_e"]')&&cbody().querySelector('em')?.textContent==='emphasis','markdown keeps _temp variables and URL underscores, and still supports _emphasis_');
assert([...cbody().querySelectorAll('a')].some(link=>link.textContent==='Square link'),'<<link [[label->target]]>> works');
assert([...cbody().querySelectorAll('[data-passage]')].some(link=>link.dataset.passage==='Quote "name"'),'passage names containing quotes link correctly');
assert(cbody().textContent.includes('Unknown macro: <<nosuchmacro 1>>'),'unknown macros are shown as errors instead of vanishing');
assert(cbody().textContent.includes('[big 3]'),'widget arguments may contain >');
assert(cd.querySelector('#story-caption .duplex-error')&&cd.querySelector('#duplex-current-passage').textContent==='Start','an error in a UI passage stays inside that region');
cw.Duplex.go('Md');assert(cbody().querySelector('h1')?.textContent==='Heading'&&cbody().querySelector('li'),'[markdown]-tagged passages render as markdown');
cw.Duplex.go('Shop');cbody().querySelector('button').click();assert(cw.State.variables.gold===4,'button works in the same session');
const combSave=cw.Save.serialize();
const combLoaded=new JSDOM(combHtml,combOptions);combLoaded.window.Save.import(combSave);
combLoaded.window.document.querySelector('#duplex-passages > article:last-child button').click();
assert(combLoaded.window.State.variables.gold===3,'controls in a loaded save still work after a page reload');
cw.UI.settings();cd.dispatchEvent(new cw.KeyboardEvent('keydown',{key:'1',bubbles:true,cancelable:true}));
assert(cw.State.history.at(-1).title==='Shop','number keys do not follow links behind an open dialog');
cd.querySelector('#duplex-dialog-actions button:last-child').click();
cd.querySelector('#duplex-restart').click();
assert(cd.querySelector('#duplex-dialog').open&&cw.State.history.at(-1).title==='Shop','Restart asks before restarting');
cd.querySelector('#duplex-dialog-actions button').click();
assert(cw.State.history.length===1&&cw.State.variables.inits===1&&cw.State.variables.gold===undefined,'Restart runs StoryInit once on fresh variables');
cw.Inventory.createBag('Pouch',{id:'pouch'});cw.Inventory.addItem('pouch',{name:'Coin'});cw.Inventory.openBag('pouch');
[...cd.querySelectorAll('#duplex-dialog-actions button')].find(button=>button.textContent==='Take Everything').click();
assert(cd.querySelector('#duplex-dialog').open&&cd.querySelector('#duplex-dialog-body').textContent.includes('Choose a destination bag'),'inventory problems are shown to the reader');
const hostile=JSON.parse(combSave);hostile.history.at(-1).baseHtml+='<img src="x" onerror="window.pwned=1"><a href="javascript:window.pwned=2">bad</a><script>window.pwned=3</script><b class="kept">kept html</b>';
const forgedId='duplex-action-999-forged';hostile.history.at(-1).baseHtml+='<button data-duplex-action="'+forgedId+'">forged</button>';hostile.actions[forgedId]={kind:'button',body:'<<run window.pwned=4>>'};
const hostileDom=new JSDOM(combHtml,combOptions),hw=hostileDom.window;hw.Save.import(JSON.stringify(hostile));
const hostileBody=hw.document.querySelector('#duplex-passages > article:last-child');
[...hostileBody.querySelectorAll('button')].find(button=>button.textContent==='forged').click();
assert(!hw.pwned&&!hostileBody.querySelector('[onerror],script,a[href^="javascript"]')&&hostileBody.querySelector('b.kept'),'imported saves keep HTML but lose JavaScript, and forged controls do not run');
[...hostileBody.querySelectorAll('button')].find(button=>button.textContent==='Buy').click();
assert(hw.State.variables.gold===3,'genuine controls still work in a cleaned save');
hostileDom.window.close();
comb.window.close();combLoaded.window.close();

// {{button Label|Passage}} is a [[link]] shown as a button.
const buttonLinkStory=`<tw-storydata name="Button Links" ifid="BUTTON-LINK-IFID" startnode="1">${passage('1','Start','{{button Go on|Next}} {{BUTTON Back->Start}} {{button Third<-Third}} {{button Next}} [[Plain->Next]] {{not a button}} {{Short|Next}} {{Short arrow->Third}} {{Next}}')}${passage('2','Next','Arrived next')}${passage('3','Third','Arrived third')}</tw-storydata>`;
const buttonLinkDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Button Links').replace('{{STORY_DATA}}',buttonLinkStory),{runScripts:'dangerously',url:'https://example.test/button-links',beforeParse(window){window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};}});
const bld=buttonLinkDom.window.document, blBody=()=>bld.querySelector('#duplex-passages > article:last-child .duplex-passage-body');
const blButtons=[...blBody().querySelectorAll('button.duplex-button-link')];
assert(blButtons.map(button=>button.textContent+'>'+button.dataset.passage).join(',')==='Go on>Next,Back>Start,Third>Third,Next>Next,Short>Next,Short arrow>Third,Next>Next','{{button}} accepts |, ->, <- and plain forms, in any letter case, and the word button may be left out');
assert(blBody().textContent.includes('{{not a button}}'),'other {{...}} text is left alone');
blButtons[0].click();
assert(blBody().textContent.includes('Arrived next'),'clicking a {{button}} goes to its passage');
buttonLinkDom.window.close();

// Twine 2.6+ story map: button links are reported as references.
const formatText=await readFile(new URL('../format.js', import.meta.url),'utf8');
const tweegoJson=JSON.parse(formatText.slice(formatText.indexOf('{'),formatText.lastIndexOf('}')+1));
assert(tweegoJson.name==='Duplex'&&tweegoJson.source===format.source,'Tweego can still read format.js as JSON (first "{" to last "}")');
const parseReferences=format.editorExtensions?.twine?.['^2.6.0']?.references?.parsePassageText;
assert(typeof parseReferences==='function','format.js gives Twine a references parser');
assert(JSON.stringify(parseReferences(`{{button Go on|Next}} {{BUTTON Back->Start}} {{button Third<-Label}} {{button Plain}} <<button "Rest" "Camp">><</button>> <<link 'x' 'It\\'s'>><</link>> <<link "y">><</link>> <<link "z" "transition">><</link>> {{not a button}} {{Short|Crossover}}`))===JSON.stringify(['Next','Start','Third','Plain','Camp',"It's",'Crossover']),'the references parser finds {{button}}, <<button>> and <<link>> targets');

// Places as rooms: safe rooms keep what is left in them, unsafe rooms are cleared when the reader leaves.
const roomStory=`<tw-storydata name="Rooms" ifid="ROOMS-IFID" startnode="1">
  ${passage('1','Road','The road. [[Inn]] [[Swamp]] [[Camp]]')}
  ${passage('2','Inn','A warm inn. <<run Inventory.addItem(Duplex.rooms.current(), {name:"Cloak"})>>[[Road]]','safe-room')}
  ${passage('3','Swamp','A bog. <<run Inventory.addItem(Duplex.rooms.current(), {name:"Boot"})>>[[Road]]','unsafe-room')}
  ${passage('4','Camp','A campfire. [[Road]]','camp')}
  ${passage('5','StoryInit','')}
</tw-storydata>`;
const roomDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Rooms').replace('{{STORY_DATA}}',roomStory),{runScripts:'dangerously',url:'https://example.test/rooms',beforeParse(window){window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};}});
const rw=roomDom.window,rooms=rw.Duplex.rooms,roomEvents=[];
rw.document.addEventListener(':roomenter',event=>roomEvents.push('enter '+event.detail.passage+' '+event.detail.safe));
rw.document.addEventListener(':roomleave',event=>roomEvents.push('leave '+event.detail.passage+' '+event.detail.safe));
assert(rooms.current()===null&&!rooms.isRoom('Road'),'untagged places are not rooms');
rw.Duplex.go('Inn');
assert(rooms.isSafe('Inn')&&rw.Inventory.getBag('room:Inn')?.room===true&&rw.Inventory.getBag('room:Inn').items[0]?.name==='Cloak','entering a safe place opens its room before the passage runs');
rw.Duplex.go('Road');
assert(rw.Inventory.getBag('room:Inn')?.items.length===1,'a safe room keeps what was left in it');
rw.Duplex.go('Swamp');
assert(rooms.isUnsafe('Swamp')&&rw.Inventory.getBag('room:Swamp')?.items[0]?.name==='Boot','an unsafe place opens a room too');
rw.Duplex.go('Road');
assert(!rw.Inventory.getBag('room:Swamp'),'leaving an unsafe place clears its room');
rw.Duplex.back();
assert(rw.Inventory.getBag('room:Swamp')?.items[0]?.name==='Boot','Back restores the unsafe room');
assert(roomEvents.join('|')==='enter Inn true|leave Inn true|enter Swamp false|leave Swamp false','room enter and leave events fire with safety');
rw.Config.rooms.safeTags.push('camp');rw.Duplex.go('Road');rw.Duplex.go('Camp');
assert(rooms.isSafe('Camp')&&rw.Inventory.getBag('room:Camp'),'authors can add their own safe and unsafe tags');
rw.Duplex.mods.register({schema:1,id:'bog.mod',name:'Bog',version:'1.0.0',items:[],passages:[{name:'Deep Bog',room:'unsafe',text:'Sinking.'},{name:'Hut',room:'safe',text:'Dry.'}]});
const bog=rw.Duplex.mods.passageName('bog.mod','Deep Bog'),hut=rw.Duplex.mods.passageName('bog.mod','Hut');
assert(rooms.isUnsafe(bog)&&rooms.isSafe(hut)&&rw.hasTag(bog,'unsafe-room'),'mod places can declare themselves safe or unsafe');
rw.Duplex.go(bog);assert(rw.Inventory.getBag(rooms.id(bog))?.name==='Deep Bog','mod rooms use the place\'s own name');
rw.Duplex.go(hut);assert(!rw.Inventory.getBag(rooms.id(bog))&&rw.Inventory.getBag(rooms.id(hut)),'leaving an unsafe mod place clears its room');
let badRoom=false;try{rw.Duplex.mods.register({schema:1,id:'bad.room',name:'Bad',version:'1.0.0',items:[],passages:[{name:'X',text:'',room:'cozy'}]});}catch(_){badRoom=true;}
assert(badRoom,'mod room must be safe or unsafe');
roomDom.window.close();

// Patch-style .mod files: plain text, "Key: value" settings, Twee-like "::" sections, name as id.
const patchStory=`<tw-storydata name="Patch Test" ifid="PATCH-IFID" startnode="1">
  ${passage('1','Forest1','Tall pines.')}
  ${passage('2','Town Square','The square.')}
  ${passage('3','Widgets','',"widget")}
  ${passage('4','StoryInit','')}
</tw-storydata>`;
const patchDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Patch Test').replace('{{STORY_DATA}}',patchStory),{runScripts:'dangerously',url:'https://example.test/patch',beforeParse(window){window.indexedDB=indexedDB;window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;};}});
const pw=patchDom.window;await pw.Duplex.ready;
const patchLast=()=>pw.document.querySelector('article:last-child .duplex-passage-body');
const patchText=`Mod: Night Walk
Author: Neston

:: before Forest1
patch-before

:: after Forest1
After a while, a [[lantern->Lantern Path]] glows.
\\:: escaped line

:: Lantern Path [skip safe-room]
<<skipto "Forest1">>A path of lanterns. <<script>>window.patchScript=1<</script>>[[Back->Forest1]]

:: place After Dark
night-place

:: items
[{ "id": "lantern", "name": "Lantern" }]
`;
const patchParsed=pw.Duplex.mods.parse(patchText);
assert(patchParsed.name==='Night Walk'&&patchParsed.version==='1.0.0'&&patchParsed.passageExtensions.length===2&&patchParsed.passages.length===2&&patchParsed.items.length===1&&!pw.Duplex.mods.has('Night Walk'),'parse() turns .mod text into a manifest without installing it');
assert(patchParsed.passageExtensions[1].content.includes('After a while')&&patchParsed.passageExtensions[1].content.endsWith(':: escaped line')&&patchParsed.passages[1].name==='After Dark','section bodies keep prose, \\:: escapes, and :: place names that start with a keyword');
const patchMod=await pw.Duplex.mods.import(patchText);
assert(patchMod.id==='Night Walk'&&pw.Duplex.mods.has('Night Walk'),'the mod name is its id');
pw.Duplex.go('Forest1');
assert(/patch-before[\s\S]*Tall pines\.[\s\S]*After a while/.test(patchLast().textContent),':: before and :: after add text around the story passage');
const lanternLink=[...patchLast().querySelectorAll('[data-passage]')].find(link=>link.textContent==='lantern'),lanternPlace=pw.Duplex.mods.passageName('Night Walk','Lantern Path');
assert(lanternLink?.dataset.passage===lanternPlace,'patch extension links reach the mod\'s own place');
lanternLink.click();
assert(!pw.patchScript&&patchLast().textContent.includes('Blocked')&&pw.Duplex.rooms.isSafe(lanternPlace)&&pw.tags(lanternPlace).includes('skip'),'patch places are restricted and keep their Twee tags');
assert(pw.Duplex.mods.createItem('Night Walk','lantern').id==='Night Walk:lantern','patch mods can define items with the usual JSON');
await pw.Duplex.mods.disable('Night Walk');pw.Duplex.go('Forest1');assert(!patchLast().textContent.includes('patch-before'),'disabling a patch mod removes its text');await pw.Duplex.mods.enable('Night Walk');
const fileMod=new pw.File(['﻿:: after Town Square\r\nfrom-file\r\n'],'Market Day.mod',{type:''});fileMod.text=()=>Promise.resolve('﻿:: after Town Square\r\nfrom-file\r\n');
await pw.Duplex.mods.import(fileMod);pw.Duplex.go('Town Square');
assert(pw.Duplex.mods.has('Market Day')&&patchLast().textContent.includes('from-file'),'a .mod file with no Mod: line is named after the file');
const reopened=new JSDOM(format.source.replace('{{STORY_NAME}}','Patch Test').replace('{{STORY_DATA}}',patchStory),{runScripts:'dangerously',url:'https://example.test/patch',beforeParse(window){window.indexedDB=indexedDB;window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};}});
await reopened.window.Duplex.ready;reopened.window.Duplex.go('Forest1');
assert(reopened.window.Duplex.mods.has('Night Walk')&&reopened.window.document.querySelector('article:last-child').textContent.includes('patch-before'),'patch mods are stored and restored like JSON mods');reopened.window.close();
for(const [bad,expect,why] of [
  [':: after Forest2\nx','line 1','missing target names its line'],
  ['Mod: A\n\n:: after Widgets\nx','line 3','protected passage names its section line'],
  ['Mod: B\nColour: red','unknown setting','unknown settings'],
  ['Mod: C\n:: items\n[oops','not valid JSON','broken item JSON'],
  ['Mod: D\nVersion: 1\nVersion: 2','set twice','repeated settings'],
  ['Mod: E:F\n:: after Forest1\nx','colons','colons in the name'],
  ['Mod: Night Walk\n:: after Forest1\nx','already installed','duplicate names'],
  [':: after Forest1\nx','Mod:','a mod with no name']
]){let message='';try{await pw.Duplex.mods.import(bad);}catch(error){message=error.message;}assert(message.includes(expect),why+' rejected (got: '+message+')');}
await pw.Duplex.mods.import({schema:1,name:'Named Only',version:'1.0.0',items:[{id:'x',name:'X'}]});
assert(pw.Duplex.mods.has('Named Only')&&pw.Duplex.mods.createItem('Named Only','x').id==='Named Only:x','JSON mods may leave out id and use their name');
const taggedItems=pw.Duplex.mods.parse('Mod: Tagged\n:: Quest Items [items]\n[{ "id": "rope", "name": "Rope" }]\n:: Shed [Items]\n[{ "id": "axe", "name": "Axe" }]\n:: Itemsworth Hall [itemsy]\nnot-items');
assert(taggedItems.items.map(item=>item.id).join()==='rope,axe'&&taggedItems.passages.length===1&&taggedItems.passages[0].name==='Itemsworth Hall','an [items] tag works like :: items');
const exampleMod=await readFile(new URL('../examples/haunted-house.mod', import.meta.url),'utf8');
const exampleManifest=pw.Duplex.mods.parse(exampleMod);
assert(exampleManifest.name==='Haunted House'&&exampleManifest.passages.length===3&&exampleManifest.items[0].id==='brass-key','the example .mod parses');
patchDom.window.close();

// Speech bubbles: <<speaker>> presets, <<speech>> options, safe colors, restricted mods.
const speechStory=`<tw-storydata name="Speech" startnode="1">
  ${passage('2','StoryInit',`<<speaker "Wynn" "img/wynn.png">>
<<speaker "Rook" "img/rook.png" circle right lavender name "Rook">>`)}
  ${passage('1','Start',`<<speech "Wynn">>Hello from $where. [[Onward->Next]]<</speech>>
<<speech "Rook" shout notail>>Loud!<</speech>>
<<speech "Wynn" "img/wynn-angry.png" thought mint small left>>Hmm.<</speech>>
<<speech fill "#ffb3b3" outline "red;background:url(x)" text "rgb(10, 20, 30)">>Custom<</speech>>
<<speech "Nobody">>Who?<</speech>>
<<speech noportrait "Wynn">>Plain<</speech>>
<<speech portrait "img/x.png" name "<b>Tag</b>" circle>>Named<</speech>>`)}
  ${passage('3','Next','next')}
  ${passage('4','Mirror',`<<speaker "You" player circle right>>
<<speech "You">>That's me.<</speech>>
<<speech "You" "img/mask.png">>In a mask.<</speech>>`)}
</tw-storydata>`;
const speechDom=new JSDOM(format.source.replace('{{STORY_NAME}}','Speech').replace('{{STORY_DATA}}',speechStory.replace('$where','the den')),{runScripts:'dangerously',url:'https://example.test/speech',beforeParse(window){window.indexedDB=indexedDB;window.scrollTo=()=>{};window.requestAnimationFrame=callback=>callback();window.HTMLElement.prototype.scrollIntoView=()=>{};}});
const speechWin=speechDom.window;await speechWin.Duplex.ready;const bubbles=[...speechWin.document.querySelectorAll('#duplex-passages .duplex-speech')];
assert(bubbles.length===7,'every <<speech>> draws one bubble (got '+bubbles.length+')');
const [plainB,shoutB,thoughtB,customB,unknownB,noPicB,namedB]=bubbles;
const has=(el,...names)=>names.every(name=>el.classList.contains('duplex-speech--'+name));
assert(has(plainB,'solid','cyan','left','square','medium')&&plainB.querySelector('.duplex-speech-portrait img').getAttribute('src')==='img/wynn.png'&&plainB.querySelector('.duplex-speech-tail')&&plainB.dataset.speaker==='Wynn','a saved speaker gives the default bubble: solid, cyan, left, rounded square, tail');
assert(plainB.querySelector('.duplex-speech-text [data-passage=Next]')?.textContent==='Onward'&&plainB.textContent.includes('Hello from the den.'),'bubble text compiles links and markup');
assert(!plainB.closest('p'),'a bubble is never nested inside a paragraph');
assert(has(shoutB,'shout','lavender','right','circle')&&!shoutB.querySelector('.duplex-speech-tail')&&shoutB.querySelector('.duplex-speech-name').textContent==='Rook','options on <<speech>> add to the speaker preset, and notail drops the tail');
assert(has(thoughtB,'thought','mint','small','left','square')&&thoughtB.querySelector('img').getAttribute('src')==='img/wynn-angry.png','a picture after the speaker name swaps the portrait for one bubble, and left overrides the preset side');
assert(!customB.querySelector('.duplex-speech-portrait')&&customB.style.getPropertyValue('--duplex-speech-fill')==='#ffb3b3'&&customB.style.getPropertyValue('--duplex-speech-text').replace(/\s/g,'')==='rgb(10,20,30)'&&!customB.getAttribute('style').includes('url('),'custom colors are set, and unsafe color text is refused');
assert(!unknownB.querySelector('.duplex-speech-portrait')&&unknownB.textContent.includes('Who?'),'an unknown speaker name draws a bubble without a broken picture');
assert(!noPicB.querySelector('.duplex-speech-portrait'),'noportrait hides the saved portrait');
assert(has(namedB,'circle')&&namedB.querySelector('.duplex-speech-name').textContent==='<b>Tag</b>'&&!namedB.querySelector('.duplex-speech-name b')&&namedB.querySelector('img').getAttribute('src')==='img/x.png','name text is escaped and portrait "file" works without a speaker');
assert(speechWin.Duplex.speakers.has('Rook')&&speechWin.Duplex.speakers.get('Rook').shape==='circle'&&speechWin.Duplex.speakers.names().join()==='Wynn,Rook','Duplex.speakers reads saved speakers');
assert(speechWin.Duplex.speakers.define('Moth','"img/moth.png" night whisper')&&speechWin.Duplex.speakers.get('Moth').color==='night'&&speechWin.Duplex.speakers.get('Moth').image==='img/moth.png','Duplex.speakers.define saves a speaker from JavaScript');
let portraitRenders=0;speechWin.setup.playerPortrait={renderCurrent(){portraitRenders++;speechWin.document.documentElement.style.setProperty('--player-chat-portrait','url("data:image/png;base64,AAAA")');return Promise.resolve();}};
speechWin.Duplex.go('Mirror');await new Promise(resolve=>setTimeout(resolve,0));
const mirror=[...speechWin.document.querySelectorAll('#duplex-passages article:last-child .duplex-speech')];
assert(mirror[0].querySelector('.duplex-speech-player')&&!mirror[0].querySelector('img')&&mirror[0].querySelector('.duplex-speech-player').getAttribute('aria-label')==='You'&&has(mirror[0],'circle','right'),'a player speaker draws the player portrait instead of an <img>');
assert(mirror[1].querySelector('img')?.getAttribute('src')==='img/mask.png'&&!mirror[1].querySelector('.duplex-speech-player'),'a picture after a player speaker swaps in that picture');
assert(portraitRenders===1,'the story player-portrait renderer is asked to draw once (got '+portraitRenders+')');
speechWin.Duplex.go('Mirror');await new Promise(resolve=>setTimeout(resolve,0));
assert(portraitRenders===1,'the renderer is not asked again once the portrait exists');
speechWin.Duplex.speakers.setPlayerPortrait('img/me "x".png');
assert(speechWin.document.documentElement.style.getPropertyValue('--duplex-player-portrait').includes('img/me %22x%22.png'),'Duplex.speakers.setPlayerPortrait sets the player picture safely');
speechWin.Duplex.speakers.setPlayerPortrait(null);
assert(!speechWin.document.documentElement.style.getPropertyValue('--duplex-player-portrait'),'setPlayerPortrait(null) clears it');
await speechWin.Duplex.mods.import('Mod: Bubble Mod\n:: after Next\n<<speech "Wynn" dashed fill "#000">>From a mod<</speech>><<speaker "Wynn" "evil.png">><<speaker "Ghost" "img/ghost.png" white thought>><<speaker "Bad" "javascript:alert(1)">><<speech "Ghost">>Boo<</speech>>');
speechWin.Duplex.go('Next');
const modBubble=speechWin.document.querySelector('#duplex-passages article:last-child .duplex-speech');
assert(modBubble&&has(modBubble,'dashed')&&modBubble.textContent.includes('From a mod')&&!modBubble.hasAttribute('style'),'mods can use <<speech>> with presets, but inline colors are stripped');
assert(speechWin.Duplex.speakers.get('Wynn').image==='img/wynn.png'&&speechWin.document.querySelector('#duplex-passages article:last-child').textContent.includes('cannot replace the story speaker "Wynn"'),'mods cannot replace story speakers');
const ghost=[...speechWin.document.querySelectorAll('#duplex-passages article:last-child .duplex-speech')].find(bubble=>bubble.textContent.includes('Boo'));
assert(speechWin.Duplex.speakers.get('Ghost')?.fromMod&&ghost&&has(ghost,'white','thought')&&ghost.querySelector('img').getAttribute('src')==='img/ghost.png','mods can add their own speakers');
assert(speechWin.Duplex.speakers.has('Bad')&&!speechWin.Duplex.speakers.get('Bad').image,'a mod speaker picture with an unsafe URL is dropped');
speechWin.Duplex.go('Start');
assert(speechWin.document.querySelector('#duplex-passages article:last-child .duplex-speech[data-speaker="Wynn"] img').getAttribute('src')==='img/wynn.png','story passages still show the story speaker after a mod tried to replace it');
speechDom.window.close();

console.log('Duplex runtime tests passed.');
