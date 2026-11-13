import type { IntersectionIR, SchemaIR } from "../../types.js";
import type { FastGen, SlowGen } from "../context.js";

export function slowIntersection(ir: SchemaIR & { type: "intersection" }, g: SlowGen): string {
  const leftOutput = g.temp("il");
  const rightOutput = g.temp("ir");
  const leftIssues = g.temp("ile");
  const rightIssues = g.temp("ire");
  const mergeResult = g.temp("imr");
  const mergeFunction = g.temp("im");

  g.ctx.preamble.push(`function ${mergeFunction}(a,b){
    if(a===b)return{valid:true,data:a};
    if(a instanceof Date&&b instanceof Date&&+a===+b)return{valid:true,data:a};
    var ao=a!==null&&typeof a==="object"&&!Array.isArray(a);
    var bo=b!==null&&typeof b==="object"&&!Array.isArray(b);
    if(ao&&bo){
      var ac=a.constructor,bc=b.constructor;
      var ap=ac&&ac.prototype,bp=bc&&bc.prototype;
      ao=ac===undefined||typeof ac!=="function"||(
        ap!==null&&typeof ap==="object"&&Object.prototype.hasOwnProperty.call(ap,"isPrototypeOf")
      );
      bo=bc===undefined||typeof bc!=="function"||(
        bp!==null&&typeof bp==="object"&&Object.prototype.hasOwnProperty.call(bp,"isPrototypeOf")
      );
    }
    if(ao&&bo){
      var out=Object.assign({},a,b),keys=Object.keys(a);
      for(var i=0;i<keys.length;i++){
        var k=keys[i];
        if(!Object.prototype.hasOwnProperty.call(b,k))continue;
        var merged=${mergeFunction}(a[k],b[k]);
        if(!merged.valid)return{valid:false,path:[k].concat(merged.path)};
        out[k]=merged.data;
      }
      return{valid:true,data:out};
    }
    if(Array.isArray(a)&&Array.isArray(b)){
      if(a.length!==b.length)return{valid:false,path:[]};
      var arr=[];
      for(var j=0;j<a.length;j++){
        var item=${mergeFunction}(a[j],b[j]);
        if(!item.valid)return{valid:false,path:[j].concat(item.path)};
        arr.push(item.data);
      }
      return{valid:true,data:arr};
    }
    return{valid:false,path:[]};
  }`);

  return (
    `var ${leftOutput}=${g.input},${rightOutput}=${g.input};` +
    `var ${leftIssues}=[],${rightIssues}=[];` +
    g.visit(ir.left, { output: leftOutput, issues: leftIssues }) +
    g.visit(ir.right, { output: rightOutput, issues: rightIssues }) +
    `${g.issues}.push.apply(${g.issues},${leftIssues});` +
    `${g.issues}.push.apply(${g.issues},${rightIssues});` +
    `if(${leftIssues}.length===0&&${rightIssues}.length===0){` +
    `var ${mergeResult}=${mergeFunction}(${leftOutput},${rightOutput});` +
    `if(!${mergeResult}.valid)throw new Error("Unmergable intersection. Error path: "+JSON.stringify(${mergeResult}.path));` +
    `${g.output}=${mergeResult}.data;}`
  );
}

export function fastIntersection(ir: IntersectionIR, g: FastGen): string | null {
  const left = g.visit(ir.left);
  if (left === null) return null;
  const right = g.visit(ir.right);
  if (right === null) return null;
  return left === "true" ? right : right === "true" ? left : `${left}&&${right}`;
}
