import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

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
</tw-storydata>`;

const html = format.source.replace('{{STORY_NAME}}','Test').replace('{{STORY_DATA}}',story);
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://example.test/story',
  beforeParse(window) {
    window.scrollTo = () => {};
    window.requestAnimationFrame = callback => callback();
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open',''); };
    window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
    window.HTMLMediaElement.prototype.load = () => {};
    window.confirm = () => true;
  }
});
const { document, State, Duplex, Save } = dom.window;
const assert = (condition,message) => { if (!condition) throw new Error(message); };

assert(format.version === '1.4.0','format version');
assert(document.body.textContent.includes('switch-ok'),'switch macro');
assert(State.variables.x === 2 && State.variables.scripted,'run and script macros');
assert(Duplex.audio.tracks.size === 1 && Duplex.audio.groups.has(':ui') && Duplex.audio.playlists.has('music'),'audio registration macros');
assert(State.variables.passageMode === 'append','StoryInit tags condition');
assert(document.body.textContent.includes('current-tag-ok'),'current passage hasTag');
const renderedPassage=document.querySelector('.duplex-passage-body').textContent;
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
dom.window.UIBar.hide();assert(dom.window.UIBar.isHidden(),'left bar hide');dom.window.UIBar.show().stow(true);assert(dom.window.UIBar.isStowed(),'left bar stow');dom.window.UIBar.unstow(true);
dom.window.UIBarRight.stow(true);assert(dom.window.UIBarRight.isStowed(),'right bar stow');dom.window.UIBarRight.unstow(true);
assert(dom.window.UIBarL===dom.window.UIBar && dom.window.UIBarR===dom.window.UIBarRight,'short UI bar names and aliases');
assert(Duplex.Save===Save && typeof Save.export==='function' && typeof Save.import==='function','Save API globals');
const { Inventory }=dom.window;
const pack=Inventory.createBag({id:'pack',name:'Pack'},{id:'pack',properties:{capacity:20}});
const pouch=Inventory.createBag({id:'pouch',name:'Pouch'},{id:'pouch',properties:{color:'red'}});
Inventory.addItem('pouch',{name:'Coin',quantity:4});
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
assert(parsed.format==='DuplexSave'&&parsed.schema===1&&parsed.story==='Test'&&parsed.history.length===1,'portable save payload');
State.variables.x=99;
Save.import(exported);
assert(State.variables.x===2&&dom.window.localStorage.getItem('duplex-save-Test'),'JSON save import and browser persistence');
assert(Inventory.getBag('safe-nest')?.items[0].name==='Map','nested inventory survives save export/import');
let wrongStory=false;try{Save.import(JSON.stringify({...parsed,story:'Other Story'}));}catch(error){wrongStory=/different story/.test(error.message);}
assert(wrongStory,'reject wrong-story save');
let damaged=false;try{Save.import('{broken');}catch(error){damaged=/valid JSON/.test(error.message);}
assert(damaged,'reject malformed save');
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

console.log('Duplex runtime tests passed.');
