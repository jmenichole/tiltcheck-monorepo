# DA&D Bot Migration & Implementation Plan
## Degens Against Decency - AI-Powered Discord Card Game

---

## 📋 Overview

**DA&D (Degens Against Decency)** is a Cards Against Humanity-style Discord game with AI-generated cards, tailored to degen casino culture. This document outlines the complete implementation plan, integrating:

1. **Vercel AI SDK** - For AI card generation and game moderation
2. **Resend API** - For game result emails and weekly leaderboards
3. **Event Router** - For trust engine integration
4. **Discord.js** - For game UI and interactions

---

## 🎯 Core Features

### Game Mechanics
- ✅ 2-20 players per game
- ✅ AI-generated black cards (prompts/fill-in-the-blank)
- ✅ AI-generated white cards (answers)
- ✅ Player voting system
- ✅ Points & leaderboard
- ✅ Custom card pack themes
- ✅ Seasonal expansions

### AI Integration Use Cases
1. **Card Generation** - Generate context-aware, funny, degen-themed cards
2. **Content Moderation** - Filter harmful/offensive submissions
3. **Game Balance** - Analyze card popularity and adjust difficulty
4. **Theme Expansion** - Create themed card packs (casino, crypto, degen culture)
5. **Player Personality Analysis** - Match cards to player humor style

### Email Integration Use Cases
1. **Game Summaries** - Email recap of finished games with winner
2. **Weekly Leaderboards** - Top players digest
3. **New Pack Announcements** - Notify when new themed packs available
4. **Achievement Notifications** - Milestone emails (100 wins, etc.)

---

## 🏗️ Architecture

### Package Structure
```
apps/
  dad-bot/                           # New Discord bot
    src/
      index.ts                        # Bot entry point
      config.ts                       # Environment config
      handlers/
        events.ts                     # Discord event handlers
        commands.ts                   # Command router
      commands/
        play.ts                       # /play command
        packs.ts                      # /packs command
        leaderboard.ts                # /leaderboard command
        stats.ts                      # /stats command
      game/
        engine.ts                     # Core game logic
        lobby.ts                      # Lobby management
        voting.ts                     # Vote collection & scoring
        cards.ts                      # Card management
      ai/
        generator.ts                  # AI card generation
        moderator.ts                  # Content filtering
        themes.ts                     # Theme-specific prompts
      email/
        summaries.ts                  # Game summary emails
        leaderboards.ts               # Weekly leaderboard emails
      utils/
        embed-builder.ts              # Discord embed helpers
        validators.ts                 # Input validation
    package.json
    tsconfig.json

packages/
  dad-cards/                          # Card database package
    src/
      index.ts                        # Main exports
      types.ts                        # Card types & schemas
      packs/
        base.ts                       # Base card pack
        casino.ts                     # Casino-themed pack
        crypto.ts                     # Crypto-themed pack
        seasonal.ts                   # Holiday packs
      storage.ts                      # Card persistence
    package.json
    data/
      cards.json                      # Card database
      packs.json                      # Pack metadata

  dad-ai-service/                     # AI generation service
    src/
      index.ts
      card-generator.ts               # Generate cards with AI
      content-filter.ts               # Moderate submissions
      theme-engine.ts                 # Theme-based generation
    package.json
```

### Database Schema (SQLite/Supabase)
```sql
-- Games
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'lobby', 'active', 'voting', 'finished'
  current_round INTEGER DEFAULT 0,
  max_rounds INTEGER DEFAULT 10,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  winner_id TEXT
);

-- Players
CREATE TABLE players (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  cards_played INTEGER DEFAULT 0,
  votes_received INTEGER DEFAULT 0,
  email TEXT, -- Optional for email notifications
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Game Participants
CREATE TABLE game_players (
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  cards_submitted INTEGER DEFAULT 0,
  PRIMARY KEY (game_id, user_id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (user_id) REFERENCES players(user_id)
);

-- Cards
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'black' or 'white'
  content TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Card Packs
CREATE TABLE packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT, -- 'casino', 'crypto', 'seasonal', 'community'
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL
);

-- Game Rounds
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  black_card_id TEXT NOT NULL,
  winner_user_id TEXT,
  winner_card_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Card Submissions
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (round_id) REFERENCES rounds(id)
);
```

---

## 🤖 AI Integration Details

### 1. Card Generation (Vercel AI SDK)

```typescript
// packages/dad-ai-service/src/card-generator.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function generateBlackCards(theme: string, count: number = 10) {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are a card generator for "Degens Against Decency", a Cards Against Humanity-style game for casino/crypto degen communities.

Generate ${count} BLACK CARDS (prompts/fill-in-the-blank) with the theme: "${theme}".

Rules:
- Funny, edgy, but not cruel or discriminatory
- Use degen slang (moon, ape, degen, bag holder, rekt, etc.)
- Include casino/crypto references when relevant
- Format: Use "_____" for blanks
- Keep it PG-13 max (no explicit content)
- Avoid targeting specific people or protected groups

Examples:
- "When I hit a 100x multiplier, I immediately _____"
- "The secret to beating the casino is _____"
- "My wallet after a 48-hour degen session: _____"

Return ONLY a JSON array of strings, no explanations:
["card 1", "card 2", ...]`,
    temperature: 0.9, // High creativity
  });

  return JSON.parse(text) as string[];
}

export async function generateWhiteCards(theme: string, count: number = 50) {
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `You are a card generator for "Degens Against Decency".

Generate ${count} WHITE CARDS (answers/punchlines) with the theme: "${theme}".

Rules:
- Short, punchy answers (1-8 words max)
- Degen culture references
- Funny, absurd, relatable to gamblers
- Mix of safe and slightly edgy
- No hate speech, slurs, or harmful content

Examples:
- "Selling my kidney for gas fees"
- "A 1000x leverage position"
- "Crying in the shower"
- "My wife's boyfriend"
- "Diamond hands made of paper"

Return ONLY a JSON array of strings:
["card 1", "card 2", ...]`,
    temperature: 1.0, // Maximum creativity for variety
  });

  return JSON.parse(text) as string[];
}
```

### 2. Content Moderation

```typescript
// packages/dad-ai-service/src/content-filter.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const ModerationSchema = z.object({
  safe: z.boolean(),
  reason: z.string().optional(),
  severity: z.enum(['safe', 'edgy', 'inappropriate', 'harmful']),
  suggestion: z.string().optional(),
});

export async function moderateCard(content: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: ModerationSchema,
    prompt: `You are a content moderator for "Degens Against Decency", a Cards Against Humanity-style game.

Evaluate this card submission:
"${content}"

Rules:
- Allow: Edgy humor, degen culture, casino/crypto references
- Block: Hate speech, slurs, explicit sexual content, violence against real people
- Context: This is an adult card game for crypto/casino communities

Classify as:
- "safe" - Perfectly fine
- "edgy" - Borderline but acceptable
- "inappropriate" - Too far, should be rejected
- "harmful" - Contains hate speech or dangerous content

If not safe, provide a brief reason and optional suggestion for improvement.`,
  });

  return object;
}
```

### 3. Theme-Based Pack Generation

```typescript
// packages/dad-ai-service/src/theme-engine.ts
import { generateBlackCards, generateWhiteCards } from './card-generator.js';

export interface CardPack {
  id: string;
  name: string;
  description: string;
  theme: string;
  blackCards: string[];
  whiteCards: string[];
  createdAt: Date;
}

export async function generateThemePack(theme: string, packName?: string): Promise<CardPack> {
  const [blackCards, whiteCards] = await Promise.all([
    generateBlackCards(theme, 25),
    generateWhiteCards(theme, 100),
  ]);

  return {
    id: `pack-${Date.now()}`,
    name: packName || `${theme} Pack`,
    description: `AI-generated cards themed around ${theme}`,
    theme,
    blackCards,
    whiteCards,
    createdAt: new Date(),
  };
}

// Preset themes
export const THEMES = {
  casino: 'Casino gambling, slots, table games, RTP, bonus hunting, casino streamers',
  crypto: 'Cryptocurrency, DeFi, NFTs, rug pulls, moonshots, bear markets, yield farming',
  degen: 'Degen culture, bad decisions, FOMO, bag holding, copium, hopium',
  holidays: 'Holidays and celebrations with a degen twist',
  community: 'Inside jokes and memes from the community',
};

// Example usage
export async function createSeasonalPack(holiday: string) {
  return generateThemePack(
    `${holiday} themed cards with degen gambling culture references`,
    `${holiday} Degen Edition`
  );
}
```

---

## 📧 Resend Email Integration

### 1. Game Summary Emails

```typescript
// apps/dad-bot/src/email/summaries.ts
import { Resend } from 'resend';
import { GameSummaryEmail } from '@tiltcheck/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendGameSummary(gameId: string, players: Player[], winner: Player) {
  const playersWithEmail = players.filter(p => p.email);
  
  if (playersWithEmail.length === 0) return;

  // Get game stats
  const game = await getGame(gameId);
  const rounds = await getRounds(gameId);
  
  // Get funniest cards (most votes)
  const topSubmissions = rounds
    .flatMap(r => r.submissions)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  for (const player of playersWithEmail) {
    await resend.emails.send({
      from: 'DA&D Game <games@tiltcheck.gg>',
      to: player.email,
      subject: `🎴 Game Results: ${winner.username} Wins!`,
      react: GameSummaryEmail({
        playerName: player.username,
        winner: winner.username,
        yourScore: game.players.find(p => p.userId === player.userId)?.score || 0,
        totalRounds: rounds.length,
        funniestCards: topSubmissions.map(s => ({
          card: s.card.content,
          votes: s.votes,
          player: s.user.username,
        })),
        yourBestCard: topSubmissions.find(s => s.userId === player.userId),
        gameDate: game.createdAt,
      }),
    });
  }
}
```

### 2. Weekly Leaderboard Digest

```typescript
// apps/dad-bot/src/email/leaderboards.ts
import { Resend } from 'resend';
import { LeaderboardDigestEmail } from '@tiltcheck/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWeeklyLeaderboard() {
  const topPlayers = await getTopPlayers(10, 'week');
  const allPlayers = await getAllPlayersWithEmail();

  for (const player of allPlayers) {
    const playerRank = topPlayers.findIndex(p => p.userId === player.userId) + 1;
    const playerStats = await getPlayerWeeklyStats(player.userId);

    await resend.emails.send({
      from: 'DA&D Leaderboard <games@tiltcheck.gg>',
      to: player.email,
      subject: '🏆 Your Weekly DA&D Leaderboard',
      react: LeaderboardDigestEmail({
        playerName: player.username,
        yourRank: playerRank || 'Unranked',
        yourWins: playerStats.wins,
        yourGames: playerStats.gamesPlayed,
        winRate: ((playerStats.wins / playerStats.gamesPlayed) * 100).toFixed(1),
        topPlayers: topPlayers.slice(0, 5).map((p, i) => ({
          rank: i + 1,
          username: p.username,
          wins: p.wins,
          gamesPlayed: p.gamesPlayed,
        })),
        funniestCardThisWeek: playerStats.mostVotedCard,
        nextWeekGoal: `Play ${5 - (playerStats.gamesPlayed % 5)} more games to unlock a bonus pack!`,
      }),
    });
  }
}

// Schedule weekly digest (run via cron or GitHub Actions)
export function scheduleWeeklyDigest() {
  // Every Sunday at 6 PM
  setInterval(() => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 18) {
      sendWeeklyLeaderboard();
    }
  }, 3600000); // Check every hour
}
```

---

## 🎮 Game Flow Implementation

### 1. Starting a Game (`/play`)

```typescript
// apps/dad-bot/src/commands/play.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createLobby, joinLobby } from '../game/lobby.js';

export const playCommand = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Start or join a DA&D game')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new game')
        .addIntegerOption(option =>
          option
            .setName('rounds')
            .setDescription('Number of rounds (default: 10)')
            .setMinValue(3)
            .setMaxValue(20)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('join').setDescription('Join an existing game')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'start') {
      const rounds = interaction.options.getInteger('rounds') || 10;
      
      const lobby = await createLobby({
        guildId: interaction.guildId!,
        channelId: interaction.channelId,
        hostId: interaction.user.id,
        maxRounds: rounds,
      });

      await interaction.reply({
        embeds: [{
          title: '🎴 DA&D Game Starting!',
          description: `${interaction.user.username} started a game!\n\nUse \`/play join\` to join the lobby.\n\nGame will start in 60 seconds or when host uses \`/play begin\`.`,
          fields: [
            { name: 'Players', value: `1/${lobby.maxPlayers}`, inline: true },
            { name: 'Rounds', value: rounds.toString(), inline: true },
          ],
          color: 0x5469d4,
        }],
      });

      // Set 60 second timer
      setTimeout(() => {
        if (lobby.players.length >= 3) {
          startGame(lobby.id);
        } else {
          interaction.followUp({
            content: '❌ Not enough players. Game cancelled.',
          });
        }
      }, 60000);
    } else if (subcommand === 'join') {
      const activeLobby = await getActiveLobby(interaction.channelId);
      
      if (!activeLobby) {
        return interaction.reply({
          content: '❌ No active lobby in this channel. Use `/play start` to create one!',
          ephemeral: true,
        });
      }

      await joinLobby(activeLobby.id, interaction.user.id);
      
      await interaction.reply({
        content: `✅ ${interaction.user.username} joined the game!`,
      });
    }
  },
};
```

### 2. Game Round Flow

```typescript
// apps/dad-bot/src/game/engine.ts
import { Client, TextChannel } from 'discord.js';
import { getRandomBlackCard, getRandomWhiteCards } from '../game/cards.js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function startRound(gameId: string, roundNumber: number, client: Client) {
  const game = await getGame(gameId);
  const channel = await client.channels.fetch(game.channelId) as TextChannel;

  // Select black card (AI-generated if no cards left)
  let blackCard = await getRandomBlackCard(game.packIds);
  
  if (!blackCard) {
    // Generate new black card on the fly
    const cards = await generateBlackCards('degen casino culture', 1);
    blackCard = await saveCard({
      type: 'black',
      content: cards[0],
      packId: 'ai-generated',
      aiGenerated: true,
    });
  }

  // Create round
  const round = await createRound({
    gameId,
    roundNumber,
    blackCardId: blackCard.id,
  });

  // Send black card to channel
  await channel.send({
    embeds: [{
      title: `🎴 Round ${roundNumber}/${game.maxRounds}`,
      description: blackCard.content,
      color: 0x000000,
      footer: { text: 'Players: Submit your cards in DMs!' },
    }],
  });

  // DM each player with white card options
  for (const player of game.players) {
    const whiteCards = await getRandomWhiteCards(7, game.packIds);
    
    const user = await client.users.fetch(player.userId);
    await user.send({
      embeds: [{
        title: '⚪ Your Cards',
        description: blackCard.content,
        fields: whiteCards.map((card, i) => ({
          name: `Card ${i + 1}`,
          value: card.content,
          inline: false,
        })),
        footer: { text: 'React with the number of the card you want to play!' },
      }],
    });

    // Add reaction collectors for card selection
    // ...collector logic...
  }

  // Set timer for submissions (60 seconds)
  setTimeout(() => {
    startVoting(gameId, round.id, client);
  }, 60000);
}

export async function startVoting(gameId: string, roundId: string, client: Client) {
  const game = await getGame(gameId);
  const round = await getRound(roundId);
  const submissions = await getSubmissions(roundId);
  const channel = await client.channels.fetch(game.channelId) as TextChannel;

  // Shuffle submissions for anonymous voting
  const shuffled = submissions.sort(() => Math.random() - 0.5);

  await channel.send({
    embeds: [{
      title: '🗳️ Vote for the Funniest!',
      description: round.blackCard.content,
      fields: shuffled.map((sub, i) => ({
        name: `Option ${i + 1}`,
        value: sub.card.content,
        inline: false,
      })),
      footer: { text: 'React with the number to vote!' },
    }],
  });

  // Add reactions for voting
  // ...voting logic...

  // Set timer for voting (30 seconds)
  setTimeout(() => {
    tallyVotes(gameId, roundId, client);
  }, 30000);
}

export async function tallyVotes(gameId: string, roundId: string, client: Client) {
  const game = await getGame(gameId);
  const submissions = await getSubmissions(roundId);
  const channel = await client.channels.fetch(game.channelId) as TextChannel;

  // Count votes
  const winner = submissions.reduce((prev, curr) => 
    curr.votes > prev.votes ? curr : prev
  );

  // Update scores
  await incrementPlayerScore(gameId, winner.userId, 1);

  // Announce winner
  await channel.send({
    embeds: [{
      title: '🏆 Round Winner!',
      description: `<@${winner.userId}> wins with:\n\n"${winner.card.content}"`,
      fields: [
        { name: 'Votes', value: winner.votes.toString(), inline: true },
      ],
      color: 0xFFD700,
    }],
  });

  // Check if game is over
  if (game.currentRound >= game.maxRounds) {
    endGame(gameId, client);
  } else {
    // Start next round after 10 seconds
    setTimeout(() => {
      startRound(gameId, game.currentRound + 1, client);
    }, 10000);
  }
}
```

---

## 📊 Cost Analysis

### AI Costs (OpenAI GPT-4o-mini)
| Operation | Tokens/Call | Cost/Call | Monthly Volume | Monthly Cost |
|-----------|-------------|-----------|----------------|--------------|
| Generate black cards (10) | ~500 | $0.00008 | 100 packs | $0.01 |
| Generate white cards (50) | ~1500 | $0.00023 | 100 packs | $0.02 |
| Moderate card | ~200 | $0.00003 | 1000 cards | $0.03 |
| **Total AI** | | | | **$0.06/mo** |

### Email Costs (Resend)
| Email Type | Volume/Month | Cost/Email | Monthly Cost |
|------------|--------------|------------|--------------|
| Game summaries | 500 | $0 (free tier) | $0 |
| Weekly leaderboards | 100 | $0 (free tier) | $0 |
| **Total Email** | 600 | | **$0/mo** |

### Total Monthly Cost
- **AI**: $0.06
- **Email**: $0 (within free tier)
- **Hosting**: $0 (runs with existing Discord bot)
- **Database**: $0 (SQLite or Supabase free tier)

**Total**: ~**$0.06/month** 🎉

---

## 🚀 Implementation Timeline

### Week 1: Core Setup
- ✅ Create `apps/dad-bot` package structure
- ✅ Set up Discord bot with basic commands
- ✅ Create database schema (SQLite)
- ✅ Implement lobby system (`/play start`, `/play join`)
- ✅ Create base card pack (100 cards manually curated)

### Week 2: Game Engine
- ✅ Implement round flow (black card → submissions → voting)
- ✅ Add DM-based card selection
- ✅ Implement voting system with reactions
- ✅ Score tracking and persistence
- ✅ Game end and winner announcement

### Week 3: AI Integration
- ✅ Install Vercel AI SDK and OpenAI provider
- ✅ Implement black card generation
- ✅ Implement white card generation
- ✅ Add content moderation for custom cards
- ✅ Create themed pack generator

### Week 4: Email & Polish
- ✅ Install Resend SDK
- ✅ Create game summary email templates (React Email)
- ✅ Create weekly leaderboard email templates
- ✅ Implement `/email-preferences` command
- ✅ Add email opt-in flow

### Week 5: Advanced Features
- ✅ `/packs` command (browse and activate packs)
- ✅ `/stats` command (personal stats)
- ✅ `/leaderboard` command (server rankings)
- ✅ Custom card submission with AI moderation
- ✅ Achievement system

### Week 6: Testing & Deployment
- ✅ Write unit tests for game engine
- ✅ Write integration tests for AI generation
- ✅ Beta testing with small user group
- ✅ Fix bugs and optimize performance
- ✅ Documentation and rollout

---

## 🔧 Technical Configuration

### Environment Variables
```env
# DA&D Bot
# Never commit real tokens; store only placeholders here.
DAD_DISCORD_TOKEN=<DAD_BOT_DISCORD_TOKEN>
DAD_DISCORD_CLIENT_ID=1376113587025739807
DAD_GUILD_ID=1413961128522023024
DAD_OWNER_ID=1153034319271559328

# AI
OPENAI_API_KEY=sk-proj-...

# Email
RESEND_API_KEY=re_...

# Database
DAD_DATABASE_PATH=./data/dad-games.db
```

### Package.json
```json
{
  "name": "@tiltcheck/dad-bot",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "discord.js": "^14.25.0",
    "ai": "^5.0.98",
    "@ai-sdk/openai": "^2.0.71",
    "resend": "^4.0.1",
    "zod": "^4.1.12",
    "better-sqlite3": "^11.0.0",
    "ulid": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

---

## 📚 Next Steps

1. **Review this plan** - Does the architecture make sense?
2. **Prioritize features** - Which AI use cases are most valuable?
3. **Get Resend API key** - Confirm it's ready in git secrets
4. **Create base card pack** - Manually curate 100 starting cards
5. **Build prototype** - Start with basic game flow, add AI later

**Should I proceed with creating the DA&D bot package structure and implementing the core game engine?**
