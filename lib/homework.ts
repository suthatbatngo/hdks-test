import {grades} from './shared';
import {db,HttpError} from './server';
export function homeworkGrade(value:string){if(!Object.hasOwn(grades,value))throw new HttpError(400,'Lớp không hợp lệ.');return value as keyof typeof grades}
export type Homework={id:string;grade:string;filename:string;contentType:string;updatedAt:string;size:number};
export async function currentHomework(grade:string){return db().prepare('SELECT id,grade,filename,content_type AS contentType,updated_at AS updatedAt,file_size AS size,storage_key AS storageKey FROM homework WHERE grade=?').bind(grade).first<Homework&{storageKey:string}>()}
export function publicHomework(row:Awaited<ReturnType<typeof currentHomework>>){if(!row)return null;const {storageKey,...visible}=row;return {...visible,url:`/api/homework/${row.grade}/file?v=${row.id}`}}
