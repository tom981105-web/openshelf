// Isolated worker: user JSON/expression stays here; the library comes from a pinned CDN.
// This worker does not expose DOM or same-origin data to JSONata expressions.
try {
  importScripts('https://cdn.jsdelivr.net/npm/jsonata@2.1.0/jsonata.min.js');
  if(typeof jsonata!=='function')throw new Error('JSONata 라이브러리를 읽지 못했습니다.');
  postMessage({kind:'ready'});
}catch(error){postMessage({kind:'error',message:'엔진 다운로드 실패: '+error.message})}
onmessage=async event=>{
  try{
    if(typeof jsonata!=='function')throw new Error('엔진이 준비되지 않았습니다.');
    const {input,expression}=event.data;
    const data=JSON.parse(input);
    const result=await jsonata(expression).evaluate(data);
    postMessage({kind:'result',value:result===undefined?'(결과 없음)':JSON.stringify(result,null,2)});
  }catch(error){postMessage({kind:'error',message:error.message||String(error)})}
};
