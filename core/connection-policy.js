'use strict';
function classifyDisconnect(code, message = '') {
 const n = Number(code) || 0, reason = String(message).toLowerCase();
 if (n === 440 || /connection replaced|connectionreplaced|conflict\.type=replaced/.test(reason)) return { type:'CONFLICT', retry:false };
 if (n === 401 || /device_removed|logged.?out|not-authorized/.test(reason)) return { type:'AUTH', retry:false };
 if (n === 515) return { type:'RESTART', retry:true };
 if (n === 405) return { type:'HANDSHAKE', retry:true };
 if ([408,428,500,502,503,504].includes(n) || /timeout|network|econnreset|etimedout/.test(reason)) return { type:'TRANSIENT', retry:true };
 return { type:'UNKNOWN', retry:true };
}
function retryDelay(type, attempt) {
 const n=Math.max(1,Math.min(Number(attempt)||1,5));
 if(type==='RESTART') return 500;
 if(type==='HANDSHAKE') return Math.min(30000,10000*n);
 return Math.min(30000,2000*(2**(n-1)));
}
module.exports={ classifyDisconnect, retryDelay };
