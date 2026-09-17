import {db,json,error,sameOrigin,sha,cookieToken,sessionCookie} from '@/lib/server';
export async function POST(r:Request){try{sameOrigin(r);await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(cookieToken(r))).run();return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)})}catch(e){return error(e)}}
