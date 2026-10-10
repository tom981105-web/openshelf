const base='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let runtime;
try{
 importScripts(base+'pyodide.js');
 loadPyodide({indexURL:base}).then(value=>{runtime=value;postMessage({type:'ready'})}).catch(e=>postMessage({type:'error',message:'Pyodide 초기화 실패: '+e.message}));
}catch(e){postMessage({type:'error',message:'Python 엔진 다운로드 실패: '+e.message})}
onmessage=async e=>{
 try{
  runtime.globals.set('openshelf_source',String(e.data.code));
  runtime.globals.set('openshelf_csv',String(e.data.csv||''));
  const output=await runtime.runPythonAsync(`import sys,io,traceback,json
_oldout,_olderr=sys.stdout,sys.stderr
_buffer=io.StringIO()
sys.stdout=sys.stderr=_buffer
_scope={'__name__':'__main__','openshelf_csv':openshelf_csv}
_chart_result=None
try:
    exec(compile(openshelf_source,'<openshelf>','exec'), _scope)
    if 'openshelf_chart' in _scope:
        _chart_result=json.dumps(_scope['openshelf_chart'],allow_nan=False)
except BaseException:
    traceback.print_exc()
finally:
    sys.stdout,sys.stderr=_oldout,_olderr
(_buffer.getvalue(),_chart_result)`);
  const parts=output.toJs();
  postMessage({type:'result',value:String(parts[0]).slice(0,60000),chart:typeof parts[1]==='string'?parts[1].slice(0,15000):null});
  output.destroy();
 }catch(err){postMessage({type:'error',message:String(err.message||err).slice(0,3000)})}
};
