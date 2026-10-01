// Pure game rules. No DOM dependency.
export const HIT = { perfect: 90, great: 180, good: 280 };

export function judge(deltaMs){
  const d = Math.abs(deltaMs);
  if(d <= HIT.perfect) return {kind:"Perfect", points:100};
  if(d <= HIT.great) return {kind:"Отлично", points:80};
  if(d <= HIT.good) return {kind:"Есть", points:50};
  return null;
}

export function multiplier(combo){ return Math.min(8, 1 + Math.floor(combo / 10)); }

export function accuracy(good, misses, wrong){
  const total = good + misses + wrong;
  if(!total) return 0;
  return Math.max(0, Math.round(good / total * 100));
}
