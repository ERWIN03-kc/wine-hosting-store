const {json,adminOK,setConfig,getConfig,validateDomain}=require('./_ptero-config');
module.exports=async(req,res)=>{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 if(req.method==='POST'&&!adminOK(req))return json(res,401,{error:'Kunci admin salah atau belum disetel.'});
 try{
  if(req.method==='POST'){
   const b=req.body||{};const domain=validateDomain(String(b.domain||'').trim());
   const old=await getConfig();const newPlta=String(b.plta||'').trim();const newPltc=String(b.pltc||'').trim();
   const plta=newPlta||old?.plta||'';const pltc=newPltc||old?.pltc||'';
   if(!plta) return json(res,400,{error:'PLTA wajib diisi pertama kali.'});
   if(newPlta&&!/^ptla_[A-Za-z0-9_-]+$/.test(newPlta))return json(res,400,{error:'Format PLTA tidak sesuai. Pastikan memakai Application API key (biasanya diawali ptla_).'});
   if(newPltc&&!/^ptlc_[A-Za-z0-9_-]+$/.test(newPltc))return json(res,400,{error:'Format PLTC tidak sesuai. Pastikan memakai Client API key (biasanya diawali ptlc_).'});
   const toId=(v,old)=>{if(v===undefined||v===null||String(v).trim()==='')return old||null;const n=Number(v);if(!Number.isInteger(n)||n<1||n>999999)throw new Error('EGG ID dan LOC ID harus berupa angka bulat positif.');return n;};
   const egg=toId(b.egg,old?.egg),location=toId(b.location,old?.location);
   const updatedAt=new Date().toISOString();await setConfig({domain,plta,pltc,egg,location,updatedAt});
   return json(res,200,{ok:true,message:'Domain, PLTA, PLTC, EGG, dan LOC tersimpan terenkripsi di database.',domain,egg,location,hasPlta:true,hasPltc:!!pltc,updatedAt});
  }
  const c=await getConfig();return json(res,200,{ok:true,configured:!!c,domain:c?.domain||'',egg:c?.egg||Number(process.env.PTERO_EGG_ID)||null,location:c?.location||Number(process.env.PTERO_LOCATION_ID)||null,hasPlta:!!c?.plta,hasPltc:!!c?.pltc,updatedAt:c?.updatedAt||null});
 }catch(e){return json(res, e.message&&(/Isi UPSTASH|WINE_PTERO_ENCRYPTION_KEY/.test(e.message))?503:400,{error:e.message||'Pengaturan gagal diproses.'});}
};
