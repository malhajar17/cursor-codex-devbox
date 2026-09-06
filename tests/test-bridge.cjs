const fs = require('node:fs');
const assert = require('node:assert/strict');
const method = fs.readFileSync(__dirname + '/../patches/folder-drop-method.txt', 'utf8');
const Host = new Function('return class {' + method + '}')();
const mime = 'application/vnd.codex.explorer-resources+json';
function host(authority, id='openai.chatgpt') {
 const h=new Host();
 h.extension={id,location:{path:'/custom/install/location',with:fields=>({...fields,fsPath:fields.path})}};
 h._environmentService={remoteAuthority:authority}; h.stats=[];h.messages=[];h.events={};h.disposables=[];
 h._fileService={stat:async uri=>{h.stats.push(uri);if(uri.path==='/missing')throw Error('Not found');return {isDirectory:!uri.path.endsWith('.txt')}}};
 h._logService={warn(){}};
 h.element={style:{},focus(){},getBoundingClientRect:()=>({left:100,right:200,top:0,bottom:100,width:100,height:100})};
 h.window={addEventListener:(type,fn)=>h.events[type]=fn,removeEventListener:type=>delete h.events[type]};
 h._register=d=>h.disposables.push(d);
 h.postMessage=async(message,transfer)=>{assert.deepEqual(transfer,[]);h.messages.push(message);return true};
 h._startBlockingIframeDragEvents();return h;
}
function event(data,x=150){return {clientX:x,clientY:50,dataTransfer:{types:Object.keys(data),getData:t=>data[t]||''},preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}}}
function entry(authority,path,fsPath=path){return {uri:(authority?'vscode-remote://'+authority:'file://')+encodeURI(path),fsPath}}
function drop(h,entries,x){return h.events.drop(event({[mime]:JSON.stringify(entries)},x))}
(async()=>{
 const first=host('ssh-remote+alice-box');const second=host('ssh-remote+bob-box');
 await drop(first,[entry('ssh-remote+alice-box','/srv/work/Folder With Spaces')]);
 await drop(second,[entry('ssh-remote+bob-box','/root/project/é')]);
 assert.equal(first.messages[0].file.path,'/srv/work/Folder With Spaces/');
 assert.equal(second.messages[0].file.path,'/root/project/é/');
 assert.equal(first.stats[0].authority,'ssh-remote+alice-box');assert.equal(second.stats[0].authority,'ssh-remote+bob-box');
 await drop(first,[entry('ssh-remote+bob-box','/root/project/é')]);
 await drop(first,[entry('', '/local-file')]);
 await drop(first,[entry('ssh-remote+alice-box','/outside')],10);
 await first.events.drop(event({'text/plain':'~/must-not-guess-the-home'}));
 assert.equal(first.stats.length,1);
 await drop(first,[entry('ssh-remote+alice-box','/missing')]);assert.equal(first.messages.length,1);
 await drop(first,[entry('ssh-remote+alice-box','/readme.txt'),entry('ssh-remote+alice-box','/readme.txt')]);
 assert.equal(first.messages.length,2);assert.equal(first.messages[1].file.path,'/readme.txt');
 const local=host('');await drop(local,[entry('','/Users/someone/local')]);assert.equal(local.stats[0].scheme,'file');
 await drop(local,[entry('ssh-remote+alice-box','/srv/work')]);assert.equal(local.messages.length,1);
 const windows=host('ssh-remote+windows-box');await drop(windows,[entry('ssh-remote+windows-box','/C:/Projects/Folder','c:/Projects/Folder')]);
 assert.equal(windows.stats[0].path,'/C:/Projects/Folder');assert.equal(windows.messages[0].file.path,'c:/Projects/Folder/');
 await first.events.drop(event({ResourceURLs:JSON.stringify(['vscode-remote://ssh-remote+alice-box/legacy-file.txt'])}));
 assert.equal(first.messages[2].file.fsPath,'/legacy-file.txt');
 first._startBlockingIframeDragEvents();assert.equal(first.disposables.length,1);first.disposables[0].dispose();assert.deepEqual(first.events,{});
 assert.deepEqual(host('ssh-remote+anything','other.extension').events,{});
 assert(!method.includes('/home/'));assert(!method.includes('.cursor-server'));
 console.log('PASS: different SSH hosts and homes, custom install locations, host isolation, local/remote separation, directory markers, Windows paths, URI fallback, missing paths, deduplication, and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
