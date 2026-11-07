const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const b64=buf=>{let s='';const u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(s)};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
async function mail(request,env,subject){
  if(!env.RESEND_API_KEY||!env.TO_EMAIL)return J({ok:false,error:'not configured'},500);
  const fd=await request.formData();
  let rows='',att=[],size=0,reply;
  for(const[k,v]of fd.entries()){
    if(typeof v==='string'){rows+=`<tr><td style="padding:4px 10px"><b>${esc(k)}</b></td><td style="padding:4px 10px">${esc(v)}</td></tr>`;if(k.includes('البريد'))reply=v}
    else if(v.size){size+=v.size;if(size>15e6)return J({ok:false},413);att.push({filename:v.name,content:b64(await v.arrayBuffer())})}
  }
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.FROM_EMAIL||'Falhoom Website <onboarding@resend.dev>',to:[env.TO_EMAIL],reply_to:reply,subject,html:`<div dir="rtl"><table>${rows}</table></div>`,attachments:att})});
  return J({ok:r.ok},r.ok?200:502);
}
async function reviews(request,env,u){
  if(!env.REVIEWS)return J({ok:false,error:'no kv'},503);
  if(request.method==='GET'){
    const l=await env.REVIEWS.list({prefix:'r:',limit:200});
    const items=(await Promise.all(l.keys.map(k=>env.REVIEWS.get(k.name,'json')))).filter(Boolean).sort((a,b)=>b.t-a.t);
    return J({ok:true,items});
  }
  if(request.method==='POST'){
    const b=await request.json();
    const name=String(b.name||'').trim().slice(0,40)||'عميل كريم',text=String(b.text||'').trim().slice(0,400),rating=Math.min(5,Math.max(1,+b.rating||5)),tok=String(b.tok||'').slice(0,64);
    if(text.length<5||tok.length<8)return J({ok:false,error:'bad'},400);
    if(await env.REVIEWS.get('d:'+tok))return J({ok:false,error:'dup'},409);
    const id=Date.now()+'-'+crypto.randomUUID().slice(0,6);
    await env.REVIEWS.put('r:'+id,JSON.stringify({id,name,rating,text,t:Date.now()}));
    await env.REVIEWS.put('d:'+tok,'1');
    return J({ok:true});
  }
  if(request.method==='DELETE'){
    if(!env.ADMIN_KEY||request.headers.get('x-admin-key')!==env.ADMIN_KEY)return J({ok:false},401);
    await env.REVIEWS.delete('r:'+u.searchParams.get('id'));
    return J({ok:true});
  }
  return J({ok:false},405);
}
export default{async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/api/apply'&&request.method==='POST')return mail(request,env,'طلب توظيف جديد - موقع أولاد فلهوم');
  if(u.pathname==='/api/quote'&&request.method==='POST')return mail(request,env,'طلب عرض سعر جديد - موقع أولاد فلهوم');
  if(u.pathname==='/api/reviews')return reviews(request,env,u);
  if(u.pathname.startsWith('/api/'))return J({ok:false},404);
  return env.ASSETS.fetch(request);
}};
