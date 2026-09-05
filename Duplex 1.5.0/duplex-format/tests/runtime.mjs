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
<<numberbox "$num" 4>>
<<textbox "$text" "hi">>
<<textarea "$area" "long">>
<<audio "tone" volume 0.3 mute>>
<<masteraudio volume 0.8>>
<<playlist "music" volume 0.4>>
<<bird "Nighthawk">>
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

assert(format.version === '1.5.0','format version');
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
const select=document.querySelector('select');select.value='1';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
assert(State.variables.list === 2,'listbox');
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

console.log('Duplex runtime tests passed.');
