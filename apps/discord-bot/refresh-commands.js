#!/usr/bin/env node

import { config } from 'dotenv';
import { REST, Routes } from 'discord.js';

// Load environment variables
config({ path: '../../.env' });

const commands = [
  {
    name: 'play',
    description: 'Get casino link with optional gameplay analysis setup',
    options: [
      {
        type: 3, // STRING
        name: 'name',
        description: 'Casino name (e.g., "crown coins", "stake", "rollbit")',
        required: true
      },
      {
        type: 5, // BOOLEAN
        name: 'analyze',
        description: 'Set up gameplay analysis session (default: false)',
        required: false
      }
    ]
  }
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Started refreshing play command...');

  // Register command globally for immediate availability
  await rest.put(
    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
    { body: commands }
  );

  console.log('✅ Successfully refreshed play command globally!');
  console.log('Command should be available immediately.');
} catch (error) {
  console.error('❌ Error refreshing commands:', error);
}