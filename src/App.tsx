import React, { useState, useEffect, useMemo } from 'react';

// --- Helper Data ---
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUITS = ['S', 'H', 'D', 'C'] as const; // Spades, Hearts, Diamonds, Clubs
const RANK_VALUES: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
const HAND_NAMES = ['Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'];

// --- Helper Functions ---
interface Card {
  rank: string;
  suit: string | null;
}

const parseCard = (cardStr: string): Card | null => {
  if (!cardStr || cardStr.length < 1) return null;
  const upperStr = cardStr.toUpperCase().trim();
  let rank: string, suit: string | null;
  if (upperStr.length === 1) {
    rank = upperStr[0];
    suit = null;
  } else if (upperStr.length === 2) {
    rank = upperStr[0];
    suit = upperStr[1];
    if (rank === '1' && upperStr[1] === '0') {
      rank = 'T';
      suit = null;
    }
  } else if (upperStr.length === 3 && upperStr.startsWith('10')) {
    rank = 'T';
    suit = upperStr[2];
  } else {
    return null;
  }
  if (!RANKS.includes(rank as any) || (suit !== null && !SUITS.includes(suit as any))) return null;
  return { rank, suit };
};

const parseHandRanks = (handStr: string): string[] | null => {
  if (!handStr) return null;
  const upperStr = handStr.toUpperCase().trim();
  if (upperStr.length < 2) return null;
  let rank1 = upperStr[0];
  let rank2 = upperStr[1];
  if (rank1 === '1' && rank2 === '0' && upperStr.length > 2) {
    rank1 = 'T';
    rank2 = upperStr[2];
  }
  if (RANKS.includes(rank1 as any) && RANKS.includes(rank2 as any)) return [rank1, rank2];
  return null;
};

const shuffle = <T,>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getCombinations = (k: number, n: number): number[][] => {
  const result: number[][] = [];
  const comb: number[] = [];
  function next_comb(comb: number[], k: number, n: number, i: number): boolean {
    if (comb.length === 0) { for (let j = 0; j < k; ++j) { comb[j] = j; } return true; }
    i = k - 1;
    ++comb[i];
    while ((i > 0) && (comb[i] >= n - k + 1 + i)) { --i; ++comb[i]; }
    if (comb[0] > n - k) return false;
    for (i = i + 1; i < k; ++i) { comb[i] = comb[i - 1] + 1; }
    return true;
  }
  while (next_comb(comb, k, n, 0)) { result.push(comb.slice()); }
  return result;
};

interface HandDetails {
  rank: number;
  tiebreaker: number[];
}

const getHandDetails = (hand: string): HandDetails => {
  const cards = hand.split(' ');
  const faceValues = cards.map(a => RANK_VALUES[a[0]]);
  const suits = cards.map(a => a[1]);
  const flush = suits.every(s => s === suits[0]);
  let sortedFaceVals = [...faceValues].sort((a, b) => b - a);
  let straight = sortedFaceVals.every((f, i) => i === 0 || f === sortedFaceVals[0] - i);
  let isWheel = false;
  if (!straight && sortedFaceVals[0] === 14 && sortedFaceVals[1] === 5 && sortedFaceVals[2] === 4 && sortedFaceVals[3] === 3 && sortedFaceVals[4] === 2) {
    straight = true;
    isWheel = true;
  }
  const counts = faceValues.reduce((c: Record<number, number>, v) => { c[v] = (c[v] || 0) + 1; return c; }, {});
  const dups = Object.values(counts).reduce((c: Record<number, number>, v) => { c[v] = (c[v] || 0) + 1; return c; }, {});
  let handRank = 9;
  if (dups[4]) handRank = 2;
  else if (dups[3] && dups[2]) handRank = 3;
  else if (dups[3]) handRank = 6;
  else if (dups[2] > 1) handRank = 7;
  else if (dups[2]) handRank = 8;
  if (flush) handRank = Math.min(handRank, 4);
  if (straight) handRank = Math.min(handRank, 5);
  if (flush && straight) handRank = 1;
  let tiebreaker: number[] = [];
  switch (handRank) {
    case 1:
      let highSf = isWheel ? 5 : sortedFaceVals[0];
      tiebreaker = [highSf];
      break;
    case 2:
      const quadRank = Number(Object.keys(counts).find(k => counts[Number(k)] === 4));
      const kicker = Number(Object.keys(counts).find(k => counts[Number(k)] === 1));
      tiebreaker = [quadRank, kicker];
      break;
    case 3:
      const three = Number(Object.keys(counts).find(k => counts[Number(k)] === 3));
      const two = Number(Object.keys(counts).find(k => counts[Number(k)] === 2));
      tiebreaker = [three, two];
      break;
    case 4:
    case 9:
      tiebreaker = sortedFaceVals;
      break;
    case 5:
      let highSt = isWheel ? 5 : sortedFaceVals[0];
      tiebreaker = [highSt];
      break;
    case 6:
      const trip = Number(Object.keys(counts).find(k => counts[Number(k)] === 3));
      const kickers = Object.keys(counts).filter(k => counts[Number(k)] === 1).map(Number).sort((a, b) => b - a);
      tiebreaker = [trip, ...kickers];
      break;
    case 7:
      const pairs = Object.keys(counts).filter(k => counts[Number(k)] === 2).map(Number).sort((a, b) => b - a);
      const kick = Number(Object.keys(counts).find(k => counts[Number(k)] === 1));
      tiebreaker = [...pairs, kick];
      break;
    case 8:
      const pair = Number(Object.keys(counts).find(k => counts[Number(k)] === 2));
      const kicks = Object.keys(counts).filter(k => counts[Number(k)] === 1).map(Number).sort((a, b) => b - a);
      tiebreaker = [pair, ...kicks];
      break;
  }
  return { rank: handRank, tiebreaker };
};

const isBetter = (d1: HandDetails, d2: HandDetails): boolean => {
  if (d1.rank < d2.rank) return true;
  if (d1.rank > d2.rank) return false;
  for (let i = 0; i < d1.tiebreaker.length; i++) {
    if (d1.tiebreaker[i] > d2.tiebreaker[i]) return true;
    if (d1.tiebreaker[i] < d2.tiebreaker[i]) return false;
  }
  return false;
};

const getBestHand = (cards: string[]): HandDetails => {
  const combos = getCombinations(5, cards.length);
  let best: HandDetails | null = null;
  for (let comb of combos) {
    const handCards = comb.map(i => cards[i]);
    const handStr = handCards.join(' ');
    const d = getHandDetails(handStr);
    if (best === null || isBetter(d, best)) best = d;
  }
  return best!;
};

// --- Child Components ---
interface TextInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title?: string;
  placeholder?: string;
}

const TextInput: React.FC<TextInputProps> = ({ id, value, onChange, title, placeholder }) => (
  <div className="flex-1 min-w-[100px]">
    {title && <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{title}</label>}
    <input id={id} type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 uppercase"/>
  </div>
);

interface CommunityCardInputProps {
  id: string;
  cardValue: string;
  onCardChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSuited: boolean;
  onSuitChange: () => void;
  placeholder: string;
  suitCheckboxDisabled: boolean;
}

const CommunityCardInput: React.FC<CommunityCardInputProps> = ({ id, cardValue, onCardChange, isSuited, onSuitChange, placeholder, suitCheckboxDisabled }) => (
    <div className="bg-gray-700/50 p-3 rounded-lg flex-1">
        <TextInput id={id} value={cardValue} onChange={onCardChange} title="" placeholder={placeholder} />
        <div className="mt-2 flex items-center">
            <input id={`${id}-suited`} type="checkbox" checked={!suitCheckboxDisabled && isSuited} onChange={onSuitChange} disabled={suitCheckboxDisabled} className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"/>
            <label htmlFor={`${id}-suited`} className={`ml-2 block text-sm ${suitCheckboxDisabled ? 'text-gray-500' : 'text-gray-300'}`}>Suited with hand</label>
        </div>
    </div>
);

interface CardVisualizationProps {
  handRanks: string[] | null;
  isUnsuited: boolean;
}

const CardVisualization: React.FC<CardVisualizationProps> = ({ handRanks, isUnsuited }) => {
  if (!handRanks || handRanks.length < 2) return <div className="h-32 mb-6"></div>;
  const [rank1, rank2] = handRanks;
  const color1 = isUnsuited ? 'text-gray-900' : 'text-red-500';
  const color2 = 'text-red-500';
  return (
    <div className="flex justify-center gap-4 mb-6 h-32">
      <div className={`w-24 h-full bg-white rounded-lg flex items-center justify-center text-5xl font-bold border-2 border-gray-300 shadow-lg ${color1}`}>{rank1}</div>
      <div className={`w-24 h-full bg-white rounded-lg flex items-center justify-center text-5xl font-bold border-2 border-gray-300 shadow-lg ${color2}`}>{rank2}</div>
    </div>
  );
};

// --- Main App Component ---
interface Result {
  win: string;
  tie: string;
  recommendation: string;
  recommendationColor: string;
  explanation: string;
}

const App: React.FC = () => {
  const [handInput, setHandInput] = useState<string>('AJ');
  const [isUnsuited, setIsUnsuited] = useState<boolean>(true);
  const [board, setBoard] = useState<string[]>(['KH', 'QC', '10S', '', '']);
  const [boardSuited, setBoardSuited] = useState<boolean[]>([false, false, false, false, false]);
  const [players, setPlayers] = useState<number>(6);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string>('');

  const parsedBoard = useMemo(() => board.map(parseCard).filter((card): card is Card => card !== null), [board]);
  const handRanks = useMemo(() => parseHandRanks(handInput), [handInput]);

  const handleBoardChange = (index: number, cardStr: string) => {
    const newBoard = [...board]; newBoard[index] = cardStr; setBoard(newBoard);
  };
  const handleBoardSuitChange = (index: number) => {
    const newBoardSuited = [...boardSuited]; newBoardSuited[index] = !newBoardSuited[index]; setBoardSuited(newBoardSuited);
  };
  const handleReset = () => {
    setHandInput(''); setIsUnsuited(true); setBoard(['', '', '', '', '']); setBoardSuited([false, false, false, false, false]); setPlayers(6); setResult(null); setError('');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Enter') handleReset(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setError(''); setResult(null);
    if (!handRanks) { setError('Please enter a valid two-card hand (e.g., AK, TJ).'); return; }
    const handSuit = 'S';
    const defaultSuit = 'D';
    const holeSuits = isUnsuited ? ['S', 'H'] : ['S', 'S'];
    const yourCards = [handRanks[0] + holeSuits[0], handRanks[1] + holeSuits[1]];
    const boardCardsStr: string[] = [];
    for (let i = 0; i < board.length; i++) {
      const card = parseCard(board[i]);
      if (!card) continue;
      let finalSuit = card.suit;
      if (finalSuit === null) {
        finalSuit = boardSuited[i] ? handSuit : defaultSuit;
      }
      boardCardsStr.push(card.rank + finalSuit);
    }
    const allKnown = [...yourCards, ...boardCardsStr];
    if (new Set(allKnown).size !== allKnown.length) { setError('Duplicate cards found.'); return; }
    let deck: string[] = [];
    for (let r of RANKS) {
      for (let s of SUITS) {
        deck.push(r + s);
      }
    }
    deck = deck.filter(c => !allKnown.includes(c));
    const numOpps = players - 1;
    const numSim = 1000;
    let wins = 0, ties = 0, total = 0;
    while (total < numSim) {
      let remaining = shuffle([...deck]);
      let oppHands: string[][] = [];
      for (let op = 0; op < numOpps; op++) {
        oppHands.push([remaining.shift()!, remaining.shift()!]);
      }
      let toDeal = 5 - boardCardsStr.length;
      let extraBoard = remaining.splice(0, toDeal);
      let fullBoard = [...boardCardsStr, ...extraBoard];
      let yourBest = getBestHand([...yourCards, ...fullBoard]);
      let oppBests = oppHands.map(opp => getBestHand([...opp, ...fullBoard]));
      let isWin = true;
      let isTie = false;
      for (let oppBest of oppBests) {
        if (isBetter(oppBest, yourBest)) {
          isWin = false;
          break;
        } else if (!isBetter(yourBest, oppBest)) {
          isTie = true;
        }
      }
      if (isWin) {
        if (isTie) ties++;
        else wins++;
      }
      total++;
    }
    const winProb = (wins / total * 100).toFixed(1);
    const tieProb = (ties / total * 100).toFixed(1);
    const equity = wins / total * 100 + ties / total * 100 / 2;
    const currentBest = getBestHand([...yourCards, ...boardCardsStr]);
    const explanation = `You have ${HAND_NAMES[currentBest.rank - 1]}.`;
    let recommendation = ''; let recommendationColor = '';
    if (equity > 75) { recommendation = 'Strong Raise'; recommendationColor = 'bg-green-500'; } 
    else if (equity > 50) { recommendation = 'Call / Raise'; recommendationColor = 'bg-blue-500'; } 
    else if (equity > 20) { recommendation = 'Check / Call'; recommendationColor = 'bg-yellow-500'; } 
    else { recommendation = 'Fold'; recommendationColor = 'bg-red-500'; }
    setResult({
      win: winProb,
      tie: tieProb,
      recommendation,
      recommendationColor,
      explanation,
    });
  }, [handRanks, isUnsuited, board, boardSuited, players]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Poker Odds Calculator</h1>
          <p className="text-gray-400 mt-2">Get an edge with real-time hand analysis</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-indigo-300">Your Hand</h2>
              <TextInput id="hand" title="Card Ranks" value={handInput} onChange={(e) => setHandInput(e.target.value)} placeholder="e.g., AK, TJ" />
              <div className="mt-4 flex items-center">
                <input id="unsuited" type="checkbox" checked={isUnsuited} onChange={(e) => setIsUnsuited(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"/>
                <label htmlFor="unsuited" className="ml-2 block text-sm text-gray-300">Cards are unsuited</label>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-3 text-indigo-300">Community Cards (Optional)</h2>
              <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                      <CommunityCardInput id="flop1" placeholder="Flop 1" cardValue={board[0]} onCardChange={(e) => handleBoardChange(0, e.target.value)} isSuited={boardSuited[0]} onSuitChange={() => handleBoardSuitChange(0)} suitCheckboxDisabled={isUnsuited} />
                      <CommunityCardInput id="flop2" placeholder="Flop 2" cardValue={board[1]} onCardChange={(e) => handleBoardChange(1, e.target.value)} isSuited={boardSuited[1]} onSuitChange={() => handleBoardSuitChange(1)} suitCheckboxDisabled={isUnsuited} />
                      <CommunityCardInput id="flop3" placeholder="Flop 3" cardValue={board[2]} onCardChange={(e) => handleBoardChange(2, e.target.value)} isSuited={boardSuited[2]} onSuitChange={() => handleBoardSuitChange(2)} suitCheckboxDisabled={isUnsuited} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                      <CommunityCardInput id="turn" placeholder="Turn" cardValue={board[3]} onCardChange={(e) => handleBoardChange(3, e.target.value)} isSuited={boardSuited[3]} onSuitChange={() => handleBoardSuitChange(3)} suitCheckboxDisabled={isUnsuited} />
                      <CommunityCardInput id="river" placeholder="River" cardValue={board[4]} onCardChange={(e) => handleBoardChange(4, e.target.value)} isSuited={boardSuited[4]} onSuitChange={() => handleBoardSuitChange(4)} suitCheckboxDisabled={isUnsuited} />
                      <div className="flex-1 hidden sm:block"></div>
                  </div>
              </div>
            </div>
            <div>
              <label htmlFor="players" className="block text-xl font-semibold text-indigo-300">Players</label>
              <div className="flex items-center gap-4 mt-2">
                <input id="players" type="range" min="2" max="10" value={players} onChange={(e) => setPlayers(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                <span className="bg-indigo-500 text-white text-sm font-semibold rounded-md px-3 py-1">{players}</span>
              </div>
            </div>
             <button onClick={handleReset} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105">Reset</button>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col justify-start items-center">
            <CardVisualization handRanks={handRanks} isUnsuited={isUnsuited} />
            <h2 className="text-2xl font-bold text-indigo-300 mb-4">Analysis & Recommendation</h2>
            {error ? (
              <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded-lg w-full text-center"><p>{error}</p></div>
            ) : result ? (
              <div className="w-full text-center space-y-6 animate-fade-in">
                <div>
                  <p className="text-gray-400 text-lg">Recommended Action</p>
                  <p className={`text-3xl font-bold py-3 px-6 rounded-lg inline-block text-white shadow-lg ${result.recommendationColor}`}>{result.recommendation}</p>
                </div>
                <div className="flex justify-around items-center pt-4">
                    <div className="text-center">
                        <p className="text-lg text-green-400">Win</p>
                        <p className="text-5xl font-bold text-gray-100">{result.win}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg text-gray-400">Tie</p>
                        <p className="text-5xl font-bold text-gray-100">{result.tie}%</p>
                    </div>
                </div>
                <div className="pt-4">
                    <p className="text-indigo-300 font-semibold">Reasoning:</p>
                    <p className="text-gray-300 italic">{result.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500"><p>Enter your cards to see your odds.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;