const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const fs=require("fs");

const app=express(),server=http.createServer(app),io=new Server(server);
const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"CHANGE_THIS_SECRET";
const DB="./data.json";

if(!fs.existsSync(DB)) fs.writeFileSync(DB,JSON.stringify({
 users:[{username:"admin",passwordHash:bcrypt.hashSync("admin123",10),role:"admin",approved:true,coins:0}]
},null,2));

const read=()=>JSON.parse(fs.readFileSync(DB));
const write=d=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
app.use(express.json());app.use(express.static("."));

function auth(req,res,next){
 try{const h=req.headers.authorization||"";req.user=jwt.verify(h.replace("Bearer ",""),SECRET);next()}
 catch(e){res.status(401).json({error:"Tidak terautentikasi"})}
}
function admin(req,res,next){if(req.user.role!=="admin")return res.status(403).json({error:"Admin only"});next()}

app.post("/api/register",async(req,res)=>{
 const {username,password}=req.body;if(!username||!password)return res.status(400).json({error:"Data kurang"});
 const d=read();if(d.users.some(u=>u.username===username))return res.status(409).json({error:"Username sudah ada"});
 d.users.push({username,passwordHash:await bcrypt.hash(password,10),role:"member",approved:false,coins:0});write(d);
 io.emit("registrationRequest");res.json({message:"Menunggu ACC admin"});
});
app.post("/api/login",async(req,res)=>{
 const {username,password}=req.body,d=read(),u=d.users.find(x=>x.username===username);
 if(!u||!(await bcrypt.compare(password,u.passwordHash)))return res.status(401).json({error:"Login salah"});
 if(!u.approved)return res.status(403).json({error:"Akun belum di-ACC admin"});
 const token=jwt.sign({username:u.username,role:u.role},SECRET,{expiresIn:"7d"});
 res.json({token,user:{username:u.username,role:u.role,coins:u.coins}});
});
app.get("/api/me",auth,(req,res)=>{const u=read().users.find(x=>x.username===req.user.username);if(!u)return res.status(404).end();res.json({username:u.username,role:u.role,coins:u.coins})});
app.get("/api/admin/pending",auth,admin,(req,res)=>res.json(read().users.filter(u=>u.role==="member"&&!u.approved).map(u=>({username:u.username}))));
app.get("/api/admin/users",auth,admin,(req,res)=>res.json(read().users.map(u=>({username:u.username,role:u.role,coins:u.coins,approved:u.approved}))));
app.post("/api/admin/approve",auth,admin,(req,res)=>{const d=read(),u=d.users.find(x=>x.username===req.body.username);if(!u)return res.status(404).json({error:"Tidak ditemukan"});u.approved=true;write(d);io.emit("pendingChanged");res.json({message:"Akun di-ACC"})});
app.post("/api/admin/reject",auth,admin,(req,res)=>{const d=read(),i=d.users.findIndex(x=>x.username===req.body.username);if(i<0)return res.status(404).json({error:"Tidak ditemukan"});d.users.splice(i,1);write(d);io.emit("pendingChanged");res.json({message:"Akun ditolak"})});
app.post("/api/admin/coins",auth,admin,(req,res)=>{const d=read(),u=d.users.find(x=>x.username===req.body.username),amount=Number(req.body.amount);if(!u||!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Data tidak valid"});u.coins+=Math.floor(amount);write(d);io.emit("coinUpdate",{username:u.username,coins:u.coins});res.json({coins:u.coins})});

const online=new Map();
io.on("connection",socket=>{
 socket.on("joinGame",({token})=>{try{const u=jwt.verify(token,SECRET),d=read(),dbu=d.users.find(x=>x.username===u.username);if(!dbu||!dbu.approved)return socket.emit("errorMessage","Akun belum aktif");socket.user=u;online.set(socket.id,u.username);socket.emit("joined",{coins:dbu.coins});io.emit("players",[...online.values()].map(username=>({username})))}catch(e){socket.emit("errorMessage","Sesi tidak valid")}});
 socket.on("chat",text=>{if(socket.user&&typeof text==="string"&&text.trim())io.emit("chat",{username:socket.user.username,text:text.trim().slice(0,300)})});
 socket.on("disconnect",()=>{online.delete(socket.id);io.emit("players",[...online.values()].map(username=>({username})))});
});

server.listen(PORT,()=>console.log(`Ayep Blass server: http://localhost:${PORT}`));
