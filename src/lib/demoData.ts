// Demo data generator for breaking rankings

export const BBOYS = [
  "Phil Wizard", "Victor", "Shigekix", "Menno", "Hong 10", "Lil Zoo",
  "Pocket", "Bumblebee", "Killa Kolya", "Neguin", "Thesis", "Kid David",
  "Kareem", "Physicx", "Wing", "Dyzee", "Cheerito", "Alkolil",
  "Taisuke", "Vero", "Lilou", "Storm", "Cico", "Junior",
  "Gravity", "Samuka", "Bruce Almighty", "Kid Karam", "Jeffro", "Spin"
];

export const BGIRLS = [
  "Ami", "Ayumi", "Nicka", "Kastet", "AT", "Vanessa",
  "India", "Logistx", "Sunny", "Anti", "Madmax", "San Andrea",
  "Ram", "Frieda", "Lee", "Kate", "Jilou", "Paulina",
  "Kaycee", "Sara", "Macca", "Emma", "Stefani", "Kimie"
];

const TOURNAMENTS = [
  { name: "Red Bull BC One World Final 2024", size: 16 },
  { name: "Red Bull BC One World Final 2023", size: 16 },
  { name: "Paris 2024 Olympics", size: 16 },
  { name: "Outbreak Europe 2024", size: 32 },
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function simulateTournament(
  dancers: string[],
  size: number,
  upsetChance: number = 0.2
): { winner: string; loser: string }[] {
  const battles: { winner: string; loser: string }[] = [];
  const participants = shuffle(dancers).slice(0, size);
  
  let currentRound = [...participants];
  
  while (currentRound.length > 1) {
    const nextRound: string[] = [];
    
    for (let i = 0; i < currentRound.length; i += 2) {
      if (i + 1 >= currentRound.length) {
        nextRound.push(currentRound[i]);
        continue;
      }
      
      const dancer1 = currentRound[i];
      const dancer2 = currentRound[i + 1];
      
      // Higher seed (earlier in original list) has better chance
      const seed1 = dancers.indexOf(dancer1);
      const seed2 = dancers.indexOf(dancer2);
      
      let winner: string;
      let loser: string;
      
      // Simulate upset
      const isUpset = Math.random() < upsetChance;
      
      if (seed1 < seed2) {
        winner = isUpset ? dancer2 : dancer1;
        loser = isUpset ? dancer1 : dancer2;
      } else {
        winner = isUpset ? dancer1 : dancer2;
        loser = isUpset ? dancer2 : dancer1;
      }
      
      battles.push({ winner, loser });
      nextRound.push(winner);
    }
    
    currentRound = nextRound;
  }
  
  return battles;
}

export interface DemoBattle {
  winner: string;
  loser: string;
  tournamentName: string;
  category: 'bboy' | 'bgirl';
}

export function generateDemoData(): DemoBattle[] {
  const allBattles: DemoBattle[] = [];
  
  for (const tournament of TOURNAMENTS) {
    // B-Boy bracket
    const bboyBattles = simulateTournament(BBOYS, tournament.size);
    for (const battle of bboyBattles) {
      allBattles.push({
        ...battle,
        tournamentName: tournament.name,
        category: 'bboy'
      });
    }
    
    // B-Girl bracket (except Olympics which only had 16 total)
    if (tournament.size <= 16) {
      const bgirlBattles = simulateTournament(BGIRLS, Math.min(16, tournament.size));
      for (const battle of bgirlBattles) {
        allBattles.push({
          ...battle,
          tournamentName: tournament.name,
          category: 'bgirl'
        });
      }
    }
  }
  
  return allBattles;
}
