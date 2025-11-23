# Casino Command Quick Reference

## Basic Usage
```bash
# Get casino link
/casino name:crown coins

# Get casino link with analysis setup  
/casino name:crown coins analyze:true
```

## Supported Casinos
- **Crown Coins**: `crown coins`, `crowncoins`, `crown-coins`
- **Stake.us**: `stake`, `stake-us`
- **Rollbit**: `rollbit` (disabled)

## Analysis Mode Features
✅ Opens casino in new tab for screen sharing  
✅ Provides setup instructions for monitoring  
✅ Integrates with `/play-analyze` command  
✅ Supports multiple monitoring methods  

## Example Workflow
1. `/casino name:crown coins analyze:true`
2. Click casino link (opens new tab)
3. Start Discord screen sharing
4. `/play-analyze casino:crown-coins`  
5. Begin gameplay while monitoring

## Error Messages
- **Not Found**: Shows available casino list
- **Disabled**: Casino temporarily unavailable  
- **System Error**: Database loading issue

## Integration Commands
- `/play-analyze` - Start session tracking
- `/analyze-stop` - End analysis session
- `/scan` - Check link security  
- `/cooldown` - Take responsible break