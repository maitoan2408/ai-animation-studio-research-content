/** Native evidence and seek probes must stay inside any validated M4 timeline. */
export function m4ReviewFrames(count:number,release:number):{selected:number[];seek:number[];focus:number}{
 if(!Number.isSafeInteger(count)||!Number.isSafeInteger(release)||release<1||count-release<32)
   throw Error('M4_REVIEW_TIMELINE');
 const last=count-1;
 const selected=[0,release-1,release,...Array.from({length:6},(_,i)=>
   release+Math.round((last-release)*(i+1)/6))];
 return {selected:[...new Set(selected)],seek:[last,Math.min(20,last),release,0,last],
   focus:Math.min(release+30,last)};
}
