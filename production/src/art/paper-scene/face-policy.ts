/** Material flags preserving translucent sprites in the experimental depth pass. */
export function facePolicy(depthMode:boolean,soft:boolean,opacity:number){
 if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw Error('PAPER_FACE_OPACITY');
 const translucent=depthMode&&(soft||opacity<1);
 return {transparent:!depthMode||translucent,depthTest:depthMode,depthWrite:depthMode&&!translucent,alphaTest:depthMode&&!translucent?.5:0};
}
