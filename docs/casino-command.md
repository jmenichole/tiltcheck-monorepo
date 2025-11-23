# Casino Command Documentation

## Overview
The `/casino` command provides direct links to casino websites with optional gameplay analysis setup for screen sharing and monitoring.

## Command Syntax
```
/casino name:<casino-name> [analyze:true/false]
```

## Parameters
- **`name`** (required): Casino name or ID
  - Supports flexible matching: "crown coins", "crowncoins", "crown-coins", "stake", etc.
- **`analyze`** (optional): Enable analysis mode for gameplay monitoring (default: false)

## Usage Examples

### Basic Casino Link
```
/casino name:crown coins
```
**Result**: Provides direct link to Crown Coins website

### Analysis Mode
```
/casino name:crown coins analyze:true
```
**Result**: Provides casino link + gameplay analysis setup instructions

## Available Casinos

| Casino Name | ID Options | URL | Status |
|-------------|------------|-----|---------|
| Crown Coins | `crown-coins`, `crowncoins`, `crown coins` | https://crowncoins.com | ✅ Enabled |
| Stake.us | `stake-us`, `stake` | https://stake.us | ✅ Enabled |
| Rollbit | `rollbit` | https://rollbit.com | ❌ Disabled |

## Analysis Mode Workflow

When `analyze:true` is specified, the command provides:

### 1. Casino Link
- Opens casino in new tab (avoids Discord embedding limitations)
- Maintains separate window for screen sharing

### 2. Setup Instructions
1. Open casino in new tab/window
2. Start screen sharing in Discord channel
3. Use `/play-analyze` to start session tracking
4. Begin gameplay while sharing screen

### 3. Monitoring Options
- **Screen Share**: Visual gameplay analysis via Discord screen sharing
- **Manual Export**: Download CSV from casino for batch analysis
- **Real-time Tracking**: Use TiltCheck analyzer dashboard

## Integration with Other Commands

### Related Commands
- `/play-analyze casino:<id>` - Start gameplay analysis session
- `/analyze-stop session:<id>` - Stop analysis and get report
- `/scan url:<link>` - Scan casino links for security

### Workflow Integration
```mermaid
graph TD
    A[/casino analyze:true] --> B[Open Casino]
    B --> C[Start Screen Share]
    C --> D[/play-analyze]
    D --> E[Begin Gameplay]
    E --> F[Monitor via Screen + Data]
    F --> G[/analyze-stop]
```

## Error Handling

### Casino Not Found
```
❌ Casino Not Found
Casino "invalid-name" not found in database.

Available casinos:
• Crown Coins (`crown-coins`)
• Stake.us (`stake-us`)
```

### Casino Disabled
```
⚠️ Casino Disabled
Rollbit is currently disabled in our system.
```

### System Error
```
❌ System Error
Failed to load casino database. Please try again later.
```

## Technical Implementation

### Casino Data Structure
```json
{
  "casinos": [
    {
      "id": "crown-coins",
      "name": "Crown Coins", 
      "baseURL": "https://crowncoins.com",
      "regulator": "Curacao",
      "enabled": true
    }
  ]
}
```

### Matching Logic
The command uses flexible matching to find casinos:
1. Exact ID match: `crown-coins`
2. ID with spaces converted to hyphens: `crown coins` → `crown-coins`
3. ID with spaces removed: `crown coins` → `crowncoins`
4. Exact name match: `Crown Coins`
5. Name contains input: `crown` matches `Crown Coins`
6. Input contains first word of name: `crown` matches `Crown Coins`

### Discord Limitations
- **No browser embedding**: Discord doesn't support embedded browsers
- **New tab approach**: Links open in separate tabs for screen sharing
- **Screen sharing required**: Visual analysis depends on user sharing their screen

## Security Considerations

### Safe Gambling Features
- Responsible gambling reminder in footer
- Integration with `/cooldown` command
- Trust score integration via other commands

### Link Security
- All casino URLs are vetted in the database
- Integration with SusLink scanner for additional URL verification
- Only enabled casinos are accessible

## Testing Results

### Data Loading ✅
```
✅ Casino data loaded successfully
Available casinos:
  • Stake.us (ID: stake-us, URL: https://stake.us, Enabled: true)
  • Crown Coins (ID: crown-coins, URL: https://crowncoins.com, Enabled: true)
  • Crown Coins (ID: crowncoins, URL: https://crowncoins.com, Enabled: true)
```

### Name Matching ✅
```
"crown coins" → crown-coins
"crowncoins" → crown-coins  
"crown-coins" → crown-coins
"Crown Coins" → crown-coins
"crown" → crown-coins
"stake" → stake-us
"invalid" → NOT FOUND
```

### Bot Integration ✅
```
Bot startup test completed - Casino command loaded successfully
```

## Future Enhancements

### Planned Features
- OCR integration for automatic gameplay capture
- Enhanced screen sharing analysis
- Casino-specific game detection
- Automated spin tracking via visual recognition

### API Integration
- Real-time game state detection
- Automated CSV import from casinos
- Cross-casino session management
- Enhanced trust scoring based on gameplay

## Support

For issues with the casino command:
1. Verify casino name using `/casino name:invalid` to see available options
2. Check that the casino is enabled in the system
3. Use `/help` for related commands
4. Contact administrators for casino additions or modifications