type AudioInstance = {
  /**
   * Play
   */
  play(): Promise<void>;
  /**
   * Pause
   */
  pause(): Promise<void>;
  /**
   * Reset
   */
  reset(): Promise<void>;
  /**
   * Stop
   */
  stop(): Promise<void>;
  /**
   * Destroy
   */
  destroy(): Promise<void>;
  /**
   * Fetch audio
   */
  fetch(): Promise<void>;
  /**
   * Is currently playing
   */
  readonly playing: boolean;
  /**
   * Is destroyed
   */
  readonly destroyed: boolean;
  /**
   * Volume in range [0, 1]
   */
  volume: number;
  /**
   * Loop
   */
  loop: boolean;
}

export type { AudioInstance }