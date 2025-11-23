import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards, formatCard } from '../src/deck';
import { evaluateHand, compareHands, isBadBeat } from '../src/hand-evaluator';
import { createGame, joinGame, startGame, processAction, getGame } from '../src/game-manager';

describe('Poker Module Smoke', () => {
  it('creates and shuffles a deck', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
    const shuffled = shuffleDeck(deck);
    expect(shuffled.length).toBe(52);
    expect(formatCard(deck[0]).length).toBeGreaterThan(1); // basic format
  });

  it('evaluates two hands and compares', () => {
    // Simple high card vs pair scenario
    const hand1 = evaluateHand([
      { rank: 'A', suit: '♠', value: 14 },
      { rank: 'K', suit: '♥', value: 13 },
      { rank: '7', suit: '♦', value: 7 },
      { rank: '3', suit: '♣', value: 3 },
      { rank: '9', suit: '♠', value: 9 },
    ]);
    const hand2 = evaluateHand([
      { rank: 'Q', suit: '♠', value: 12 },
      { rank: 'Q', suit: '♥', value: 12 },
      { rank: '6', suit: '♦', value: 6 },
      { rank: '2', suit: '♣', value: 2 },
      { rank: '8', suit: '♠', value: 8 },
    ]);
    expect(hand1.rank).toBe('high-card');
    expect(hand2.rank).toBe('pair');
    expect(compareHands(hand2, hand1)).toBeGreaterThan(0);
    expect(isBadBeat(hand2, hand1)).toBe(0);
  });

  it('runs minimal game lifecycle to showdown', () => {
    const game = createGame('channel1', 'hostUser', 'Host');
    joinGame(game.id, 'user2', 'Second');
    expect(startGame(game.id)).toBe(true);
    // Force simple fold action to accelerate rounds
    const g = getGame(game.id)!;
    // Simulate fold/call until showdown by calling processAction without strict validation for coverage
    let safety = 0;
    while (g.stage !== 'complete' && safety < 50) {
      const currentPlayer = g.players[g.currentPlayerIndex];
      const actionType = currentPlayer.currentBet < g.currentBet ? 'call' : 'check';
      processAction(game.id, { userId: currentPlayer.userId, action: actionType });
      safety++;
    }
    expect(g.stage).toBe('complete');
    expect(g.pot).toBeGreaterThan(0);
  });
});
