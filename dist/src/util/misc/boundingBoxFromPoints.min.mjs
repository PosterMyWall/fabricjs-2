import{Point as t}from"../../Point.min.mjs";const n=n=>{if(0===n.length)return{left:0,top:0,width:0,height:0};const{min:e,max:m}=n.reduce(((t,n)=>{let{min:e,max:m}=t;return{min:e.min(n),max:m.max(n)}}),{min:new t(n[0]),max:new t(n[0])}),i=m.subtract(e);return{left:e.x,top:e.y,width:i.x,height:i.y}};export{n as makeBoundingBoxFromPoints};
//# sourceMappingURL=boundingBoxFromPoints.min.mjs.map
