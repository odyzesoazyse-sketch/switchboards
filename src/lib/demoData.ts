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

export const DEMO_JUDGES = [
  "Storm", "Ken Swift", "Crazy Legs", "Asia One", "Roxrite",
  "Flea Rock", "Poe One", "Ivan", "El Nino", "Remind"
];

const TOURNAMENTS = [
  { name: "Red Bull BC One World Final 2024", size: 16, date: "2024-11-09" },
  { name: "Red Bull BC One World Final 2023", size: 16, date: "2023-10-21" },
  { name: "Paris 2024 Olympics", size: 16, date: "2024-08-10" },
  { name: "Outbreak Europe 2024", size: 32, date: "2024-06-15" },
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRoundName(participantsLeft: number): string {
  if (participantsLeft === 2) return "Final";
  if (participantsLeft === 4) return "Semi-Final";
  if (participantsLeft === 8) return "Quarter-Final";
  if (participantsLeft === 16) return "Top 16";
  if (participantsLeft === 32) return "Top 32";
  return `Round of ${participantsLeft}`;
}

export interface JudgeVote {
  judgeName: string;
  votedFor: string;
}

export interface DemoBattle {
  winner: string;
  loser: string;
  tournamentName: string;
  category: 'bboy' | 'bgirl';
  round: string;
  matchPosition: number;
  judgeVotes: JudgeVote[];
  tournamentDate: string;
}

function simulateTournament(
  dancers: string[],
  size: number,
  tournamentName: string,
  tournamentDate: string,
  upsetChance: number = 0.2
): DemoBattle[] {
  const battles: DemoBattle[] = [];
  const participants = shuffle(dancers).slice(0, size);
  
  // Pick 3-5 random judges for this tournament
  const tournamentJudges = shuffle(DEMO_JUDGES).slice(0, 3 + Math.floor(Math.random() * 3));
  
  let currentRound = [...participants];
  let matchPosition = 0;
  
  while (currentRound.length > 1) {
    const roundName = getRoundName(currentRound.length);
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
      
      // Simulate judge votes (majority wins)
      const judgeVotes: JudgeVote[] = tournamentJudges.map(judgeName => {
        // Most judges vote for winner, some might vote for loser
        const votesForWinner = Math.random() > 0.25;
        return {
          judgeName,
          votedFor: votesForWinner ? winner : loser
        };
      });
      
      battles.push({
        winner,
        loser,
        tournamentName,
        category: 'bboy', // Will be set by caller
        round: roundName,
        matchPosition: matchPosition++,
        judgeVotes,
        tournamentDate
      });
      nextRound.push(winner);
    }
    
    currentRound = nextRound;
  }
  
  return battles;
}

export function generateDemoData(): DemoBattle[] {
  const allBattles: DemoBattle[] = [];
  
  for (const tournament of TOURNAMENTS) {
    // B-Boy bracket
    const bboyBattles = simulateTournament(
      BBOYS, 
      tournament.size, 
      tournament.name,
      tournament.date
    );
    for (const battle of bboyBattles) {
      battle.category = 'bboy';
      allBattles.push(battle);
    }
    
    // B-Girl bracket (except Olympics which only had 16 total)
    if (tournament.size <= 16) {
      const bgirlBattles = simulateTournament(
        BGIRLS, 
        Math.min(16, tournament.size),
        tournament.name,
        tournament.date
      );
      for (const battle of bgirlBattles) {
        battle.category = 'bgirl';
        allBattles.push(battle);
      }
    }
  }
  
  return allBattles;
}

export function getTournaments() {
  return TOURNAMENTS;
}
