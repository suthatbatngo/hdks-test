import {bounded,bucket,db,error,HttpError,json,rate,requireAdmin,sameOrigin} from '@/lib/server';
import {currentHomework,homeworkGrade,publicHomework} from '@/lib/homework';
import {mergeFiles,signature} from '@/lib/pipeline';
import {LIMITS} from '@/lib/shared';
type Context={params:Promise<{grade:string}>};
export async function GET(r:Request,{params}:Context){try{const grade=homeworkGrade((await params).grade);return json({homework:publicHomework(await currentHomework(grade))})}catch(e){return error(e)}}
export async function POST(r:Request,{params}:Context){let stagedKey='';try{
 sameOrigin(r);await requireAdmin(r);await rate(r,'homework-upload',20,3600);const grade=homeworkGrade((await params).grade);
 if(!r.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new HttpError(400,'Hãy chọn tệp PDF, JPG hoặc PNG.');
 const raw=await bounded(r,LIMITS.file+65536),form=await new Response(raw as any,{headers:{'content-type':r.headers.get('content-type')!}}).formData();
 const file=form.get('file'),expectedId=form.get('expectedId');
 if(!(file instanceof File)||form.getAll('file').length!==1||typeof expectedId!=='string')throw new HttpError(400,'Hãy chọn một tệp bài tập.');
 const previous=await currentHomework(grade);if((previous?.id||'')!==expectedId)throw new HttpError(409,'Bài tập vừa thay đổi. Hãy tải lại trước khi lưu.');
 let processed;try{processed=await mergeFiles([file])}catch(e){throw new HttpError(400,(e as Error).message)}
 const original=new Uint8Array(await file.arrayBuffer()),kind=signature(original),bytes=kind==='pdf'?processed.bytes:original;
 const contentType=kind==='pdf'?'application/pdf':kind==='png'?'image/png':'image/jpeg';
 const id=crypto.randomUUID(),updatedAt=new Date().toISOString(),filename=file.name.normalize('NFC').replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,180)||'bai-tap.pdf';
 stagedKey=`homework/${grade}/${id}/${kind==='pdf'?'assignment.pdf':kind==='png'?'assignment.png':'assignment.jpg'}`;
 await bucket().put(stagedKey,bytes,{httpMetadata:{contentType}});
 const saved=previous?await db().prepare('UPDATE homework SET id=?,filename=?,content_type=?,updated_at=?,file_size=?,storage_key=? WHERE grade=? AND id=? RETURNING id').bind(id,filename,contentType,updatedAt,bytes.length,stagedKey,grade,expectedId).first():await db().prepare('INSERT INTO homework(grade,id,filename,content_type,updated_at,file_size,storage_key) VALUES(?,?,?,?,?,?,?) ON CONFLICT(grade) DO NOTHING RETURNING id').bind(grade,id,filename,contentType,updatedAt,bytes.length,stagedKey).first();
 if(!saved)throw new HttpError(409,'Bài tập vừa thay đổi. Hãy tải lại trước khi lưu.');
 const row={grade,id,filename,contentType,updatedAt,size:bytes.length,storageKey:stagedKey};stagedKey='';
 if(previous)try{await bucket().delete(previous.storageKey)}catch{console.error('Homework old file cleanup failed')}
 return json({homework:publicHomework(row)},201);
 }catch(e){if(stagedKey)try{await bucket().delete(stagedKey)}catch{}return error(e)}}
export async function DELETE(r:Request,{params}:Context){try{sameOrigin(r);await requireAdmin(r);const grade=homeworkGrade((await params).grade),expectedId=new URL(r.url).searchParams.get('id');const row=await db().prepare('DELETE FROM homework WHERE grade=? AND id=? RETURNING storage_key AS storageKey').bind(grade,expectedId||'').first<{storageKey:string}>();if(!row)throw new HttpError(409,'Bài tập đã thay đổi hoặc đã được xóa. Hãy tải lại.');try{await bucket().delete(row.storageKey)}catch{console.error('Homework deleted file cleanup failed')}return json({ok:true})}catch(e){return error(e)}}
