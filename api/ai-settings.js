// Simpan / cek API key AI (Groq & Gemini) secara terenkripsi di database. Hanya admin.
const {json,adminOK,getAiConfig,setAiConfig}=require('./_ptero-config');
module.exports=async(req,res)=>{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 if(!adminOK(req))return json(res,401,{error:'Kunci admin salah atau belum disetel.'});
 try{
  const old=(await getAiConfig())||{};
  if(req.method==='POST'){
   const b=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
   const pick=(v,o)=>{const t=String(v||'').trim();return t||o||''};
   const cfg={
    groqKey:pick(b.groqKey,old.groqKey),groqModel:pick(b.groqModel,old.groqModel)||'openai/gpt-oss-120b',
    geminiKey:pick(b.geminiKey,old.geminiKey),geminiModel:pick(b.geminiModel,old.geminiModel)||'gemini-2.5-flash',
    updatedAt:new Date().toISOString()
   };
   if(b.removeGroq)cfg.groqKey='';if(b.removeGemini)cfg.geminiKey='';
   if(cfg.groqKey&&!/^gsk_[A-Za-z0-9_-]{20,}$/.test(cfg.groqKey))return json(res,400,{error:'Format Groq API key tidak sesuai (biasanya diawali gsk_).'});
   if(cfg.geminiKey&&!/^[A-Za-z0-9_-]{20,}$/.test(cfg.geminiKey))return json(res,400,{error:'Format Gemini API key tidak sesuai.'});
   await setAiConfig(cfg);
   return json(res,200,{ok:true,message:'API AI tersimpan terenkripsi.',hasGroq:!!cfg.groqKey,hasGemini:!!cfg.geminiKey,groqModel:cfg.groqModel,geminiModel:cfg.geminiModel});
  }
  return json(res,200,{ok:true,hasGroq:!!(old.groqKey||process.env.GROQ_API_KEY),hasGemini:!!(old.geminiKey||process.env.GEMINI_API_KEY),groqModel:old.groqModel||process.env.GROQ_MODEL||'openai/gpt-oss-120b',geminiModel:old.geminiModel||process.env.GEMINI_MODEL||'gemini-2.5-flash'});
 }catch(e){return json(res,503,{error:e.message||'Pengaturan AI gagal diproses.'});}
};
