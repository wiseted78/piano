export const SONGS = [
 {id:"joy",title:"Ода к радости",author:"Людвиг ван Бетховен",difficulty:"easy",difficultyLabel:"Легко",bpm:120,notes:[0,1,2,3,2,1,0,0,1,2,2,1,1,0,1,2,3,2,1,0,0,1,2,3,3,2,1,0]},
 {id:"star",title:"Маленькая звезда",author:"Французская народная",difficulty:"easy",difficultyLabel:"Легко",bpm:110,notes:[0,0,2,2,3,3,2,1,1,0,0,3,3,2,2,1,0,0,2,2,3,3,2,1,1,0]},
 {id:"elise",title:"К Элизе",author:"Людвиг ван Бетховен",difficulty:"hard",difficultyLabel:"Сложнее",bpm:130,notes:[2,1,2,1,2,0,3,1,2,3,2,1,0,1,2,1,2,3,0,2,1,2,3,2,1,0]},
 {id:"jingle",title:"Jingle Bells",author:"Джеймс Лорд Пьерпонт",difficulty:"easy",difficultyLabel:"Легко",bpm:125,notes:[0,0,0,0,0,0,0,2,3,0,0,0,0,0,0,2,3,0,2,1,0,3,3,2,1,0]},
 {id:"brother",title:"Братец Яков",author:"Народная мелодия",difficulty:"easy",difficultyLabel:"Легко",bpm:115,notes:[0,1,2,0,0,1,2,0,2,3,2,1,0,2,3,2,1,0,0,1,2,0]}
];

export function makeMap(song, round=1){
  const beat = 60 / song.bpm;
  const notes=[];
  song.notes.forEach((lane,i)=>{
    // Every third/fourth musical event may be a hold.
    const hold = i>4 && i%7===3;
    notes.push({
      id:`${song.id}-${round}-${i}`,
      time:1.7+i*beat,
      lane:(lane + ((round-1+i)%4))%4,
      duration:hold ? beat*1.7 : 0,
      done:false,
      hit:false,
      holding:false,
      released:false
    });
  });
  return notes;
}
