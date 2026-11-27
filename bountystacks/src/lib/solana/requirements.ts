import { createHash } from 'node:crypto';
export function requirementsHash(description:string,criteria:string[]){return createHash('sha256').update(JSON.stringify({description,acceptanceCriteria:criteria})).digest('hex');}
