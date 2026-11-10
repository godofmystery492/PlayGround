const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = process.env.PORT || 3002;
const rooms = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json' };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/room') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ room: process.env.ROOM_CODE || 'ASHFALL', players: rooms.get(process.env.ROOM_CODE || 'ASHFALL')?.size || 0 })); return;
  }
  let file = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end('Not found'); return; } res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
});
server.on('upgrade', (req, socket) => {
  const upgradeUrl = new URL(req.url, 'http://localhost');
  if (upgradeUrl.pathname !== '/play') { socket.destroy(); return; }
  const key = req.headers['sec-websocket-key']; if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const roomCode = (upgradeUrl.searchParams.get('room') || process.env.ROOM_CODE || 'ASHFALL').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16) || 'ASHFALL';
  if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
  const room = rooms.get(roomCode), player = { socket, id: crypto.randomBytes(4).toString('hex'), x: 0, z: 0, yaw: 0, name: 'Wanderer', alive: true };
  room.add(player);
  function send(obj) { if (socket.destroyed) return; const body = Buffer.from(JSON.stringify(obj)); let head; if (body.length < 126) head = Buffer.from([0x81, body.length]); else { head = Buffer.alloc(4); head[0]=0x81; head[1]=126; head.writeUInt16BE(body.length,2); } socket.write(Buffer.concat([head, body])); }
  function broadcast() { const state = Array.from(room).map(p => ({id:p.id,name:p.name,x:p.x,z:p.z,yaw:p.yaw,alive:p.alive})); for (const p of room) { if (p.socket !== socket) { const body=Buffer.from(JSON.stringify({type:'players',players:state})); const head=body.length<126?Buffer.from([129,body.length]):Buffer.from([129,126,(body.length>>8)&255,body.length&255]); if (!p.socket.destroyed) p.socket.write(Buffer.concat([head,body])); } } }
  send({type:'welcome',id:player.id,room:roomCode,players:Array.from(room).filter(p=>p!==player).map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,yaw:p.yaw,alive:p.alive}))}); broadcast();
  let buffer=Buffer.alloc(0);
  socket.on('data', chunk => { buffer=Buffer.concat([buffer,chunk]); while(buffer.length>=2){ let len=buffer[1]&127, offset=2; if(len===126){if(buffer.length<4)break;len=buffer.readUInt16BE(2);offset=4;}else if(len===127){socket.destroy();return;} const masked=!!(buffer[1]&128); if(masked)offset+=4; if(buffer.length<offset+len)break; let payload=buffer.subarray(offset,offset+len); if(masked){const mask=buffer.subarray(offset-4,offset);payload=Buffer.from(payload);for(let i=0;i<len;i++)payload[i]^=mask[i%4];} buffer=buffer.subarray(offset+len); try{const msg=JSON.parse(payload.toString()); if(msg.type==='move'){player.x=Math.max(-36,Math.min(36,Number(msg.x)||0));player.z=Math.max(-36,Math.min(36,Number(msg.z)||0));player.yaw=Number(msg.yaw)||0;player.alive=!!msg.alive;player.name=String(msg.name||'Wanderer').slice(0,16);broadcast();} else if(msg.type==='chat'){const chat={type:'chat',name:player.name,text:String(msg.text||'').slice(0,120)};for(const p of room){if(!p.socket.destroyed){const body=Buffer.from(JSON.stringify(chat));const head=body.length<126?Buffer.from([129,body.length]):Buffer.from([129,126,body.length>>8,body.length&255]);p.socket.write(Buffer.concat([head,body]));}}}}catch(e){} } });
  socket.on('close',()=>{room.delete(player);broadcast();}); socket.on('error',()=>{room.delete(player);});
});
server.listen(PORT, '0.0.0.0', () => console.log(`Ashfall listening on ${PORT}`));
