// Each evaluation takes place in a disposable Worker with a fresh in-memory database.
const base='https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/';
try{
 importScripts(base+'sql-wasm.js');
 postMessage({type:'ready'});
}catch(e){postMessage({type:'error',message:'SQL 엔진 파일 로딩 실패: '+e.message})}
onmessage=async e=>{
 let db;
 try{
  if(typeof initSqlJs!=='function')throw Error('SQLite 로더가 없습니다.');
  const SQL=await initSqlJs({locateFile:file=>base+file});
  db=new SQL.Database();
  const statements=db.exec(e.data.sql);
  postMessage({type:'result',value:JSON.stringify(statements,null,2)});
 }catch(err){postMessage({type:'error',message:err.message||String(err)})}
 finally{if(db)db.close()}
};
