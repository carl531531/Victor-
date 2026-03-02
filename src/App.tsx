/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, RotateCcw, Info } from 'lucide-react';
import { GameStatus, Point, Rocket, Missile, Explosion, City, Battery } from './types.ts';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WIN_SCORE = 1000;

const INITIAL_BATTERIES: Battery[] = [
  { id: 0, x: 50, ammo: 20, maxAmmo: 20, destroyed: false },
  { id: 1, x: 400, ammo: 40, maxAmmo: 40, destroyed: false },
  { id: 2, x: 750, ammo: 20, maxAmmo: 20, destroyed: false },
];

const INITIAL_CITIES: City[] = [
  { id: 0, x: 150, destroyed: false },
  { id: 1, x: 250, destroyed: false },
  { id: 2, x: 350, destroyed: false },
  { id: 3, x: 450, destroyed: false },
  { id: 4, x: 550, destroyed: false },
  { id: 5, x: 650, destroyed: false },
];

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    rockets: [] as Rocket[],
    missiles: [] as Missile[],
    explosions: [] as Explosion[],
    cities: [...INITIAL_CITIES],
    batteries: [...INITIAL_BATTERIES],
    lastSpawnTime: 0,
    spawnInterval: 2000,
  });

  const t = {
    zh: {
      title: 'Victor新星防御',
      start: '开始游戏',
      restart: '再玩一次',
      win: '胜利！你成功保卫了地球',
      loss: '失败！所有防御塔已被摧毁',
      score: '得分',
      level: '等级',
      ammo: '弹药',
      howToPlay: '点击屏幕发射拦截导弹，预判敌方火箭轨迹，在爆炸范围内摧毁它们。',
      targetScore: '目标得分',
    },
    en: {
      title: 'Victor Nova Defense',
      start: 'Start Game',
      restart: 'Play Again',
      win: 'Victory! Earth is safe',
      loss: 'Defeat! All batteries destroyed',
      score: 'Score',
      level: 'Level',
      ammo: 'Ammo',
      howToPlay: 'Click to fire interceptors. Predict rocket paths and destroy them in explosions.',
      targetScore: 'Target Score',
    }
  }[language];

  const resetGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    gameStateRef.current = {
      rockets: [],
      missiles: [],
      explosions: [],
      cities: INITIAL_CITIES.map(c => ({ ...c, destroyed: false })),
      batteries: INITIAL_BATTERIES.map(b => ({ ...b, ammo: b.maxAmmo, destroyed: false })),
      lastSpawnTime: 0,
      spawnInterval: 2000,
    };
    setStatus(GameStatus.PLAYING);
  }, []);

  const spawnRocket = useCallback((time: number) => {
    const { rockets, spawnInterval, lastSpawnTime } = gameStateRef.current;
    if (time - lastSpawnTime > spawnInterval) {
      const startX = Math.random() * CANVAS_WIDTH;
      const targets = [
        ...gameStateRef.current.cities.filter(c => !c.destroyed).map(c => ({ x: c.x, type: 'city' })),
        ...gameStateRef.current.batteries.filter(b => !b.destroyed).map(b => ({ x: b.x, type: 'battery' }))
      ];
      
      if (targets.length === 0) return;
      
      const target = targets[Math.floor(Math.random() * targets.length)];
      
      const newRocket: Rocket = {
        id: Math.random().toString(36).substr(2, 9),
        start: { x: startX, y: 0 },
        current: { x: startX, y: 0 },
        target: { x: target.x, y: CANVAS_HEIGHT - 20 },
        speed: 1.0 + Math.random() * 1.0 + (level * 0.2),
        destroyed: false,
      };
      
      gameStateRef.current.rockets.push(newRocket);
      gameStateRef.current.lastSpawnTime = time;
      // Gradually increase difficulty
      gameStateRef.current.spawnInterval = Math.max(500, 2000 - (level * 100));
    }
  }, [level]);

  const fireMissile = (targetX: number, targetY: number) => {
    if (status !== GameStatus.PLAYING) return;

    const { batteries, missiles } = gameStateRef.current;
    
    // Find closest functional battery with ammo
    let bestBatteryIndex = -1;
    let minDistance = Infinity;

    batteries.forEach((b, index) => {
      if (!b.destroyed && b.ammo > 0) {
        const dist = Math.abs(b.x - targetX);
        if (dist < minDistance) {
          minDistance = dist;
          bestBatteryIndex = index;
        }
      }
    });

    if (bestBatteryIndex !== -1) {
      const battery = batteries[bestBatteryIndex];
      battery.ammo--;
      
      const newMissile: Missile = {
        id: Math.random().toString(36).substr(2, 9),
        start: { x: battery.x, y: CANVAS_HEIGHT - 30 },
        current: { x: battery.x, y: CANVAS_HEIGHT - 30 },
        target: { x: targetX, y: targetY },
        speed: 4,
        batteryIndex: bestBatteryIndex,
        reached: false,
      };
      
      missiles.push(newMissile);
    }
  };

  const updateGame = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;

    spawnRocket(time);

    const state = gameStateRef.current;

    // Update Rockets
    state.rockets.forEach(rocket => {
      const dx = rocket.target.x - rocket.start.x;
      const dy = rocket.target.y - rocket.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * rocket.speed;
      const vy = (dy / dist) * rocket.speed;

      rocket.current.x += vx;
      rocket.current.y += vy;

      // Check if rocket hit ground
      if (rocket.current.y >= rocket.target.y) {
        rocket.destroyed = true;
        // Check for hits on cities/batteries
        state.cities.forEach(city => {
          if (!city.destroyed && Math.abs(city.x - rocket.current.x) < 20) {
            city.destroyed = true;
          }
        });
        state.batteries.forEach(battery => {
          if (!battery.destroyed && Math.abs(battery.x - rocket.current.x) < 20) {
            battery.destroyed = true;
          }
        });
        // Create impact explosion
        state.explosions.push({
          id: Math.random().toString(36),
          x: rocket.current.x,
          y: rocket.current.y,
          radius: 0,
          maxRadius: 30,
          growthRate: 1,
          finished: false
        });
      }
    });

    // Update Missiles
    state.missiles.forEach(missile => {
      const dx = missile.target.x - missile.start.x;
      const dy = missile.target.y - missile.start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vx = (dx / dist) * missile.speed;
      const vy = (dy / dist) * missile.speed;

      missile.current.x += vx;
      missile.current.y += vy;

      const distToTarget = Math.sqrt(
        Math.pow(missile.target.x - missile.current.x, 2) + 
        Math.pow(missile.target.y - missile.current.y, 2)
      );

      if (distToTarget < missile.speed) {
        missile.reached = true;
        state.explosions.push({
          id: Math.random().toString(36),
          x: missile.target.x,
          y: missile.target.y,
          radius: 0,
          maxRadius: 40,
          growthRate: 1.5,
          finished: false
        });
      }
    });

    // Update Explosions
    state.explosions.forEach(exp => {
      if (!exp.finished) {
        exp.radius += exp.growthRate;
        if (exp.radius >= exp.maxRadius) {
          exp.growthRate = -1; // Shrink
        }
        if (exp.radius <= 0 && exp.growthRate < 0) {
          exp.finished = true;
        }

        // Collision detection: Explosion vs Rockets
        state.rockets.forEach(rocket => {
          if (!rocket.destroyed) {
            const dist = Math.sqrt(
              Math.pow(exp.x - rocket.current.x, 2) + 
              Math.pow(exp.y - rocket.current.y, 2)
            );
            if (dist < exp.radius) {
              rocket.destroyed = true;
              setScore(prev => prev + 20);
            }
          }
        });
      }
    });

    // Cleanup
    state.rockets = state.rockets.filter(r => !r.destroyed);
    state.missiles = state.missiles.filter(m => !m.reached);
    state.explosions = state.explosions.filter(e => !e.finished);

    // Win/Loss conditions
    if (score >= WIN_SCORE) {
      setStatus(GameStatus.WON);
    } else if (state.batteries.every(b => b.destroyed)) {
      setStatus(GameStatus.LOST);
    }

    // Check level up
    const newLevel = Math.floor(score / 300) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
      // Refill ammo on level up
      state.batteries.forEach(b => {
        if (!b.destroyed) b.ammo = b.maxAmmo;
      });
    }

  }, [status, score, level, spawnRocket]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const state = gameStateRef.current;

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);

    // Draw Cities
    state.cities.forEach(city => {
      if (!city.destroyed) {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(city.x - 15, CANVAS_HEIGHT - 35, 30, 15);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(city.x - 10, CANVAS_HEIGHT - 45, 8, 10);
        ctx.fillRect(city.x + 2, CANVAS_HEIGHT - 42, 8, 7);
      }
    });

    // Draw Batteries
    state.batteries.forEach(battery => {
      if (!battery.destroyed) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(battery.x - 20, CANVAS_HEIGHT - 20);
        ctx.lineTo(battery.x + 20, CANVAS_HEIGHT - 20);
        ctx.lineTo(battery.x + 10, CANVAS_HEIGHT - 40);
        ctx.lineTo(battery.x - 10, CANVAS_HEIGHT - 40);
        ctx.closePath();
        ctx.fill();
        
        // Draw ammo bar
        const ammoWidth = (battery.ammo / battery.maxAmmo) * 30;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(battery.x - 15, CANVAS_HEIGHT - 15, 30, 4);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(battery.x - 15, CANVAS_HEIGHT - 15, ammoWidth, 4);
      } else {
        ctx.fillStyle = '#454545';
        ctx.fillRect(battery.x - 15, CANVAS_HEIGHT - 25, 30, 5);
      }
    });

    // Draw Rockets
    state.rockets.forEach(rocket => {
      // Draw trail
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(rocket.start.x, rocket.start.y);
      ctx.lineTo(rocket.current.x, rocket.current.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fireball glow
      const glow = ctx.createRadialGradient(
        rocket.current.x, rocket.current.y, 0,
        rocket.current.x, rocket.current.y, 12
      );
      glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      glow.addColorStop(0.2, 'rgba(251, 191, 36, 0.8)'); // yellow
      glow.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)'); // orange
      glow.addColorStop(1, 'rgba(239, 68, 68, 0)'); // red transparent

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rocket.current.x, rocket.current.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Fireball core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(rocket.current.x, rocket.current.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Flame particles (simple tail)
      for (let i = 0; i < 3; i++) {
        const offset = (i + 1) * 4;
        const dx = rocket.target.x - rocket.start.x;
        const dy = rocket.target.y - rocket.start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = offset / dist;
        
        const px = rocket.current.x - (dx * ratio);
        const py = rocket.current.y - (dy * ratio);
        
        ctx.fillStyle = `rgba(249, 115, 22, ${0.6 - i * 0.2})`;
        ctx.beginPath();
        ctx.arc(px, py, 6 - i * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Missiles
    state.missiles.forEach(missile => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.current.x, missile.current.y);
      ctx.stroke();
      
      // Target marker
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(missile.target.x - 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x + 5, missile.target.y + 5);
      ctx.moveTo(missile.target.x + 5, missile.target.y - 5);
      ctx.lineTo(missile.target.x - 5, missile.target.y + 5);
      ctx.stroke();
    });

    // Draw Explosions
    state.explosions.forEach(exp => {
      ctx.save();
      // Add glow effect
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';

      const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(100, 220, 255, 0.9)'); // Cyan-blue
      gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.6)');   // Sky blue
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');         // Transparent Blue
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();

      // Energy ring
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 * (1 - exp.radius / exp.maxRadius)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    });

  }, []);

  useEffect(() => {
    let animationId: number;
    const loop = (time: number) => {
      updateGame(time);
      draw();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [updateGame, draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (status !== GameStatus.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    fireMissile(x, y);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLanguage(l => l === 'zh' ? 'en' : 'zh')}
            className="text-xs font-medium uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            {language === 'zh' ? 'English' : '中文'}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{t.score}</span>
            <span className="text-xl font-mono font-medium text-blue-400">{score.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative w-full max-w-[800px] aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleCanvasClick}
          onTouchStart={(e) => {
            e.preventDefault();
            handleCanvasClick(e);
          }}
          className="w-full h-full cursor-crosshair"
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 flex gap-4 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-mono">{t.level} {level}</span>
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
            <Target className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-mono">{score}/{WIN_SCORE}</span>
          </div>
        </div>

        {/* Screens */}
        <AnimatePresence>
          {status === GameStatus.START && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-4xl font-bold mb-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                  {t.title}
                </h2>
                <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
                  {t.howToPlay}
                </p>
                <button
                  onClick={resetGame}
                  className="group relative px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20"
                >
                  {t.start}
                </button>
              </motion.div>
            </motion.div>
          )}

          {(status === GameStatus.WON || status === GameStatus.LOST) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className={`p-4 rounded-full mb-6 ${status === GameStatus.WON ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {status === GameStatus.WON ? <Trophy className="w-12 h-12" /> : <RotateCcw className="w-12 h-12" />}
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {status === GameStatus.WON ? t.win : t.loss}
                </h2>
                <div className="flex gap-8 my-8">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.score}</p>
                    <p className="text-3xl font-mono text-blue-400">{score}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{t.level}</p>
                    <p className="text-3xl font-mono text-blue-400">{level}</p>
                  </div>
                </div>
                <button
                  onClick={resetGame}
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
                >
                  {t.restart}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[800px]">
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <Info className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">{language === 'zh' ? '操作指南' : 'Controls'}</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {language === 'zh' 
              ? '点击屏幕任意位置发射导弹。拦截导弹会在点击处爆炸，爆炸范围内的敌方火箭将被摧毁。' 
              : 'Click anywhere to fire. Interceptors explode at the target location, destroying rockets in range.'}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-green-400">
            <Target className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">{language === 'zh' ? '防御目标' : 'Objectives'}</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {language === 'zh' 
              ? '保护底部的城市和炮台。城市被毁无法恢复，所有炮台被毁则游戏结束。' 
              : 'Protect cities and batteries. Destroyed cities are lost forever. Game ends if all batteries are gone.'}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-yellow-400">
            <Trophy className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">{language === 'zh' ? '资源管理' : 'Resources'}</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {language === 'zh' 
              ? '每座炮台弹药有限。中间炮台弹药最多。每轮结束后或升级时弹药会自动补充。' 
              : 'Limited ammo per battery. Middle has the most. Ammo refills after rounds or on level up.'}
          </p>
        </div>
      </div>
    </div>
  );
}
