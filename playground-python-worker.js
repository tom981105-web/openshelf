const base='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let runtime;
try{
 importScripts(base+'pyodide.js');
 postMessage({type:'ready'});
}catch(e){postMessage({type:'error',message:'Python 엔진 다운로드 실패: '+e.message})}
onmessage=async e=>{
 try{
  runtime=await loadPyodide({indexURL:base});
  runtime.globals.set('openshelf_source',String(e.data.code));
  runtime.globals.set('openshelf_csv',String(e.data.csv||''));
  const output=await runtime.runPythonAsync(`import sys,io,traceback
_oldout,_olderr=sys.stdout,sys.stderr
_buffer=io.StringIO()
sys.stdout=sys.stderr=_buffer
try:
    exec(compile(openshelf_source,'<openshelf>','exec'), {'__name__':'__main__','openshelf_csv':openshelf_csv})
except BaseException:
    traceback.print_exc()
finally:
    sys.stdout,sys.stderr=_oldout,_olderr
_buffer.getvalue()`);
  postMessage({type:'result',value:String(output).slice(0,60000)});
 }catch(err){postMessage({type:'error',message:String(err.message||err).slice(0,3000)})}
};
