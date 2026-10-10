// Pure, dependency-free playground engines. No eval, network calls or third-party execution.
export function formatJson(input) {
  try { return {ok:true, output:JSON.stringify(JSON.parse(input),null,2)}; }
  catch (error) { return {ok:false, output:'JSON 오류: '+error.message}; }
}
export function testRegex(pattern,flags,input) {
  try {
    if(pattern.length>120||input.length>2000) return {ok:false,output:'입력 길이 제한을 초과했어요.'};
    if(!/^[gimsuy]*$/.test(flags)||new Set(flags).size!==flags.length) return {ok:false,output:'지원하지 않는 정규식 플래그입니다.'};
    // Avoid exponential regex execution by prohibiting nested repetition and lookarounds.
    if(/\)[+*{]/.test(pattern)||pattern.includes('(?'))return {ok:false,output:'안전을 위해 중첩 반복·전후방 탐색 표현식은 제한합니다.'};
    const expression=new RegExp(pattern,flags.includes('g')?flags:flags+'g');
    const matches=[];let found;
    while((found=expression.exec(input))!==null&&matches.length<100){
      matches.push({text:found[0],index:found.index});
      if(found[0]==='')expression.lastIndex++;
    }
    return {ok:true,output:matches.length?matches.map((m,i)=> (i+1)+'. ['+m.index+'] '+JSON.stringify(m.text)).join('\n'):'일치하는 항목이 없습니다.'};
  }catch(error){return {ok:false,output:'정규식 오류: '+error.message};}
}
export function renderMarkdown(input){
  // Safe lightweight Markdown preview; escape all HTML and don't create arbitrary links.
  const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const inline=s=>escape(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
  return input.split(/\r?\n/).map(line=>{
    const heading=/^(#{1,3})\s+(.+)$/.exec(line);
    if(heading){const n=heading[1].length;return '<h'+n+'>'+inline(heading[2])+'</h'+n+'>';}
    if(/^[-*]\s+/.test(line))return '<p>• '+inline(line.slice(2))+'</p>';
    return line.trim()?'<p>'+inline(line)+'</p>':'<p>&nbsp;</p>';
  }).join('');
}
