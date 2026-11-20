// src/engine.js — Core Game Logic (Headless & Visual Shared)
// Karpathy Guidelines: Zero bloat, pure math, deterministic simulation

export function createPrng(seed = 1) {
  let s = Math.trunc(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dist2D(p1, p2) {
  const dx = p1[0] - p2[0];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function round3(val) {
  return Math.round(val * 1000) / 1000;
}

export class GameEngine {
  constructor(options = {}) {
    this.seed = options.seed ?? 1;
    this.random = createPrng(this.seed);
    this.tuning = options.tuning || {
      player_speed: 6.0,
      carry_capacity: 5,
      lantern_cost: 3,
      lantern_count_night1: 5,
      pickup_radius: 1.5,
      interact_radius: 2.5,
      pulse_cost: 1,
      pulse_radius: 6.0,
      night1_duration_s: 180,
      flames: 3,
      invuln_s: 2.0,
      hit_drop_ratio: 0.5,
      pulse_stun_s: 3.0,
      pulse_push_m: 3.0,
      pulse_cooldown_s: 1.0,
      safe_radius: 5.0,
      shade_speed: 3.5,
      shade_hit_radius: 1.0,
      fall_enabled: false,
      score: {
        per_mote: 10,
        per_lantern: 100,
        per_stun: 20,
        per_second_left: 1,
        per_flame_left: 50
      }
    };

    this.sim_tick = 0;
    this.tick = 0;
    this.state = 'playing'; // 'playing' | 'won' | 'lost'
    this.score = 0;
    this.initial_time_left_s = this.tuning.night1_duration_s;
    this.time_left_s = this.initial_time_left_s;

    this.player = {
      pos: [0, 0, 0],
      carried: 0,
      flames: this.tuning.flames,
      invuln_timer: 0,
      pulse_cooldown: 0
    };

    // Default 5 Lanterns L1..L5 arranged in circle R = 25m
    this.lanterns = [];
    const count = this.tuning.lantern_count_night1 || 5;
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const x = round3(25 * Math.sin(angle));
      const z = round3(25 * Math.cos(angle));
      this.lanterns.push({
        id: `L${i + 1}`,
        pos: [x, 0, z],
        lit: false,
        deposited: 0
      });
    }

    this.shades = [];
    this.motes = [];
    this.events = [];

    // Track active input state
    this.current_input = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false
    };
    this.prev_input = {
      jump: false,
      interact: false,
      pulse: false
    };

    if (options.scenario) {
      this.loadScenario(options.scenario);
    } else {
      this.initDefaultEntities();
    }
  }

  initDefaultEntities() {
    // Generate default 20 motes scattered on island (R < 35m)
    for (let i = 0; i < 20; i++) {
      const r = 5 + this.random() * 30;
      const theta = this.random() * 2 * Math.PI;
      this.motes.push({
        id: `M${i + 1}`,
        pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
        active: true
      });
    }

    // Generate default 3 shades
    for (let i = 0; i < 3; i++) {
      const r = 20 + this.random() * 15;
      const theta = (i * 2 * Math.PI) / 3;
      this.shades.push({
        id: `S${i + 1}`,
        pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
        state: 'chase',
        stun_timer: 0
      });
    }
  }

  loadScenario(scenario) {
    if (scenario.time_left_s !== undefined) {
      this.initial_time_left_s = scenario.time_left_s;
      this.time_left_s = scenario.time_left_s;
    }

    if (scenario.player) {
      if (scenario.player.pos) {
        this.player.pos = [...scenario.player.pos];
      }
      if (scenario.player.carried !== undefined) {
        this.player.carried = scenario.player.carried;
      }
      if (scenario.player.flames !== undefined) {
        this.player.flames = scenario.player.flames;
      }
    }

    if (Array.isArray(scenario.lanterns)) {
      for (const sl of scenario.lanterns) {
        let l = this.lanterns.find((item) => item.id === sl.id);
        if (!l) {
          l = { id: sl.id, pos: [0, 0, 0], lit: false, deposited: 0 };
          this.lanterns.push(l);
        }
        if (sl.pos) l.pos = [...sl.pos];
        if (sl.deposited !== undefined) l.deposited = sl.deposited;
        if (sl.lit !== undefined) l.lit = sl.lit;
      }
    }

    if (Array.isArray(scenario.motes)) {
      this.motes = scenario.motes.map((m, idx) => {
        const pos = Array.isArray(m) ? m : m.pos;
        return {
          id: m.id || `M${idx + 1}`,
          pos: [pos[0], pos[1] ?? 0, pos[2]],
          active: true
        };
      });
    } else if (scenario.random_motes !== false) {
      this.initDefaultMotes();
    }

    if (Array.isArray(scenario.shades)) {
      this.shades = scenario.shades.map((s, idx) => ({
        id: s.id || `S${idx + 1}`,
        pos: [s.pos[0], s.pos[1] ?? 0, s.pos[2]],
        state: s.state || 'chase',
        stun_timer: s.stun_timer || 0
      }));
    } else if (scenario.random_shades !== false) {
      this.initDefaultShades();
    }
  }

  initDefaultMotes() {
    this.motes = [];
    for (let i = 0; i < 20; i++) {
      const r = 5 + this.random() * 30;
      const theta = this.random() * 2 * Math.PI;
      this.motes.push({
        id: `M${i + 1}`,
        pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
        active: true
      });
    }
  }

  initDefaultShades() {
    this.shades = [];
    for (let i = 0; i < 3; i++) {
      const r = 20 + this.random() * 15;
      const theta = (i * 2 * Math.PI) / 3;
      this.shades.push({
        id: `S${i + 1}`,
        pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
        state: 'chase',
        stun_timer: 0
      });
    }
  }

  applyInputFrame(frame) {
    if (!frame) return;
    if (frame.move !== undefined) this.current_input.move = [...frame.move];
    if (frame.cam_yaw_deg !== undefined)
      this.current_input.cam_yaw_deg = frame.cam_yaw_deg;
    if (frame.jump !== undefined) this.current_input.jump = frame.jump;
    if (frame.interact !== undefined)
      this.current_input.interact = frame.interact;
    if (frame.pulse !== undefined) this.current_input.pulse = frame.pulse;
  }

  step() {
    if (this.state !== 'playing') {
      return [];
    }

    const dt = 1 / 60;
    this.sim_tick++;
    this.tick++;
    this.events = [];

    // 1. Time countdown
    this.time_left_s = Math.max(0, this.initial_time_left_s - this.sim_tick * dt);
    if (this.time_left_s <= 0) {
      this.state = 'lost';
      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'game_over',
        data: { result: 'lost', reason: 'dawn' }
      });
      return this.events;
    }

    // 2. Timers
    this.player.invuln_timer = Math.max(0, this.player.invuln_timer - dt);
    this.player.pulse_cooldown = Math.max(0, this.player.pulse_cooldown - dt);

    // 3. Player Movement
    const [mx, mz] = this.current_input.move;
    const theta = (this.current_input.cam_yaw_deg * Math.PI) / 180;
    // x' = x*cos(theta) + z*sin(theta); z' = -x*sin(theta) + z*cos(theta)
    let moveX = mx * Math.cos(theta) + mz * Math.sin(theta);
    let moveZ = -mx * Math.sin(theta) + mz * Math.cos(theta);
    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 1) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }
    this.player.pos[0] += moveX * this.tuning.player_speed * dt;
    this.player.pos[2] += moveZ * this.tuning.player_speed * dt;

    // 4. Mote Pickup
    for (const mote of this.motes) {
      if (!mote.active) continue;
      const d = dist2D(this.player.pos, mote.pos);
      if (d <= this.tuning.pickup_radius) {
        if (this.player.carried < this.tuning.carry_capacity) {
          mote.active = false;
          this.player.carried++;
          this.score += this.tuning.score.per_mote;
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'mote_picked',
            data: { carried: this.player.carried }
          });
        }
      }
    }

    // 5. Interact (Rising Edge)
    const isInteractTrigger =
      this.current_input.interact && !this.prev_input.interact;
    if (isInteractTrigger && this.player.carried > 0) {
      for (const lantern of this.lanterns) {
        if (lantern.lit) continue;
        const d = dist2D(this.player.pos, lantern.pos);
        if (d <= this.tuning.interact_radius) {
          const needed = this.tuning.lantern_cost - lantern.deposited;
          const depositAmount = Math.min(this.player.carried, needed);
          if (depositAmount > 0) {
            this.player.carried -= depositAmount;
            lantern.deposited += depositAmount;
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'deposit',
              data: {
                lantern_id: lantern.id,
                amount: depositAmount,
                deposited: lantern.deposited
              }
            });

            if (lantern.deposited >= this.tuning.lantern_cost) {
              lantern.lit = true;
              this.score += this.tuning.score.per_lantern;
              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'lantern_lit',
                data: { lantern_id: lantern.id }
              });

              // Check win
              const allLit = this.lanterns.every((item) => item.lit);
              if (allLit) {
                this.state = 'won';
                const timeBonus =
                  Math.floor(this.time_left_s) *
                  this.tuning.score.per_second_left;
                const flameBonus =
                  this.player.flames * this.tuning.score.per_flame_left;
                this.score += timeBonus + flameBonus;
                this.events.push({
                  type: 'event',
                  tick: this.tick,
                  name: 'game_over',
                  data: { result: 'won', reason: 'all_lit' }
                });
                this.prev_input.interact = this.current_input.interact;
                this.prev_input.pulse = this.current_input.pulse;
                this.prev_input.jump = this.current_input.jump;
                return this.events;
              }
            }
          }
          break; // interact with nearest / first lantern in range
        }
      }
    }

    // 6. Pulse (Rising Edge)
    const isPulseTrigger = this.current_input.pulse && !this.prev_input.pulse;
    if (
      isPulseTrigger &&
      this.player.pulse_cooldown <= 0 &&
      this.player.carried >= this.tuning.pulse_cost
    ) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulse_cooldown = this.tuning.pulse_cooldown_s;
      const stunnedIds = [];

      for (const shade of this.shades) {
        const d = dist2D(this.player.pos, shade.pos);
        if (d <= this.tuning.pulse_radius) {
          shade.state = 'stunned';
          shade.stun_timer = this.tuning.pulse_stun_s;

          // Push shade away
          let pushX = shade.pos[0] - this.player.pos[0];
          let pushZ = shade.pos[2] - this.player.pos[2];
          let pDist = Math.sqrt(pushX * pushX + pushZ * pushZ);
          if (pDist < 0.0001) {
            pushX = 1;
            pushZ = 0;
            pDist = 1;
          }
          shade.pos[0] += (pushX / pDist) * this.tuning.pulse_push_m;
          shade.pos[2] += (pushZ / pDist) * this.tuning.pulse_push_m;

          this.score += this.tuning.score.per_stun;
          stunnedIds.push(shade.id);
        }
      }

      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // 7. Shades Update & Safe Zones
    const litLanterns = this.lanterns.filter((l) => l.lit);

    for (const shade of this.shades) {
      if (shade.state === 'stunned') {
        shade.stun_timer = Math.max(0, shade.stun_timer - dt);
        if (shade.stun_timer <= 0) {
          shade.state = 'chase';
        }
      }

      if (shade.state === 'chase') {
        const dx = this.player.pos[0] - shade.pos[0];
        const dz = this.player.pos[2] - shade.pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.0001) {
          const moveDist = Math.min(dist, this.tuning.shade_speed * dt);
          const nextX = shade.pos[0] + (dx / dist) * moveDist;
          const nextZ = shade.pos[2] + (dz / dist) * moveDist;

          // Check if moving inside safe zone of any lit lantern
          let blockedByLantern = false;
          for (const lantern of litLanterns) {
            const nextD = dist2D([nextX, 0, nextZ], lantern.pos);
            if (nextD < this.tuning.safe_radius) {
              const currD = dist2D(shade.pos, lantern.pos);
              if (currD >= this.tuning.safe_radius) {
                blockedByLantern = true;
                break;
              }
            }
          }

          if (!blockedByLantern) {
            shade.pos[0] = nextX;
            shade.pos[2] = nextZ;
          }
        }

        // Check Hit Player
        const hitD = dist2D(this.player.pos, shade.pos);
        if (
          hitD <= this.tuning.shade_hit_radius &&
          this.player.invuln_timer <= 0
        ) {
          this.player.invuln_timer = this.tuning.invuln_s;
          this.player.flames--;
          const dropped = Math.floor(
            this.player.carried * this.tuning.hit_drop_ratio
          );
          this.player.carried -= dropped;

          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'player_hit',
            data: {
              by: 'shade',
              flames: this.player.flames,
              dropped
            }
          });

          if (this.player.flames <= 0) {
            this.state = 'lost';
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'game_over',
              data: { result: 'lost', reason: 'no_flames' }
            });
            break;
          }
        }
      }
    }

    // Update previous inputs for edge detection
    this.prev_input.interact = this.current_input.interact;
    this.prev_input.pulse = this.current_input.pulse;
    this.prev_input.jump = this.current_input.jump;

    return this.events;
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      state: this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      player: {
        pos: [
          round3(this.player.pos[0]),
          round3(this.player.pos[1]),
          round3(this.player.pos[2])
        ],
        flames: this.player.flames,
        carried: this.player.carried
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state
      })),
      motes_active: this.motes.filter((m) => m.active).length
    };
  }
}
