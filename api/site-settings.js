// Pengaturan tampilan situs yang dibaca semua pengunjung (logo). Menulis hanya untuk admin.
const {json,adminOK,getSite,setSite}=require('./_ptero-config');
module.exports=async(req,res)=>{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Method not allowed'});
 try{
  if(req.method==='GET'){const s=await getSite();res.setHeader('Cache-Control','no-store, max-age=0');return json(res,200,{ok:true,logo:s.logo||'',maintenance:!!s.maintenance,maintenanceMessage:typeof s.maintenanceMessage==='string'?s.maintenanceMessage:'',socials:s.socials&&typeof s.socials==='object'?s.socials:{}});}
  if(!adminOK(req))return json(res,401,{error:'Kunci admin salah atau belum disetel.'});
  const b=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
  const s=await getSite();
  if(b.resetLogo)s.logo='';
  else if(typeof b.logo==='string'){
   if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(b.logo))return json(res,400,{error:'Logo harus PNG, JPG, atau WEBP.'});
   if(b.logo.length>400000)return json(res,400,{error:'Logo terlalu besar (maks ±300 KB setelah dikompres).'});
   s.logo=b.logo;
  }
  if(typeof b.maintenance==='boolean')s.maintenance=b.maintenance;
  if(typeof b.maintenanceMessage==='string')s.maintenanceMessage=b.maintenanceMessage.trim().slice(0,240);
  if(b.socials&&typeof b.socials==='object'&&!Array.isArray(b.socials)){
   const clean={};for(const key of ['instagram','telegram','whatsapp']){const value=String(b.socials[key]||'').trim();if(!value){clean[key]='';continue}let u;try{u=new URL(value)}catch{return json(res,400,{error:'Tautan kontak tidak valid.'})}if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return json(res,400,{error:'Tautan kontak harus URL HTTP/HTTPS yang valid.'});clean[key]=u.href} s.socials=clean;
  }
  s.updatedAt=new Date().toISOString();await setSite(s);
  return json(res,200,{ok:true,message:'Logo tersimpan untuk semua pengunjung.'});
 }catch(e){return json(res,503,{error:e.message||'Pengaturan situs gagal diproses.'});}
};
