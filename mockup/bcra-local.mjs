// Local-only preview. Run with node --use-system-ca mockup/bcra-local.mjs [private CUIT file].
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';

const origin='http://127.0.0.1:4188';
const html=new URL('./mesa-de-credito.html',import.meta.url);
const example=process.argv[2] ? readFileSync(process.argv[2],'utf8').trim() : '';
const root='https://api.bcra.gob.ar/CentralDeDeudores/v1.0/Deudas/';
const methods={actual:'',historial:'Historicas/',cheques:'ChequesRechazados/'};

function validId(id){
  if(!/^\d{11}$/.test(id)||/^(\d)\1+$/.test(id))return false;
  const weights=[5,4,3,2,7,6,5,4,3,2];
  const sum=weights.reduce((n,w,i)=>n+w*Number(id[i]),0);
  return (11-sum%11)%11===Number(id[10]);
}
function check(condition){if(!condition)throw new Error('Formato inesperado')}
function list(value){check(Array.isArray(value));return value}
function label(value){check(typeof value==='string'&&value.trim().length>0);return value}
function numeric(value){check(typeof value==='number'&&Number.isFinite(value)&&value>=0);return value}
function periods(result){
  return list(result.periodos).map(p=>{
    check(/^\d{4}(0[1-9]|1[0-2])$/.test(p.periodo));
    return {periodo:String(p.periodo),entidades:list(p.entidades).map(e=>({
      entidad:label(e.entidad),monto:numeric(e.monto),situacion:numeric(e.situacion),
      diasAtraso:e.diasAtrasoPago??e.diasAtraso??null,enRevision:e.enRevision===true,procesoJud:e.procesoJud===true
    }))};
  }).sort((a,b)=>a.periodo.localeCompare(b.periodo));
}
function checks(result){
  return list(result.causales).flatMap(c=>list(c.entidades).flatMap(bank=>list(bank.detalle).map(ch=>({
    entidad:bank.entidad,causal:label(c.causal),nroCheque:ch.nroCheque,monto:numeric(ch.monto),
    fechaRechazo:ch.fechaRechazo,fechaPago:ch.fechaPago,estadoMulta:ch.estadoMulta,fechaPagoMulta:ch.fechaPagoMulta,
    enRevision:ch.enRevision===true,procesoJud:ch.procesoJud===true
  }))));
}
async function lookup(kind,id){
  try{
    const response=await fetch(root+methods[kind]+id,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000),redirect:'error'});
    if(response.status!==404&&!response.ok)return {state:'error',message:'El BCRA respondió HTTP '+response.status+'.'};
    const payload=await response.json();
    if(response.status===404&&payload.status===404&&Array.isArray(payload.errorMessages)&&payload.errorMessages.some(m=>/no se encontr.{1,4} datos|sin registros/i.test(m)))return {state:'empty'};
    check(response.ok&&payload.status===200&&String(payload.results.identificacion)===id);
    const data=kind==='cheques'?checks(payload.results):periods(payload.results);
    return data.length?{state:'ok',name:label(payload.results.denominacion),data}:{state:'empty'};
  }catch(e){
    return {state:'error',message:e.name==='TimeoutError'?'El BCRA no respondió a tiempo.':'No se pudo verificar la respuesta del BCRA.'};
  }
}
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
  function json(code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))}
  if(req.headers.host!=='127.0.0.1:4188'){json(403,{});return}
  if(req.method==='GET'&&['/','/mesa-de-credito.html'].includes(req.url)){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(readFileSync(html));return;
  }
  if(req.method!=='POST'||req.url!=='/api/bcra'){json(404,{});return}
  if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){json(403,{});return}
  try{
    let body='';
    for await(const chunk of req){body+=chunk;if(body.length>180){json(413,{});return}}
    const input=JSON.parse(body);
    const id=input.example===true?example:String(input.cuit??'').replace(/[\s-]/g,'');
    if(!validId(id)){json(400,{message:input.example?'No hay un CUIT de ejemplo configurado.':'Revisá los 11 dígitos y el verificador del CUIT.'});return}
    const values=await Promise.all(Object.keys(methods).map(async k=>[k,await lookup(k,id)]));
    json(200,{cuit:id,consulted:new Date().toISOString(),...Object.fromEntries(values)});
  }catch{json(400,{message:'Consulta inválida.'})}
});
server.listen(4188,'127.0.0.1',()=>console.log('Prueba BCRA disponible en '+origin));
