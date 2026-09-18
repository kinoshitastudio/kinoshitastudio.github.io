import fs from "fs";
/* 🔴 芯を2箇所に置かない（食い違う）。本体 index.html の中の芯をそのまま取り出して試す */
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const a = html.indexOf("/*==== 芯"), b = html.indexOf("/*==== 盤 ====*/");
if (a < 0 || b < 0) { console.log("🔴 index.html から芯を取り出せない"); process.exit(1); }
const mod = new Function(html.slice(a, b) + "\nreturn {build};")();
const W=1200,H=520;
const raw=new Uint8Array(fs.readFileSync(new URL("字.bin", import.meta.url)));
const 既定={close:30,warp:0,sharp:1.0,tip:.28,fat:.95,wob:.14,smooth:1.5,minArea:600,seed:7};
const sum=a=>a.reduce((x,y)=>x+y,0);
const 基=mod.build(raw,W,H,既定);
const 基数=sum(基.out);
const 違い=(a,b)=>{let n=0;for(let i=0;i<a.length;i++) if(a[i]!==b[i]) n++; return n;};
const 試し=[
  ["閉じ",     {close:60}],
  ["反り(＋)", {warp:.25}],
  ["反り(−)",  {warp:-.25}],
  ["尖り",     {sharp:2.4}],
  ["先の長さ", {tip:.45}],
  ["刃の太さ", {fat:.55}],
  ["ゆらぎ",   {wob:.45}],
  ["なめらか", {smooth:4}],
  ["刳らない小ささ",{minArea:3000}],
  ["種",       {seed:99}],
];
console.log(`基準 出=${基数}`);
let ng=0;
for (const [名,d] of 試し){
  const r=mod.build(raw,W,H,Object.assign({},既定,d));
  const v=違い(基.out,r.out);
  const 効 = v > W*H*0.0008;                      /* 0.08% 以上動けば効いている */
  if(!効) ng++;
  console.log(`  ${効?"✅":"🔴"} ${名.padEnd(16)} 変わった画素 ${String(v).padStart(7)}（${(v/(W*H)*100).toFixed(2)}%）`);
}
// 素に戻す＝字そのものになるか
const 素=mod.build(raw,W,H,Object.assign({},既定,{close:0,sharp:0,warp:0,wob:0,smooth:0}));
const ズレ=違い(素.out, raw);
console.log(`  ${ズレ < W*H*0.005 ?"✅":"🔴"} 素に戻す        元の字との差 ${ズレ}（${(ズレ/(W*H)*100).toFixed(2)}%）`);
console.log(ng===0 ? "\n✅ つまみは全部効いた" : `\n🔴 効かないつまみ ${ng}本`);
