// WINE AI endpoint (Vercel). Mendukung Groq & Gemini dengan fallback otomatis.
// API key dibaca dari database terenkripsi (diatur di Admin → AI) atau Environment Variables.
const {getAiConfig}=require('./_ptero-config');
const SYSTEM='Kamu adalah WINE AI, asisten untuk website WINE Store / MaserwinzStore (toko digital). Jawab dalam bahasa Indonesia santai, ringkas, dan akurat. Bantu menjelaskan cara melihat produk, checkout, metode pembayaran (DANA, GoPay, QRIS, Saldo), deposit saldo minimal Rp1.000, upload bukti deposit, redeem code dan kuota, beli panel Pterodactyl, serta menghubungi admin. Jangan mengarang status pesanan, pembayaran, saldo, stok, atau kebijakan yang tidak terlihat. Jelaskan bahwa persetujuan deposit dan pesanan dilakukan admin. Jangan meminta password, OTP, token, atau data sensitif. Boleh pakai format markdown sederhana (**tebal**, daftar, `kode`).';
async function cfg(){let c={};try{c=(await getAiConfig())||{}}catch{}
 return {groqKey:c.groqKey||process.env.GROQ_API_KEY||'',groqModel:c.groqModel||process.env.GROQ_MODEL||'openai/gpt-oss-120b',geminiKey:c.geminiKey||process.env.GEMINI_API_KEY||'',geminiModel:c.geminiModel||process.env.GEMINI_MODEL||'gemini-2.5-flash'};}
const clean=h=>h.filter(x=>x&&['user','assistant'].includes(x.role)).map(x=>({role:x.role,content:String(x.content||'').slice(0,2000)}));
async function viaGroq(c,history,message){
 const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:`Bearer ${c.groqKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:c.groqModel,temperature:0.5,max_tokens:800,messages:[{role:'system',content:SYSTEM},...history,{role:'user',content:message}]})});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('groq '+r.status);
 return d.choices?.[0]?.message?.content||'';
}
async function viaGemini(c,history,message){
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.geminiModel)}:generateContent`,{method:'POST',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json','x-goog-api-key':c.geminiKey},body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[...history.map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})),{role:'user',parts:[{text:message}]}],generationConfig:{temperature:0.5,maxOutputTokens:800}})});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error('gemini '+r.status);
 return (d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const c=await cfg();
 if(req.method==='GET')return res.status(200).json({providers:{groq:!!c.groqKey,gemini:!!c.geminiKey}});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
  const message=String(body.message||'').trim().slice(0,1200);
  const history=clean(Array.isArray(body.history)?body.history.slice(-8):[]);
  if(!message)return res.status(400).json({error:'Pesan kosong'});
  const want=['groq','gemini'].includes(body.provider)?body.provider:'auto';
  const order=want==='auto'?['groq','gemini']:[want,want==='groq'?'gemini':'groq'];
  const usable=order.filter(p=>p==='groq'?c.groqKey:c.geminiKey);
  if(!usable.length)return res.status(503).json({error:'API AI belum dikonfigurasi. Admin: isi key Groq/Gemini di menu Admin → AI.'});
  // Provider yang dipilih eksplisit dipakai dulu; yang lain jadi cadangan.
  const failures=[];
  for(const p of usable){
   try{const reply=p==='groq'?await viaGroq(c,history,message):await viaGemini(c,history,message);
    if(reply)return res.status(200).json({reply,provider:p,fallback:want!=='auto'&&p!==want});
    failures.push(p+': respons kosong');
   }catch(e){failures.push(p+': '+String(e.message||'gagal').slice(0,100));}
  }
  console.error('[WINE AI] provider failure:',failures.join(' | '));
  return res.status(502).json({error:'Groq dan Gemini gagal merespons. Buka Vercel → Logs untuk detail, lalu periksa model dan API key.'});
 }catch(error){return res.status(500).json({error:'Terjadi kesalahan pada layanan AI'});}
};
