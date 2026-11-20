// src/engine.js — Core Game Logic (Test Contract v1.2, Nights 1, 2, 3)
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

export function dist3D(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function round3(val) {
  return Math.round(val * 1000) / 1000;
}

export function round1(val) {
  return Math.round(val * 10) / 10;
}

export class GameEngine {
  constructor(options = {}) {
    this.seed = options.seed ?? 1;
    this.night = options.night ?? 1;
    this.random = createPrng(this.seed);

    const defaultDuration =
      this.night === 1 ? 240 : this.night === 2 ? 270 : 300;

    this.tuning = {
      player_speed: 6.0,
      jump_speed: 7.0,
      gravity: -20.0,
      dash_speed: 14.0,
      dash_duration_s: 0.2,
      dash_cooldown_s: 1.5,
      carry_capacity: 10,
      capacity_max: 20,
      pickup_radius: 1.0,
      pickup_height: 1.5,
      lantern_cost: 10,
      relight_cost: 5,
      fuel_max: 100,
      fuel_decay_per_s: 1.0,
      fuel_per_mote: 10,
      low_fuel_threshold: 30,
      drain_per_s: 5,
      win_ratio: 0.6,
      interact_radius: 2.0,
      safe_radius: 6.0,
      pulse_cost: 3,
      pulse_radius: 5.0,
      pulse_stun_s: 2.0,
      pulse_push_m: 4.0,
      pulse_cooldown_s: 3.0,
      shade_speed: this.night === 3 ? 4.5 : 4.0,
      shade_detect_radius: 12.0,
      shade_lose_radius: 18.0,
      shade_hit_radius: 1.0,
      shade_hit_height: 1.5,
      hit_drop_ratio: 0.5,
      dropped_mote_ttl_s: 8.0,
      invuln_s: 1.5,
      fall_enabled: true,
      fall_threshold_y: -10.0,
      fall_wait_s: 1.0,
      night1_duration_s: 240,
      night2_duration_s: 270,
      night3_duration_s: 300,
      flames: 3,
      score: {
        per_mote_in_lantern: 5,
        per_lantern_first: 100,
        per_lantern_relight: 40,
        per_stun: 5,
        per_stun_drain: 15,
        per_lantern_lit_dawn: 50,
        per_flame_left: 50
      },
      ...options.tuning
    };

    this.sim_tick = 0;
    this.tick = 0;
    this.state = 'playing'; // 'playing' | 'paused' | 'won' | 'lost'
    this.paused = false;
    this.score = 0;
    this.initial_time_left_s = defaultDuration;
    this.time_left_s = this.initial_time_left_s;

    // Wind system
    this.wind_enabled = options.scenario?.wind_enabled ?? (this.night === 3);
    this.wind = {
      active: false,
      dir_deg: 0,
      timer_ticks: 0,
      warn_ticks: 0
    };

    // Player state
    this.player = {
      pos: [0, 0, 0],
      vel: [0, 0, 0],
      facing: [0, 0, 1],
      grounded: true,
      carried: 0,
      flames: this.tuning.flames,
      successful_lights: 0,
      capacity: 10,
      invuln_ticks: 0,
      pulse_cd_ticks: 0,
      dash_cd_ticks: 0,
      dash_ticks_left: 0,
      dash_dir: [0, 0, 1],
      charm_ticks: 0,
      is_launched: false,
      launch_vel: [0, 0, 0],
      fall_wait_ticks: 0
    };

    this.lanterns = [];
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];
    this.events = [];

    // Next ID generators
    this.nextShadeNum = 1;
    this.nextDrifterNum = 1;
    this.nextMoteNum = 1;

    // Inputs
    this.current_input = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false
    };
    this.prev_input = {
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false
    };

    this.initMapEntities();

    if (options.scenario) {
      this.loadScenario(options.scenario);
    }
  }

  getGroundHeight(x, z) {
    if (this.night === 1) {
      const r = Math.sqrt(x * x + z * z);
      return r <= 40 ? 0 : null;
    } else if (this.night === 2) {
      const rA = Math.sqrt(x * x + z * z);
      if (rA <= 28) return 0;
      const rB = Math.sqrt((x - 70) * (x - 70) + z * z);
      if (rB <= 28) return 0;
      if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
      return null;
    } else if (this.night === 3) {
      const r = Math.sqrt(x * x + z * z);
      if (r > 45) return null;
      if (r <= 8) return 6;

      const angle = Math.atan2(z, x);
      const angleDeg = ((angle * 180) / Math.PI + 360) % 360;

      for (const targetAngle of [30, 150]) {
        let diff = Math.abs(angleDeg - targetAngle);
        if (diff > 180) diff = 360 - diff;
        if (diff <= 3.5 && r >= 24 && r <= 30) {
          return ((30 - r) / 6) * 3;
        }
      }

      if (r >= 12 && r <= 24 && z > 0) return 3;
      return 0;
    }
    return 0;
  }

  initMapEntities() {
    this.lanterns = [];
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    this.charms = [];

    if (this.night === 1) {
      const positions = [
        [0, 0, 25],
        [23.8, 0, 7.7],
        [14.7, 0, -20.2],
        [-14.7, 0, -20.2],
        [-23.8, 0, 7.7]
      ];
      this.lanterns = positions.map((p, idx) => ({
        id: `L${idx + 1}`,
        pos: [...p],
        lit: false,
        deposited: 0,
        fuel: 0,
        ever_lit: false,
        relit_count: 0
      }));

      const spots = [];
      for (let i = 0; i < 8; i++) {
        const theta = (i * 45 * Math.PI) / 180;
        spots.push([round3(12 * Math.cos(theta)), 0, round3(12 * Math.sin(theta))]);
      }
      for (let i = 0; i < 16; i++) {
        const theta = (i * 22.5 * Math.PI) / 180;
        spots.push([round3(33 * Math.cos(theta)), 0, round3(33 * Math.sin(theta))]);
      }
      this.mote_spots = spots;
      for (let i = 0; i < 20; i++) {
        this.motes.push({
          id: `M${this.nextMoteNum++}`,
          pos: [...spots[i]],
          kind: 'random',
          ttl_s: null,
          can_pickup: true
        });
      }
    } else if (this.night === 2) {
      const positions = [
        [0, 0, 20],
        [17, 0, -10],
        [-17, 0, -10],
        [70, 0, 20],
        [87, 0, -10],
        [53, 0, -10]
      ];
      this.lanterns = positions.map((p, idx) => ({
        id: `L${idx + 1}`,
        pos: [...p],
        lit: false,
        deposited: 0,
        fuel: 0,
        ever_lit: false,
        relit_count: 0
      }));

      this.charms.push({
        id: 'C1',
        pos: [35, 0, 0],
        available: true,
        respawn_s: 0
      });

      const spots = [];
      for (const [cx, cz] of [[0, 0], [70, 0]]) {
        for (let i = 0; i < 4; i++) {
          const theta = (i * 90 * Math.PI) / 180;
          spots.push([round3(cx + 10 * Math.cos(theta)), 0, round3(cz + 10 * Math.sin(theta))]);
        }
        for (let i = 0; i < 8; i++) {
          const theta = (i * 45 * Math.PI) / 180;
          spots.push([round3(cx + 22 * Math.cos(theta)), 0, round3(cz + 22 * Math.sin(theta))]);
        }
      }
      this.mote_spots = spots;
      for (let i = 0; i < 20 && i < spots.length; i++) {
        this.motes.push({
          id: `M${this.nextMoteNum++}`,
          pos: [...spots[i]],
          kind: 'random',
          ttl_s: null,
          can_pickup: true
        });
      }
    } else if (this.night === 3) {
      const positions = [
        [0, 6, 6],
        [18, 3, 10],
        [-18, 3, 10],
        [35, 0, -10],
        [-35, 0, -10],
        [20, 0, -35],
        [-20, 0, -35]
      ];
      this.lanterns = positions.map((p, idx) => ({
        id: `L${idx + 1}`,
        pos: [...p],
        lit: false,
        deposited: 0,
        fuel: 0,
        ever_lit: false,
        relit_count: 0
      }));

      this.charms.push({
        id: 'C1',
        pos: [30, 0, 25],
        available: true,
        respawn_s: 0
      });
      this.charms.push({
        id: 'C2',
        pos: [-30, 0, 25],
        available: true,
        respawn_s: 0
      });

      const spots = [];
      for (let i = 0; i < 18; i++) {
        const theta = (i * 20 * Math.PI) / 180;
        spots.push([round3(34 * Math.cos(theta)), 0, round3(34 * Math.sin(theta))]);
      }
      for (let i = 1; i <= 8; i++) {
        const theta = (i * 20 * Math.PI) / 180;
        spots.push([round3(18 * Math.cos(theta)), 3, round3(18 * Math.sin(theta))]);
      }
      for (const deg of [45, 135, 225, 315]) {
        const theta = (deg * Math.PI) / 180;
        spots.push([round3(5 * Math.cos(theta)), 6, round3(5 * Math.sin(theta))]);
      }
      this.mote_spots = spots;
      for (let i = 0; i < 20 && i < spots.length; i++) {
        this.motes.push({
          id: `M${this.nextMoteNum++}`,
          pos: [...spots[i]],
          kind: 'random',
          ttl_s: null,
          can_pickup: true
        });
      }
    }
  }

  loadScenario(sc) {
    if (sc.time_left_s !== undefined) {
      this.initial_time_left_s = sc.time_left_s;
      this.time_left_s = sc.time_left_s;
    }
    if (sc.player) {
      if (sc.player.pos) this.player.pos = [...sc.player.pos];
      if (sc.player.vel) this.player.vel = [...sc.player.vel];
      if (sc.player.carried !== undefined) this.player.carried = sc.player.carried;
      if (sc.player.flames !== undefined) this.player.flames = sc.player.flames;
      if (sc.player.successful_lights !== undefined) {
        this.player.successful_lights = sc.player.successful_lights;
        this.player.capacity = Math.min(20, 10 + 2 * this.player.successful_lights);
      }
      if (sc.player.invuln_ticks !== undefined)
        this.player.invuln_ticks = sc.player.invuln_ticks;
      if (sc.player.dash_cd_ticks !== undefined)
        this.player.dash_cd_ticks = sc.player.dash_cd_ticks;
      if (sc.player.pulse_cd_ticks !== undefined)
        this.player.pulse_cd_ticks = sc.player.pulse_cd_ticks;
      if (sc.player.charm_ticks !== undefined)
        this.player.charm_ticks = sc.player.charm_ticks;
    }

    if (Array.isArray(sc.lanterns)) {
      for (const sl of sc.lanterns) {
        let l = this.lanterns.find((item) => item.id === sl.id);
        if (!l) {
          l = {
            id: sl.id,
            pos: [0, 0, 0],
            lit: false,
            deposited: 0,
            fuel: 0,
            ever_lit: false,
            relit_count: 0
          };
          this.lanterns.push(l);
        }
        if (sl.pos) l.pos = [...sl.pos];
        if (sl.deposited !== undefined) l.deposited = sl.deposited;
        if (sl.ever_lit !== undefined) l.ever_lit = sl.ever_lit;
        if (sl.relit_count !== undefined) l.relit_count = sl.relit_count;
        if (sl.lit !== undefined) {
          l.lit = sl.lit;
          if (l.lit && sl.fuel === undefined) {
            l.fuel = 100;
          }
        }
        if (sl.fuel !== undefined) l.fuel = sl.fuel;
      }
    }

    if (Array.isArray(sc.motes)) {
      this.motes = sc.motes.map((m, idx) => {
        const pos = Array.isArray(m) ? m : m.pos;
        return {
          id: m.id || `M${idx + 1}`,
          pos: [pos[0], pos[1] ?? 0, pos[2]],
          kind: m.kind || 'random',
          ttl_s: m.ttl_s ?? null,
          can_pickup: true
        };
      });
      this.nextMoteNum = this.motes.length + 1;
    } else if (sc.random_motes === false) {
      this.motes = [];
    }

    if (Array.isArray(sc.shades)) {
      this.shades = sc.shades.map((s, idx) => ({
        id: s.id || `S${idx + 1}`,
        pos: [s.pos[0], s.pos[1] ?? 0, s.pos[2]],
        state: s.state || 'chase',
        state_ticks_left: s.state_ticks_left ?? 0,
        target_lantern_id: s.target_lantern_id || null,
        drain_ticks: 0,
        push_vel: [0, 0],
        push_ticks_left: 0,
        recoil_ticks_left: 0,
        safe_push_ticks_left: 0
      }));
      this.nextShadeNum = this.shades.length + 1;
    } else if (sc.random_shades === false) {
      this.shades = [];
    }

    if (Array.isArray(sc.drifters)) {
      this.drifters = sc.drifters.map((d, idx) => ({
        id: d.id || `D${idx + 1}`,
        pos: [d.pos[0], d.pos[1] ?? 0, d.pos[2]],
        state: d.state || 'idle',
        stolen: d.stolen || 0,
        flee_ticks_left: 0,
        drop_ticks_left: 0
      }));
      this.nextDrifterNum = this.drifters.length + 1;
    } else if (sc.random_drifters === false) {
      this.drifters = [];
    }

    if (Array.isArray(sc.charms)) {
      this.charms = sc.charms.map((c, idx) => ({
        id: c.id || `C${idx + 1}`,
        pos: [c.pos[0], c.pos[1] ?? 0, c.pos[2]],
        available: c.available ?? true,
        respawn_s: c.respawn_s ?? 0
      }));
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
    if (frame.dash !== undefined) this.current_input.dash = frame.dash;
    if (frame.pause !== undefined) this.current_input.pause = frame.pause;
  }

  pushOutShadesFromLantern(lantern) {
    for (const s of this.shades) {
      const d = dist2D(s.pos, lantern.pos);
      if (d < this.tuning.safe_radius) {
        s.safe_push_ticks_left = 30;
        let dx = s.pos[0] - lantern.pos[0];
        let dz = s.pos[2] - lantern.pos[2];
        let dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.0001) { dx = 1; dz = 0; dist = 1; }
        s.pos[0] = lantern.pos[0] + (dx / dist) * this.tuning.safe_radius;
        s.pos[2] = lantern.pos[2] + (dz / dist) * this.tuning.safe_radius;
      }
    }
  }

  step() {
    this.tick++;
    this.events = [];
    const dt = 1 / 60;

    // 1. Đọc input (xử lý pause trước)
    const isPauseTrigger = this.current_input.pause && !this.prev_input.pause;
    if (isPauseTrigger) {
      this.paused = !this.paused;
      if (this.paused) {
        this.events.push({ type: 'event', tick: this.tick, name: 'paused', data: {} });
        this.prev_input.pause = this.current_input.pause;
        return this.events;
      } else {
        this.events.push({ type: 'event', tick: this.tick, name: 'resumed', data: {} });
      }
    }
    this.prev_input.pause = this.current_input.pause;

    if (this.paused || this.state !== 'playing') {
      return this.events;
    }

    this.sim_tick++;

    // 2. Giảm các bộ đếm & Nhiên liệu đèn
    this.time_left_s = Math.max(0, this.initial_time_left_s - this.sim_tick * dt);

    if (this.player.invuln_ticks > 0) this.player.invuln_ticks--;
    if (this.player.pulse_cd_ticks > 0) this.player.pulse_cd_ticks--;
    if (this.player.dash_cd_ticks > 0) this.player.dash_cd_ticks--;
    if (this.player.charm_ticks > 0) this.player.charm_ticks--;
    if (this.player.fall_wait_ticks > 0) this.player.fall_wait_ticks--;

    // Update dynamic capacity
    this.player.capacity = Math.min(20, 10 + 2 * this.player.successful_lights);

    // Update charms respawn
    for (const c of this.charms) {
      if (!c.available) {
        c.respawn_s = Math.max(0, c.respawn_s - dt);
        if (c.respawn_s <= 0) c.available = true;
      }
    }

    // Update motes TTL
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.can_pickup = true;
      if (m.ttl_s !== null) {
        m.ttl_s = Math.max(0, m.ttl_s - dt);
        if (m.ttl_s <= 0) {
          this.motes.splice(i, 1);
        }
      }
    }

    // Process Lantern Fuel decay & drain
    for (const l of this.lanterns) {
      if (l.lit) {
        // Natural decay: 1.0 fuel/s
        let totalDrainRate = this.tuning.fuel_decay_per_s;

        // Shades draining this lantern
        for (const s of this.shades) {
          if (s.state === 'drain' && s.target_lantern_id === l.id) {
            totalDrainRate += this.tuning.drain_per_s;
            s.drain_ticks++;
            if (s.drain_ticks % 60 === 0) {
              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'fuel_drain',
                data: {
                  lantern_id: l.id,
                  shade_id: s.id,
                  fuel: round1(Math.max(0, l.fuel - totalDrainRate * dt))
                }
              });
            }
          }
        }

        l.fuel = Math.max(0, l.fuel - totalDrainRate * dt);

        // Check lantern out
        if (l.fuel <= 0) {
          l.lit = false;
          l.fuel = 0;
          l.deposited = 0;
          l.ever_lit = true;
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'lantern_out',
            data: { lantern_id: l.id }
          });

          // Shades draining this lantern return to wander
          for (const s of this.shades) {
            if (s.target_lantern_id === l.id && s.state === 'drain') {
              s.state = 'wander';
              s.target_lantern_id = null;
            }
          }
        }
      }
    }

    // 3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo
    if (this.player.fall_wait_ticks === 0) {
      if (this.wind_enabled) {
        if (!this.wind.active) {
          this.wind.timer_ticks++;
          if (this.wind.timer_ticks >= 1800) {
            this.wind.active = true;
            this.wind.dir_deg = round3(this.random() * 360);
            this.wind.duration_ticks = 300;
            this.wind.timer_ticks = 0;
          }
        } else {
          this.wind.duration_ticks--;
          if (this.wind.duration_ticks <= 0) {
            this.wind.active = false;
          }
        }
      }

      // Check Dash (rising edge)
      const isDashTrigger = this.current_input.dash && !this.prev_input.dash;
      if (isDashTrigger) {
        const canDash =
          this.player.charm_ticks > 0 || this.player.dash_cd_ticks <= 0;
        if (canDash && this.player.dash_ticks_left <= 0) {
          this.player.dash_ticks_left = 12;
          this.player.dash_cd_ticks = this.player.charm_ticks > 0 ? 0 : 90;

          const [mx, mz] = this.current_input.move;
          if (mx !== 0 || mz !== 0) {
            const theta = (this.current_input.cam_yaw_deg * Math.PI) / 180;
            let dx = mx * Math.cos(theta) + mz * Math.sin(theta);
            let dz = -mx * Math.sin(theta) + mz * Math.cos(theta);
            const len = Math.sqrt(dx * dx + dz * dz);
            this.player.dash_dir = [dx / len, 0, dz / len];
          } else {
            this.player.dash_dir = [...this.player.facing];
          }

          this.player.vel[1] = 0;
          this.events.push({ type: 'event', tick: this.tick, name: 'dash', data: {} });
        }
      }

      // Movement application
      if (this.player.dash_ticks_left > 0) {
        this.player.dash_ticks_left--;
        this.player.pos[0] += this.player.dash_dir[0] * this.tuning.dash_speed * dt;
        this.player.pos[2] += this.player.dash_dir[2] * this.tuning.dash_speed * dt;
      } else if (this.player.is_launched) {
        this.player.pos[0] += this.player.launch_vel[0] * dt;
        this.player.pos[2] += this.player.launch_vel[2] * dt;
      } else {
        const [mx, mz] = this.current_input.move;
        const theta = (this.current_input.cam_yaw_deg * Math.PI) / 180;
        let moveX = mx * Math.cos(theta) + mz * Math.sin(theta);
        let moveZ = -mx * Math.sin(theta) + mz * Math.cos(theta);
        const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (moveLen > 1) {
          moveX /= moveLen;
          moveZ /= moveLen;
        }
        if (moveLen > 0.001) {
          this.player.facing = [moveX / (moveLen || 1), 0, moveZ / (moveLen || 1)];
        }

        const currentSpeed =
          this.player.charm_ticks > 0 ? 7.2 : this.tuning.player_speed;
        this.player.pos[0] += moveX * currentSpeed * dt;
        this.player.pos[2] += moveZ * currentSpeed * dt;

        if (this.wind.active) {
          const wTheta = (this.wind.dir_deg * Math.PI) / 180;
          this.player.pos[0] += Math.cos(wTheta) * 2.0 * dt;
          this.player.pos[2] += Math.sin(wTheta) * 2.0 * dt;
        }
      }

      // Jump
      const isJumpTrigger = this.current_input.jump && !this.prev_input.jump;
      if (isJumpTrigger && this.player.grounded && this.player.dash_ticks_left <= 0) {
        this.player.vel[1] = this.tuning.jump_speed;
        this.player.grounded = false;
      }

      if (!this.player.grounded && this.player.dash_ticks_left <= 0) {
        this.player.vel[1] += this.tuning.gravity * dt;
        this.player.pos[1] += this.player.vel[1] * dt;
      }

      const groundY = this.getGroundHeight(this.player.pos[0], this.player.pos[2]);
      if (groundY !== null) {
        if (this.player.pos[1] <= groundY) {
          this.player.pos[1] = groundY;
          this.player.vel[1] = 0;
          this.player.grounded = true;
          this.player.is_launched = false;
        } else {
          this.player.grounded = false;
        }
      } else {
        this.player.grounded = false;
      }

      // Check Bounce Pads
      if (this.night === 2) {
        if (dist2D(this.player.pos, [20, 0, 18]) <= 1.0 && this.player.pos[1] <= 0.1) {
          this.player.is_launched = true;
          this.player.grounded = false;
          this.player.vel[1] = 14.0;
          const dx = 70 - 20, dz = 0 - 18;
          const d = Math.sqrt(dx * dx + dz * dz);
          this.player.launch_vel = [(dx / d) * 24.0, 14.0, (dz / d) * 24.0];
        }
        if (dist2D(this.player.pos, [50, 0, -18]) <= 1.0 && this.player.pos[1] <= 0.1) {
          this.player.is_launched = true;
          this.player.grounded = false;
          this.player.vel[1] = 14.0;
          const dx = 0 - 50, dz = 0 - (-18);
          const d = Math.sqrt(dx * dx + dz * dz);
          this.player.launch_vel = [(dx / d) * 24.0, 14.0, (dz / d) * 24.0];
        }
      } else if (this.night === 3) {
        if (dist2D(this.player.pos, [0, 3, 13]) <= 1.0 && Math.abs(this.player.pos[1] - 3) <= 0.2) {
          this.player.is_launched = true;
          this.player.grounded = false;
          this.player.vel[1] = 12.0;
          this.player.launch_vel = [0, 12.0, -8.0];
        }
      }

      // Check falling off island (Y < -10)
      if (this.player.pos[1] < this.tuning.fall_threshold_y) {
        this.player.flames--;
        const lostAmount = this.player.carried;
        this.player.carried = 0;
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'player_hit',
          data: {
            by: 'fall',
            flames: this.player.flames,
            dropped: 0,
            lost: lostAmount
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
          return this.events;
        }

        this.player.fall_wait_ticks = 60;
      }
    } else {
      if (this.player.fall_wait_ticks === 1) {
        const startY = this.getGroundHeight(0, 0) || 0;
        this.player.pos = [0, startY, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invuln_ticks = 90;
      }
    }

    // 4. Nhặt đom đóm và bùa
    if (this.player.fall_wait_ticks === 0) {
      // Motes
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        if (!m.can_pickup) continue;
        const xzDist = dist2D(this.player.pos, m.pos);
        const yDiff = Math.abs(this.player.pos[1] - m.pos[1]);
        if (xzDist <= this.tuning.pickup_radius && yDiff <= this.tuning.pickup_height) {
          if (this.player.carried < this.player.capacity) {
            this.motes.splice(i, 1);
            this.player.carried++;
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'mote_picked',
              data: { carried: this.player.carried }
            });
          }
        }
      }

      // Charms
      for (const c of this.charms) {
        if (c.available && dist2D(this.player.pos, c.pos) <= 1.0) {
          c.available = false;
          c.respawn_s = 2700 / 60;
          this.player.charm_ticks = 600;
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'charm_picked',
            data: { charm_id: c.id, charm_ticks: 600 }
          });
        }
      }
    }

    // 5. Tương tác với đèn (Châm dầu & Thắp lại / Thắp mới)
    const isInteractTrigger = this.current_input.interact && !this.prev_input.interact;
    if (isInteractTrigger && this.player.carried > 0 && this.player.fall_wait_ticks === 0) {
      const inRange = [];
      for (const l of this.lanterns) {
        const d = dist2D(this.player.pos, l.pos);
        if (d <= this.tuning.interact_radius) {
          if (!l.lit) {
            inRange.push({ lantern: l, dist: d });
          } else if (l.lit && l.fuel < 100) {
            inRange.push({ lantern: l, dist: d });
          }
        }
      }

      if (inRange.length > 0) {
        inRange.sort((a, b) => a.dist - b.dist || a.lantern.id.localeCompare(b.lantern.id));
        const target = inRange[0].lantern;

        if (!target.lit) {
          const cost = target.ever_lit ? this.tuning.relight_cost : this.tuning.lantern_cost;
          const needed = cost - target.deposited;
          const amount = Math.min(this.player.carried, needed);
          if (amount > 0) {
            this.player.carried -= amount;
            target.deposited += amount;
            this.score += amount * this.tuning.score.per_mote_in_lantern;
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'deposit',
              data: {
                lantern_id: target.id,
                amount,
                deposited: target.deposited
              }
            });

            if (target.deposited >= cost) {
              target.lit = true;
              target.fuel = 100;
              this.player.successful_lights++;
              this.player.capacity = Math.min(20, 10 + 2 * this.player.successful_lights);

              const isRelight = target.ever_lit;
              if (isRelight) {
                target.relit_count++;
                this.score += this.tuning.score.per_lantern_relight;
              } else {
                target.ever_lit = true;
                this.score += this.tuning.score.per_lantern_first;
              }

              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'lantern_lit',
                data: { lantern_id: target.id, relight: isRelight }
              });

              this.pushOutShadesFromLantern(target);
            }
          }
        } else {
          // Refuel lit lantern
          const needed = Math.ceil((100 - target.fuel) / this.tuning.fuel_per_mote);
          const used = Math.min(this.player.carried, needed);
          if (used > 0) {
            const prevFuel = target.fuel;
            target.fuel = Math.min(100, target.fuel + used * this.tuning.fuel_per_mote);
            this.player.carried -= used;
            this.score += used * this.tuning.score.per_mote_in_lantern;

            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'refuel',
              data: {
                lantern_id: target.id,
                amount: used,
                fuel: round1(target.fuel)
              }
            });

            if (prevFuel < this.tuning.low_fuel_threshold && target.fuel >= this.tuning.low_fuel_threshold) {
              this.pushOutShadesFromLantern(target);
              // Wake any draining shades on this lantern
              for (const s of this.shades) {
                if (s.target_lantern_id === target.id && s.state === 'drain') {
                  s.state = 'wander';
                  s.target_lantern_id = null;
                }
              }
            }
          }
        }
      }
    }

    // 6. Cập nhật vùng an toàn (handled by safe_radius checking only if lit and fuel >= 30)

    // 7. Tỏa Sáng
    const isPulseTrigger = this.current_input.pulse && !this.prev_input.pulse;
    if (
      isPulseTrigger &&
      this.player.pulse_cd_ticks <= 0 &&
      this.player.carried >= this.tuning.pulse_cost &&
      this.player.fall_wait_ticks === 0
    ) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulse_cd_ticks = 180;
      const pulseCenter = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
      const stunnedIds = [];

      for (const s of this.shades) {
        const sCenter = [s.pos[0], s.pos[1] + 0.5, s.pos[2]];
        if (dist3D(pulseCenter, sCenter) <= this.tuning.pulse_radius) {
          const wasDrain = s.state === 'drain';
          s.state = 'stunned';
          s.state_ticks_left = 120;
          let pushX = s.pos[0] - this.player.pos[0];
          let pushZ = s.pos[2] - this.player.pos[2];
          let pDist = Math.sqrt(pushX * pushX + pushZ * pushZ);
          if (pDist < 0.0001) { pushX = 1; pushZ = 0; pDist = 1; }
          s.push_vel = [(pushX / pDist) * (4.0 / 15), (pushZ / pDist) * (4.0 / 15)];
          s.push_ticks_left = 15;

          // Score: +15 if draining, +5 otherwise
          this.score += wasDrain ? this.tuning.score.per_stun_drain : this.tuning.score.per_stun;
          stunnedIds.push(s.id);
        }
      }

      for (let i = this.drifters.length - 1; i >= 0; i--) {
        const d = this.drifters[i];
        if (dist3D(pulseCenter, d.pos) <= this.tuning.pulse_radius) {
          if (d.state === 'chase') {
            d.state = 'flee';
            d.flee_ticks_left = 240;
          } else if (d.state === 'flee' && d.stolen > 0) {
            for (let k = 0; k < d.stolen; k++) {
              this.motes.push({
                id: `M${this.nextMoteNum++}`,
                pos: [...d.pos],
                kind: 'dropped',
                ttl_s: 8.0,
                can_pickup: false
              });
            }
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'drifter_drop',
              data: { drifter_id: d.id, amount: d.stolen }
            });
            d.stolen = 0;
            d.drop_ticks_left = 120;
          }
        }
      }

      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'pulse',
        data: { stunned_ids: stunnedIds }
      });
    }

    // 8. Di chuyển Bóng Mực và Gió Lạc
    // Only lit lanterns with fuel >= 30 have safe radius!
    const activeSafeLanterns = this.lanterns.filter(
      (l) => l.lit && l.fuel >= this.tuning.low_fuel_threshold
    );

    for (const s of this.shades) {
      if (s.safe_push_ticks_left > 0) s.safe_push_ticks_left--;

      if (s.push_ticks_left > 0) {
        s.push_ticks_left--;
        s.pos[0] += s.push_vel[0];
        s.pos[2] += s.push_vel[1];
      }

      if (s.state === 'stunned') {
        s.state_ticks_left--;
        if (s.state_ticks_left <= 0) s.state = 'wander';
      } else if (s.state === 'recoil') {
        s.recoil_ticks_left--;
        s.pos[0] += s.recoil_vel[0];
        s.pos[2] += s.recoil_vel[1];
        if (s.recoil_ticks_left <= 0) s.state = 'chase';
      } else if (s.state === 'drain') {
        // Stays still at lantern
        const targetLantern = this.lanterns.find((l) => l.id === s.target_lantern_id);
        if (!targetLantern || !targetLantern.lit || targetLantern.fuel >= this.tuning.low_fuel_threshold) {
          s.state = 'wander';
          s.target_lantern_id = null;
        } else if (dist2D(s.pos, targetLantern.pos) > 2.0) {
          s.state = 'wander';
          s.target_lantern_id = null;
        } else if (dist2D(s.pos, this.player.pos) <= 6.0) {
          // Interrupt to chase if Mây comes within 6m
          s.state = 'chase';
          s.target_lantern_id = null;
        }
      } else {
        // Wander or Chase
        const dToPlayer = dist2D(s.pos, this.player.pos);
        if (s.state === 'wander' && dToPlayer <= this.tuning.shade_detect_radius) {
          s.state = 'chase';
        } else if (s.state === 'chase' && dToPlayer > this.tuning.shade_lose_radius) {
          s.state = 'wander';
        }

        if (s.state === 'wander') {
          // Wander Shade seeks weak lantern (fuel < 30)
          const weakLanterns = this.lanterns.filter(
            (l) => l.lit && l.fuel < this.tuning.low_fuel_threshold
          );
          let target = null;
          if (weakLanterns.length > 0) {
            weakLanterns.sort((a, b) => dist2D(s.pos, a.pos) - dist2D(s.pos, b.pos) || a.id.localeCompare(b.id));
            target = weakLanterns[0];
          } else {
            // nearest unlit lantern
            const unlit = this.lanterns.filter((l) => !l.lit);
            if (unlit.length > 0) {
              unlit.sort((a, b) => dist2D(s.pos, a.pos) - dist2D(s.pos, b.pos) || a.id.localeCompare(b.id));
              target = unlit[0];
            }
          }

          if (target) {
            const dx = target.pos[0] - s.pos[0];
            const dz = target.pos[2] - s.pos[2];
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d <= 2.0 && target.lit && target.fuel < this.tuning.low_fuel_threshold) {
              s.state = 'drain';
              s.target_lantern_id = target.id;
              s.drain_ticks = 0;
            } else if (d > 0.0001) {
              const moveDist = Math.min(d, this.tuning.shade_speed * dt);
              s.pos[0] += (dx / d) * moveDist;
              s.pos[2] += (dz / d) * moveDist;
            }
          }
        } else if (s.state === 'chase') {
          const dx = this.player.pos[0] - s.pos[0];
          const dz = this.player.pos[2] - s.pos[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.0001) {
            const moveDist = Math.min(dist, this.tuning.shade_speed * dt);
            const nextX = s.pos[0] + (dx / dist) * moveDist;
            const nextZ = s.pos[2] + (dz / dist) * moveDist;

            let blocked = false;
            for (const l of activeSafeLanterns) {
              if (dist2D([nextX, 0, nextZ], l.pos) < this.tuning.safe_radius) {
                if (dist2D(s.pos, l.pos) >= this.tuning.safe_radius) {
                  blocked = true;
                  break;
                }
              }
            }
            if (!blocked) {
              s.pos[0] = nextX;
              s.pos[2] = nextZ;
            }
          }
        }
      }
    }

    // Drifters movement
    for (let i = this.drifters.length - 1; i >= 0; i--) {
      const d = this.drifters[i];
      if (d.drop_ticks_left > 0) {
        d.drop_ticks_left--;
        if (d.drop_ticks_left <= 0) {
          this.drifters.splice(i, 1);
          continue;
        }
      }

      const dToM = dist2D(d.pos, this.player.pos);
      if (d.state === 'idle') {
        if (this.player.carried >= 5 && dToM <= 15.0) {
          d.state = 'chase';
        }
      } else if (d.state === 'chase') {
        if (this.player.carried < 5 || dToM > 15.0) {
          d.state = 'idle';
        } else {
          const dx = this.player.pos[0] - d.pos[0];
          const dz = this.player.pos[2] - d.pos[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.0001) {
            d.pos[0] += (dx / dist) * 7.0 * dt;
            d.pos[2] += (dz / dist) * 7.0 * dt;
          }
        }
      } else if (d.state === 'flee') {
        d.flee_ticks_left--;
        let dx = d.pos[0] - this.player.pos[0];
        let dz = d.pos[2] - this.player.pos[2];
        let dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.0001) { dx = 1; dz = 0; dist = 1; }
        d.pos[0] += (dx / dist) * 7.0 * dt;
        d.pos[2] += (dz / dist) * 7.0 * dt;
        if (d.flee_ticks_left <= 0) {
          this.drifters.splice(i, 1);
        }
      }
    }

    // 9. Chạm (Gió Lạc cướp trước, rồi Bóng Mực gây hit)
    if (this.player.fall_wait_ticks === 0) {
      for (const d of this.drifters) {
        if (d.state === 'chase') {
          if (dist2D(this.player.pos, d.pos) <= 1.2) {
            const stealAmount = Math.min(3, this.player.carried);
            this.player.carried -= stealAmount;
            d.stolen = stealAmount;
            d.state = 'flee';
            d.flee_ticks_left = 240;
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'drifter_steal',
              data: {
                drifter_id: d.id,
                amount: stealAmount,
                carried: this.player.carried
              }
            });
          }
        }
      }

      if (this.player.invuln_ticks <= 0) {
        const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
        for (const s of sortedShades) {
          if (s.state === 'stunned' || s.safe_push_ticks_left > 0) continue;
          const xzDist = dist2D(this.player.pos, s.pos);
          const yDiff = Math.abs(this.player.pos[1] - s.pos[1]);
          if (xzDist <= this.tuning.shade_hit_radius && yDiff <= this.tuning.shade_hit_height) {
            this.player.invuln_ticks = 90;
            this.player.flames--;
            const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
            this.player.carried -= dropped;

            for (let k = 0; k < dropped; k++) {
              const theta = (k * 2 * Math.PI) / (dropped || 1);
              const r = 1.5 + this.random() * 1.0;
              this.motes.push({
                id: `M${this.nextMoteNum++}`,
                pos: [
                  round3(this.player.pos[0] + r * Math.cos(theta)),
                  this.player.pos[1],
                  round3(this.player.pos[2] + r * Math.sin(theta))
                ],
                kind: 'dropped',
                ttl_s: 8.0,
                can_pickup: false
              });
            }

            let rX = s.pos[0] - this.player.pos[0];
            let rZ = s.pos[2] - this.player.pos[2];
            let rDist = Math.sqrt(rX * rX + rZ * rZ);
            if (rDist < 0.0001) { rX = 1; rZ = 0; rDist = 1; }
            s.state = 'recoil';
            s.recoil_ticks_left = 60;
            s.recoil_vel = [(rX / rDist) * (2.0 / 60), (rZ / rDist) * (2.0 / 60)];

            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'player_hit',
              data: {
                by: 'shade',
                flames: this.player.flames,
                dropped,
                lost: 0
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
            }
            break;
          }
        }
      }
    }

    // 10. Sinh thực thể theo lịch
    if (this.sim_tick % 240 === 0 && this.motes.length < 30 && this.mote_spots) {
      for (const sp of this.mote_spots) {
        const hasMote = this.motes.some((m) => dist2D(m.pos, sp) < 1.0);
        if (!hasMote) {
          this.motes.push({
            id: `M${this.nextMoteNum++}`,
            pos: [...sp],
            kind: 'random',
            ttl_s: null,
            can_pickup: false
          });
          break;
        }
      }
    }

    const interval = this.night === 1 ? 480 : this.night === 2 ? 420 : 360;
    const maxShades = this.night === 1 ? 6 : this.night === 2 ? 8 : 10;
    if (this.sim_tick === 300) {
      for (let k = 0; k < 2 && this.shades.length < maxShades; k++) {
        const theta = this.random() * 2 * Math.PI;
        const r = this.night === 1 ? 37 : this.night === 2 ? 26 : 43;
        const sId = `S${this.nextShadeNum++}`;
        this.shades.push({
          id: sId,
          pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
          state: 'wander',
          state_ticks_left: 0,
          target_lantern_id: null,
          drain_ticks: 0,
          push_vel: [0, 0],
          push_ticks_left: 0,
          recoil_ticks_left: 0,
          safe_push_ticks_left: 0
        });
        this.events.push({ type: 'event', tick: this.tick, name: 'shade_spawned', data: { id: sId } });
      }
    } else if (this.sim_tick > 300 && (this.sim_tick - 300) % interval === 0) {
      if (this.shades.length < maxShades) {
        const theta = this.random() * 2 * Math.PI;
        const r = this.night === 1 ? 37 : this.night === 2 ? 26 : 43;
        const sId = `S${this.nextShadeNum++}`;
        this.shades.push({
          id: sId,
          pos: [round3(r * Math.cos(theta)), 0, round3(r * Math.sin(theta))],
          state: 'wander',
          state_ticks_left: 0,
          target_lantern_id: null,
          drain_ticks: 0,
          push_vel: [0, 0],
          push_ticks_left: 0,
          recoil_ticks_left: 0,
          safe_push_ticks_left: 0
        });
        this.events.push({ type: 'event', tick: this.tick, name: 'shade_spawned', data: { id: sId } });
      }
    }

    if ((this.night === 2 || this.night === 3) && this.sim_tick % 1200 === 0 && this.drifters.length < 2) {
      const theta = this.random() * 2 * Math.PI;
      const r = this.night === 2 ? 25 : 35;
      this.drifters.push({
        id: `D${this.nextDrifterNum++}`,
        pos: [round3(r * Math.cos(theta)), 1.5, round3(r * Math.sin(theta))],
        state: 'idle',
        stolen: 0,
        flee_ticks_left: 0,
        drop_ticks_left: 0
      });
    }

    // 11. Xét thắng/thua (Change Request: No early win! Win only at dawn_survived)
    if (this.player.flames <= 0) {
      this.state = 'lost';
      this.events.push({
        type: 'event',
        tick: this.tick,
        name: 'game_over',
        data: { result: 'lost', reason: 'no_flames' }
      });
    } else if (this.time_left_s <= 0 && this.state === 'playing') {
      const litLanterns = this.lanterns.filter((l) => l.lit);
      const needed = Math.ceil(this.tuning.win_ratio * this.lanterns.length);

      if (litLanterns.length >= needed) {
        this.state = 'won';
        for (const l of litLanterns) {
          this.score += this.tuning.score.per_lantern_lit_dawn + Math.floor(l.fuel);
        }
        this.score += this.player.flames * this.tuning.score.per_flame_left;

        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'game_over',
          data: { result: 'won', reason: 'dawn_survived' }
        });
      } else {
        this.state = 'lost';
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'game_over',
          data: { result: 'lost', reason: 'dawn' }
        });
      }
    }

    this.updatePreviousInputs();
    return this.events;
  }

  updatePreviousInputs() {
    this.prev_input.interact = this.current_input.interact;
    this.prev_input.pulse = this.current_input.pulse;
    this.prev_input.jump = this.current_input.jump;
    this.prev_input.dash = this.current_input.dash;
  }

  getSnapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.sim_tick,
      night: this.night,
      state: this.paused ? 'paused' : this.state,
      time_left_s: round3(this.time_left_s),
      score: this.score,
      wind: {
        active: this.wind.active,
        dir_deg: round3(this.wind.dir_deg)
      },
      player: {
        pos: [
          round3(this.player.pos[0]),
          round3(this.player.pos[1]),
          round3(this.player.pos[2])
        ],
        vel: [
          round3(this.player.vel[0]),
          round3(this.player.vel[1]),
          round3(this.player.vel[2])
        ],
        grounded: this.player.grounded,
        invuln: this.player.invuln_ticks > 0,
        dash_cd_s: round3(this.player.dash_cd_ticks / 60),
        pulse_cd_s: round3(this.player.pulse_cd_ticks / 60),
        charm_s: round3(this.player.charm_ticks / 60),
        carried: this.player.carried,
        flames: this.player.flames,
        capacity: this.player.capacity
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: [round3(l.pos[0]), round3(l.pos[1]), round3(l.pos[2])],
        lit: l.lit,
        deposited: l.deposited,
        fuel: l.lit ? round1(l.fuel) : 0,
        ever_lit: l.ever_lit,
        relit_count: l.relit_count
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: [round3(s.pos[0]), round3(s.pos[1]), round3(s.pos[2])],
        state: s.state
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: [round3(d.pos[0]), round3(d.pos[1]), round3(d.pos[2])],
        state: d.state,
        stolen: d.stolen
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: round3(c.respawn_s)
      })),
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: [round3(m.pos[0]), round3(m.pos[1]), round3(m.pos[2])],
        kind: m.kind,
        ttl_s: m.ttl_s !== null ? round3(m.ttl_s) : null
      }))
    };
  }
}
