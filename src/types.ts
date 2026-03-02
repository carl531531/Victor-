export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST'
}

export interface Point {
  x: number;
  y: number;
}

export interface Rocket {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  destroyed: boolean;
}

export interface Missile {
  id: string;
  start: Point;
  current: Point;
  target: Point;
  speed: number;
  batteryIndex: number;
  reached: boolean;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growthRate: number;
  finished: boolean;
}

export interface City {
  id: number;
  x: number;
  destroyed: boolean;
}

export interface Battery {
  id: number;
  x: number;
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}

export interface GameState {
  score: number;
  status: GameStatus;
  rockets: Rocket[];
  missiles: Missile[];
  explosions: Explosion[];
  cities: City[];
  batteries: Battery[];
  level: number;
}
