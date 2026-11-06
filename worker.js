const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const b64=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(s)};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
async function apply(request,env){
  if(!env.RESEND_API_KEY||!env.TO_EMAIL)return J({ok:false,error:'not configured'},500);
  const fd=await request.formData();
  let rows='',att=[],size=0,reply;
  for(const[k,v]of fd.entries()){
    if(typeof v==='string'){rows+=`<tr><td style="padding:4px 10px"><b>${esc(k)}</b></td><td style="padding:4px 10px">${esc(v)}</td></tr>`;if(k.includes('البريد'))reply=v}
    else if(v.size){size+=v.size;if(size>15e6)return J({ok:false},413);att.push({filename:v.name,content:b64(await v.arrayBuffer())})}
  }
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.FROM_EMAIL||'Falhoom Careers <onboarding@resend.dev>',to:[env.TO_EMAIL],reply_to:reply,subject:'طلب توظيف جديد - موقع أولاد فلهوم',html:`<div dir="rtl"><table>${rows}</table></div>`,attachments:att})});
  return J({ok:r.ok},r.ok?200:502);
}
export default{async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/api/apply')return request.method==='POST'?apply(request,env):J({ok:false},405);
  return env.ASSETS.fetch(request);
}};
