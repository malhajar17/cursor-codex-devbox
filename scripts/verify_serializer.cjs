const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const manifest=require('../profiles/cursor-macos-3.18.25.json');
const appRoot=process.argv[2];
if(!appRoot)throw Error('Usage: node scripts/verify_serializer.cjs /path/to/Cursor/app');
for(const entry of manifest.files){
 const desktop=entry.path.includes('desktop');
 const name=desktop?'O4e':'xwn';
 const source=fs.readFileSync(path.join(appRoot,entry.path),'utf8');
 const start=source.indexOf('function '+name+'(');
 const end=source.indexOf(desktop?'var Jrv=':'function _jt(',start);
 assert(start>=0&&end>start);
 const deps=desktop?{Bp:1,an:2,ki:3,Qa:4,hu:a=>a.filter(Boolean),ye:{isUri:()=>false},Njr:()=>false,fn:{as:()=>({getAll:()=>[]})},TDt:{DragAndDropContribution:1}}:{cg:1,Ai:2,or:3,Yu:4,up:a=>a.filter(Boolean),Ve:{isUri:()=>false},JIo:()=>false,Ei:{as:()=>({getAll:()=>[]})},Zln:{DragAndDropContribution:1}};
 const serialize=new Function(...Object.keys(deps),source.slice(start,end)+';return '+name)(...Object.values(deps));
 for(const [authority,path] of [['ssh-remote+dev-a','/srv/alice/project'],['ssh-remote+dev-b','/root/Folder With Spaces']]){
  const uri='vscode-remote://'+authority+encodeURI(path);
  const resource={fsPath:path,toString:()=>uri};
  const data={};const event={dataTransfer:{setData:(type,value)=>data[type]=value}};
  serialize({get:key=>key===3?{hasProvider:()=>true}:{}},[{resource,isDirectory:true}],event,{disableStandardTransfer:true});
  const entries=JSON.parse(data['application/vnd.codex.explorer-resources+json']);
  assert.deepEqual(entries,[{uri,fsPath:path,isDirectory:true}]);
 }
 console.log('PASS: installed '+name+' preserves folder URI, SSH authority, and native path');
}
