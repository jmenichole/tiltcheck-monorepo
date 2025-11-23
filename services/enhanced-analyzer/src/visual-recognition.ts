/**
 * Visual Pattern Recognition for Gameplay Analysis
 * 
 * Uses image analysis to detect gameplay patterns and UI elements
 * without requiring external OCR dependencies.
 */

export interface VisualPattern {
  name: string;
  confidence: number;
  location: { x: number; y: number; width: number; height: number };
  value?: string | number;
  timestamp: number;
}

export interface ColorProfile {
  r: number;
  g: number;
  b: number;
  tolerance: number;
}

export interface UIElement {
  name: string;
  colorProfile: ColorProfile;
  expectedLocation: { x: number; y: number; width: number; height: number };
  textPattern?: RegExp;
}

export class VisualPatternRecognizer {
  private casinoProfiles = {
    'crown-coins': {
      betButton: { r: 255, g: 165, b: 0, tolerance: 30 }, // Orange bet button
      spinButton: { r: 0, g: 200, b: 0, tolerance: 20 },   // Green spin button
      winDisplay: { r: 255, g: 215, b: 0, tolerance: 25 }, // Gold win text
      balanceArea: { r: 255, g: 255, b: 255, tolerance: 10 } // White balance text
    },
    'stake-us': {
      betButton: { r: 70, g: 130, b: 180, tolerance: 25 },  // Steel blue
      spinButton: { r: 34, g: 139, b: 34, tolerance: 20 },   // Forest green
      winDisplay: { r: 255, g: 20, b: 147, tolerance: 30 },  // Deep pink
      balanceArea: { r: 240, g: 240, b: 240, tolerance: 15 } // Light gray
    }
  };

  async analyzeScreenshot(imageData: Uint8Array, casinoId: string): Promise<VisualPattern[]> {
    const patterns: VisualPattern[] = [];
    
    try {
      const imageInfo = this.parseImageHeader(imageData);
      if (!imageInfo) {
        throw new Error('Unable to parse image data');
      }

      const casino = casinoId as keyof typeof this.casinoProfiles;
      const profile = this.casinoProfiles[casino];
      
      if (!profile) {
        console.warn(`[VisualRecognizer] No profile for casino: ${casinoId}`);
        return patterns;
      }

      // Detect UI elements based on color patterns
      const betButtonPattern = this.detectColoredRegion(imageData, imageInfo, profile.betButton, 'bet_button');
      if (betButtonPattern) patterns.push(betButtonPattern);

      const spinButtonPattern = this.detectColoredRegion(imageData, imageInfo, profile.spinButton, 'spin_button');
      if (spinButtonPattern) patterns.push(spinButtonPattern);

      const winDisplayPattern = this.detectColoredRegion(imageData, imageInfo, profile.winDisplay, 'win_display');
      if (winDisplayPattern) patterns.push(winDisplayPattern);

      // Detect rapid clicking patterns (multiple screenshots needed)
      const rapidClickPattern = this.detectRapidClicking(patterns);
      if (rapidClickPattern) patterns.push(rapidClickPattern);

      // Detect game state changes
      const gameStatePattern = this.detectGameState(patterns);
      if (gameStatePattern) patterns.push(gameStatePattern);

      return patterns;
    } catch (error) {
      console.error('[VisualRecognizer] Analysis error:', error);
      return patterns;
    }
  }

  private parseImageHeader(imageData: Uint8Array): ImageInfo | null {
    // Simple PNG header parser
    if (imageData.length < 24) return null;
    
    // Check PNG signature
    if (imageData[0] !== 0x89 || imageData[1] !== 0x50 || imageData[2] !== 0x4E || imageData[3] !== 0x47) {
      console.warn('[VisualRecognizer] Not a PNG image');
      return null;
    }

    // Read IHDR chunk for dimensions
    const width = (imageData[16] << 24) | (imageData[17] << 16) | (imageData[18] << 8) | imageData[19];
    const height = (imageData[20] << 24) | (imageData[21] << 16) | (imageData[22] << 8) | imageData[23];
    const bitDepth = imageData[24];
    const colorType = imageData[25];

    return {
      width,
      height,
      bitDepth,
      colorType,
      channels: this.getChannelCount(colorType),
      bytesPerPixel: this.getBytesPerPixel(colorType, bitDepth)
    };
  }

  private getChannelCount(colorType: number): number {
    switch (colorType) {
      case 0: return 1; // Grayscale
      case 2: return 3; // RGB
      case 3: return 1; // Indexed
      case 4: return 2; // Grayscale + Alpha
      case 6: return 4; // RGBA
      default: return 3;
    }
  }

  private getBytesPerPixel(colorType: number, bitDepth: number): number {
    const channels = this.getChannelCount(colorType);
    return (channels * bitDepth) / 8;
  }

  private detectColoredRegion(
    imageData: Uint8Array, 
    imageInfo: ImageInfo, 
    colorProfile: ColorProfile, 
    elementName: string
  ): VisualPattern | null {
    // Simple color detection algorithm
    // Note: This is a basic implementation. For production, you'd want more sophisticated image processing
    
    const { width, height } = imageInfo;
    const regions: { x: number; y: number; confidence: number }[] = [];
    
    // Sample key areas of the image for the target color
    const sampleSize = 20; // Sample every 20 pixels
    
    for (let y = 0; y < height; y += sampleSize) {
      for (let x = 0; x < width; x += sampleSize) {
        const pixelIndex = (y * width + x) * 4; // Assuming RGBA
        
        if (pixelIndex + 3 < imageData.length) {
          const r = imageData[pixelIndex];
          const g = imageData[pixelIndex + 1];
          const b = imageData[pixelIndex + 2];
          
          const colorMatch = this.matchesColor(
            { r, g, b },
            colorProfile
          );
          
          if (colorMatch > 0.7) {
            regions.push({ x, y, confidence: colorMatch });
          }
        }
      }
    }
    
    if (regions.length === 0) return null;
    
    // Find the most confident cluster
    const bestRegion = regions.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    return {
      name: elementName,
      confidence: bestRegion.confidence,
      location: {
        x: bestRegion.x,
        y: bestRegion.y,
        width: sampleSize * 3, // Estimate button size
        height: sampleSize * 2
      },
      timestamp: Date.now()
    };
  }

  private matchesColor(pixel: { r: number; g: number; b: number }, profile: ColorProfile): number {
    const distance = Math.sqrt(
      Math.pow(pixel.r - profile.r, 2) +
      Math.pow(pixel.g - profile.g, 2) +
      Math.pow(pixel.b - profile.b, 2)
    );
    
    const maxDistance = profile.tolerance * Math.sqrt(3); // Max distance in RGB space
    const similarity = Math.max(0, 1 - (distance / maxDistance));
    
    return similarity;
  }

  private detectRapidClicking(patterns: VisualPattern[]): VisualPattern | null {
    // This would analyze patterns across multiple frames to detect rapid clicking
    // For now, return a placeholder
    const spinButtons = patterns.filter(p => p.name === 'spin_button');
    
    if (spinButtons.length > 0) {
      return {
        name: 'potential_rapid_clicking',
        confidence: 0.6,
        location: spinButtons[0].location,
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  private detectGameState(patterns: VisualPattern[]): VisualPattern | null {
    // Analyze patterns to determine game state
    const hasSpinButton = patterns.some(p => p.name === 'spin_button');
    const hasWinDisplay = patterns.some(p => p.name === 'win_display');
    
    let gameState = 'unknown';
    let confidence = 0.3;
    
    if (hasSpinButton && !hasWinDisplay) {
      gameState = 'ready_to_spin';
      confidence = 0.8;
    } else if (hasWinDisplay) {
      gameState = 'showing_results';
      confidence = 0.9;
    } else if (hasSpinButton) {
      gameState = 'spinning';
      confidence = 0.7;
    }
    
    return {
      name: 'game_state',
      confidence,
      location: { x: 0, y: 0, width: 0, height: 0 },
      value: gameState,
      timestamp: Date.now()
    };
  }

  // Detect betting patterns from visual elements
  detectBettingPatterns(historicalPatterns: VisualPattern[][]): TiltPattern[] {
    const tiltPatterns: TiltPattern[] = [];
    
    if (historicalPatterns.length < 3) return tiltPatterns;
    
    // Analyze last 10 screenshots for rapid betting
    const recentPatterns = historicalPatterns.slice(-10);
    let rapidClicks = 0;
    
    for (const framePatterns of recentPatterns) {
      const hasRapidClick = framePatterns.some(p => p.name === 'potential_rapid_clicking');
      if (hasRapidClick) rapidClicks++;
    }
    
    if (rapidClicks > 5) {
      tiltPatterns.push({
        type: 'rapid_betting',
        severity: 'high',
        confidence: 0.8,
        description: 'Rapid spin button clicking detected',
        timestamp: Date.now()
      });
    }
    
    // Detect extended session (same UI visible for long time)
    const sessionStart = historicalPatterns[0]?.[0]?.timestamp || Date.now();
    const sessionDuration = Date.now() - sessionStart;
    
    if (sessionDuration > 2 * 60 * 60 * 1000) { // 2 hours
      tiltPatterns.push({
        type: 'extended_session',
        severity: 'medium',
        confidence: 0.9,
        description: `Extended gaming session: ${Math.floor(sessionDuration / (60 * 1000))} minutes`,
        timestamp: Date.now()
      });
    }
    
    return tiltPatterns;
  }

  // Extract numerical values from UI elements (basic implementation)
  extractNumbers(patterns: VisualPattern[]): { betAmount?: number; winAmount?: number; balance?: number } {
    const result: { betAmount?: number; winAmount?: number; balance?: number } = {};
    
    // This is a placeholder - in a real implementation, you'd use more sophisticated
    // image processing to extract text from the detected UI elements
    
    const betButton = patterns.find(p => p.name === 'bet_button');
    if (betButton && betButton.confidence > 0.8) {
      // Simulate extracted bet amount
      result.betAmount = 1.0; // Placeholder
    }
    
    const winDisplay = patterns.find(p => p.name === 'win_display');
    if (winDisplay && winDisplay.confidence > 0.8) {
      // Simulate extracted win amount
      result.winAmount = 0.0; // Placeholder
    }
    
    return result;
  }

  // Create casino profile from sample screenshots
  async createCasinoProfile(sampleImages: Uint8Array[], casinoId: string): Promise<CasinoProfile> {
    const profile: CasinoProfile = {
      casinoId,
      uiElements: [],
      colorProfiles: {},
      created: Date.now()
    };
    
    // Analyze sample images to build color profiles
    for (const imageData of sampleImages) {
      const imageInfo = this.parseImageHeader(imageData);
      if (!imageInfo) continue;
      
      // Sample colors from different regions
      const colors = this.sampleColors(imageData, imageInfo);
      
      // Cluster similar colors and identify UI elements
      // This is a simplified implementation
      profile.colorProfiles.primary = colors[0] || { r: 128, g: 128, b: 128, tolerance: 30 };
    }
    
    console.log(`[VisualRecognizer] Created profile for ${casinoId}`);
    return profile;
  }
  
  private sampleColors(imageData: Uint8Array, imageInfo: ImageInfo): ColorProfile[] {
    const colors: ColorProfile[] = [];
    const { width, height } = imageInfo;
    
    // Sample colors from key areas
    const samplePoints = [
      { x: width * 0.1, y: height * 0.9 }, // Bottom left (bet area)
      { x: width * 0.9, y: height * 0.9 }, // Bottom right (win area)
      { x: width * 0.5, y: height * 0.5 }, // Center (spin button)
      { x: width * 0.9, y: height * 0.1 }  // Top right (balance)
    ];
    
    for (const point of samplePoints) {
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);
      const pixelIndex = (y * width + x) * 4;
      
      if (pixelIndex + 3 < imageData.length) {
        colors.push({
          r: imageData[pixelIndex],
          g: imageData[pixelIndex + 1],
          b: imageData[pixelIndex + 2],
          tolerance: 25
        });
      }
    }
    
    return colors;
  }
}

// Supporting interfaces
interface ImageInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  channels: number;
  bytesPerPixel: number;
}

interface TiltPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
  timestamp: number;
}

interface CasinoProfile {
  casinoId: string;
  uiElements: UIElement[];
  colorProfiles: { [key: string]: ColorProfile };
  created: number;
}

export const visualRecognizer = new VisualPatternRecognizer();