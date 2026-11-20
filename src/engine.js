// src/engine.js — Core Game Logic (Test Contract v1.1, Nights 1, 2, 3)
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

export class GameEngine {
  constructor(options = {}) {
    this.seed = options.seed ?? 1;
    this.night = options.night ?? 1;
    this.random = createPrng(this.seed);

    const defaultDuration =
      this.night === 1 ? 300 : this.night === 2 ? 330 : 360;

    this.tuning = {
      player_speed: 6.0,
      jump_speed: 7.0,
      gravity: -20.0,
      dash_speed: 14.0,
      dash_duration_s: 0.2,
      dash_cooldown_s: 1.5,
      carry_capacity: 10,
      pickup_radius: 1.0,
      pickup_height: 1.5,
      lantern_cost: 10,
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
      night1_duration_s: 300,
      night2_duration_s: 330,
      night3_duration_s: 360,
      flames: 3,
      score: {
        per_mote_deposited: 10,
        per_lantern: 100,
        per_stun: 5,
        per_second_left: 2,
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
      facing: [0, 0, 1], // default facing +Z
      grounded: true,
      carried: 0,
      flames: this.tuning.flames,
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
      // Bridge: x in [26, 44], z in [-2, 2]
      if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
      return null;
    } else if (this.night === 3) {
      const r = Math.sqrt(x * x + z * z);
      if (r > 45) return null;

      // Bell tower cylinder obstruction at center of Tier 2: r <= 2
      // Tier 2: r <= 8 at Y = 6
      if (r <= 8) {
        return 6;
      }

      // Check Ramps at 30 deg and 150 deg (width 3m, r in [24, 30])
      // 30 deg: theta approx Math.PI/6
      const angle = Math.atan2(z, x); // angle from +X
      const angleDeg = ((angle * 180) / Math.PI + 360) % 360;

      for (const targetAngle of [30, 150]) {
        let diff = Math.abs(angleDeg - targetAngle);
        if (diff > 180) diff = 360 - diff;
        // width 3m along radial at r ~ 27m corresponds to angular width ~ (3/27) rad ~ 6.3 deg
        if (diff <= 3.5 && r >= 24 && r <= 30) {
          // Linear height from 0 at r=30 to 3 at r=24
          return ((30 - r) / 6) * 3;
        }
      }

      // Tier 1: Y = 3, r in [12, 24] and z > 0
      if (r >= 12 && r <= 24 && z > 0) {
        return 3;
      }

      // Tier 0: Y = 0
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
        deposited: 0
      }));

      // 20 initial motes from 24 defined spots
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
        deposited: 0
      }));

      this.charms.push({
        id: 'C1',
        pos: [35, 0, 0],
        available: true,
        respawn_s: 0
      });

      // Mote spots for Night 2: Island A and Island B
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
        deposited: 0
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

      // Mote spots for Night 3 (30 points)
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
          l = { id: sl.id, pos: [0, 0, 0], lit: false, deposited: 0 };
          this.lanterns.push(l);
        }
        if (sl.pos) l.pos = [...sl.pos];
        if (sl.deposited !== undefined) l.deposited = sl.deposited;
        if (sl.lit !== undefined) l.lit = sl.lit;
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

    // 2. Giảm các bộ đếm
    this.time_left_s = Math.max(0, this.initial_time_left_s - this.sim_tick * dt);

    if (this.player.invuln_ticks > 0) this.player.invuln_ticks--;
    if (this.player.pulse_cd_ticks > 0) this.player.pulse_cd_ticks--;
    if (this.player.dash_cd_ticks > 0) this.player.dash_cd_ticks--;
    if (this.player.charm_ticks > 0) this.player.charm_ticks--;
    if (this.player.fall_wait_ticks > 0) this.player.fall_wait_ticks--;

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

    // 3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo
    if (this.player.fall_wait_ticks === 0) {
      // Wind update
      if (this.wind_enabled) {
        if (!this.wind.active) {
          this.wind.timer_ticks++;
          if (this.wind.timer_ticks >= 1800) { // every 30s
            this.wind.active = true;
            this.wind.dir_deg = round3(this.random() * 360);
            this.wind.duration_ticks = 300; // 5s
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
          this.player.dash_ticks_left = 12; // 0.2s = 12 ticks
          this.player.dash_cd_ticks = this.player.charm_ticks > 0 ? 0 : 90; // 1.5s = 90 ticks

          // Dash direction
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

          // In-air dash preserves Y height
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
        // Maintained launch horizontal velocity
        this.player.pos[0] += this.player.launch_vel[0] * dt;
        this.player.pos[2] += this.player.launch_vel[2] * dt;
      } else {
        // Normal move
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

        // Apply wind push if active
        if (this.wind.active) {
          const wTheta = (this.wind.dir_deg * Math.PI) / 180;
          this.player.pos[0] += Math.cos(wTheta) * 2.0 * dt;
          this.player.pos[2] += Math.sin(wTheta) * 2.0 * dt;
        }
      }

      // Jump (rising edge, only when grounded)
      const isJumpTrigger = this.current_input.jump && !this.prev_input.jump;
      if (isJumpTrigger && this.player.grounded && this.player.dash_ticks_left <= 0) {
        this.player.vel[1] = this.tuning.jump_speed;
        this.player.grounded = false;
      }

      // Vertical gravity & position update
      if (!this.player.grounded && this.player.dash_ticks_left <= 0) {
        this.player.vel[1] += this.tuning.gravity * dt;
        this.player.pos[1] += this.player.vel[1] * dt;
      }

      // Check ground collision
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
        // Pad 1 at (20,0,18): launches towards (70,0,0)
        if (dist2D(this.player.pos, [20, 0, 18]) <= 1.0 && this.player.pos[1] <= 0.1) {
          this.player.is_launched = true;
          this.player.grounded = false;
          this.player.vel[1] = 14.0;
          const dx = 70 - 20, dz = 0 - 18;
          const d = Math.sqrt(dx * dx + dz * dz);
          this.player.launch_vel = [(dx / d) * 24.0, 14.0, (dz / d) * 24.0];
        }
        // Pad 2 at (50,0,-18): launches towards (0,0,0)
        if (dist2D(this.player.pos, [50, 0, -18]) <= 1.0 && this.player.pos[1] <= 0.1) {
          this.player.is_launched = true;
          this.player.grounded = false;
          this.player.vel[1] = 14.0;
          const dx = 0 - 50, dz = 0 - (-18);
          const d = Math.sqrt(dx * dx + dz * dz);
          this.player.launch_vel = [(dx / d) * 24.0, 14.0, (dz / d) * 24.0];
        }
      } else if (this.night === 3) {
        // Pad at (0,3,13): launches Vy=12, Vz=-8
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

        // Wait 60 ticks before respawn
        this.player.fall_wait_ticks = 60;
      }
    } else {
      // Waiting to respawn
      if (this.player.fall_wait_ticks === 1) {
        // Respawn at origin
        const startY = this.getGroundHeight(0, 0) || 0;
        this.player.pos = [0, startY, 0];
        this.player.vel = [0, 0, 0];
        this.player.grounded = true;
        this.player.invuln_ticks = 90;
      }
    }

    // 4. Nhặt đom đóm và bùa (chỉ nhặt khi không đang fall_wait)
    if (this.player.fall_wait_ticks === 0) {
      // Motes
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        if (!m.can_pickup) continue;
        const xzDist = dist2D(this.player.pos, m.pos);
        const yDiff = Math.abs(this.player.pos[1] - m.pos[1]);
        if (xzDist <= this.tuning.pickup_radius && yDiff <= this.tuning.pickup_height) {
          if (this.player.carried < this.tuning.carry_capacity) {
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
          c.respawn_s = 2700 / 60; // 45s
          this.player.charm_ticks = 600; // 10s
          this.events.push({
            type: 'event',
            tick: this.tick,
            name: 'charm_picked',
            data: { charm_id: c.id, charm_ticks: 600 }
          });
        }
      }
    }

    // 5. Tương tác với đèn
    const isInteractTrigger = this.current_input.interact && !this.prev_input.interact;
    if (isInteractTrigger && this.player.carried > 0 && this.player.fall_wait_ticks === 0) {
      // Find eligible unlit lanterns in range
      const inRange = [];
      for (const l of this.lanterns) {
        if (l.lit) continue;
        const d = dist2D(this.player.pos, l.pos);
        if (d <= this.tuning.interact_radius) {
          inRange.push({ lantern: l, dist: d });
        }
      }
      if (inRange.length > 0) {
        inRange.sort((a, b) => a.dist - b.dist || a.lantern.id.localeCompare(b.lantern.id));
        const target = inRange[0].lantern;
        const needed = this.tuning.lantern_cost - target.deposited;
        const amount = Math.min(this.player.carried, needed);
        if (amount > 0) {
          this.player.carried -= amount;
          target.deposited += amount;
          this.score += amount * this.tuning.score.per_mote_deposited;
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

          if (target.deposited >= this.tuning.lantern_cost) {
            target.lit = true;
            this.score += this.tuning.score.per_lantern;
            this.events.push({
              type: 'event',
              tick: this.tick,
              name: 'lantern_lit',
              data: { lantern_id: target.id }
            });

            // Push shades currently inside safe radius outward to 6m
            for (const s of this.shades) {
              const d = dist2D(s.pos, target.pos);
              if (d < this.tuning.safe_radius) {
                s.safe_push_ticks_left = 30;
                let dx = s.pos[0] - target.pos[0];
                let dz = s.pos[2] - target.pos[2];
                let dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < 0.0001) { dx = 1; dz = 0; dist = 1; }
                s.pos[0] = target.pos[0] + (dx / dist) * this.tuning.safe_radius;
                s.pos[2] = target.pos[2] + (dz / dist) * this.tuning.safe_radius;
              }
            }

            // Check Win Condition
            if (this.lanterns.every((l) => l.lit)) {
              this.state = 'won';
              const timeBonus = Math.floor(this.time_left_s) * this.tuning.score.per_second_left;
              const flameBonus = this.player.flames * this.tuning.score.per_flame_left;
              this.score += timeBonus + flameBonus;
              this.events.push({
                type: 'event',
                tick: this.tick,
                name: 'game_over',
                data: { result: 'won', reason: 'all_lit' }
              });
              this.updatePreviousInputs();
              return this.events;
            }
          }
        }
      }
    }

    // 6. Cập nhật vùng an toàn (Done implicitly via safe_radius during movement)

    // 7. Tỏa Sáng
    const isPulseTrigger = this.current_input.pulse && !this.prev_input.pulse;
    if (
      isPulseTrigger &&
      this.player.pulse_cd_ticks <= 0 &&
      this.player.carried >= this.tuning.pulse_cost &&
      this.player.fall_wait_ticks === 0
    ) {
      this.player.carried -= this.tuning.pulse_cost;
      this.player.pulse_cd_ticks = 180; // 3s
      const pulseCenter = [this.player.pos[0], this.player.pos[1] + 0.8, this.player.pos[2]];
      const stunnedIds = [];

      // Shades
      for (const s of this.shades) {
        const sCenter = [s.pos[0], s.pos[1] + 0.5, s.pos[2]];
        if (dist3D(pulseCenter, sCenter) <= this.tuning.pulse_radius) {
          s.state = 'stunned';
          s.state_ticks_left = 120; // 2s
          let pushX = s.pos[0] - this.player.pos[0];
          let pushZ = s.pos[2] - this.player.pos[2];
          let pDist = Math.sqrt(pushX * pushX + pushZ * pushZ);
          if (pDist < 0.0001) { pushX = 1; pushZ = 0; pDist = 1; }
          // Pushed 4m over 15 ticks -> vel = (4 / 15) m/tick
          s.push_vel = [(pushX / pDist) * (4.0 / 15), (pushZ / pDist) * (4.0 / 15)];
          s.push_ticks_left = 15;
          this.score += this.tuning.score.per_stun;
          stunnedIds.push(s.id);
        }
      }

      // Drifters
      for (let i = this.drifters.length - 1; i >= 0; i--) {
        const d = this.drifters[i];
        if (dist3D(pulseCenter, d.pos) <= this.tuning.pulse_radius) {
          if (d.state === 'chase') {
            d.state = 'flee';
            d.flee_ticks_left = 240;
          } else if (d.state === 'flee' && d.stolen > 0) {
            // Drop all stolen motes at current spot
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
            d.drop_ticks_left = 120; // Disappears after 120 ticks
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
    const litLanterns = this.lanterns.filter((l) => l.lit);

    for (const s of this.shades) {
      if (s.safe_push_ticks_left > 0) s.safe_push_ticks_left--;

      // Push execution from pulse
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
      } else {
        // AI detection & chase
        const dToPlayer = dist2D(s.pos, this.player.pos);
        if (s.state === 'wander' && dToPlayer <= this.tuning.shade_detect_radius) {
          s.state = 'chase';
        } else if (s.state === 'chase' && dToPlayer > this.tuning.shade_lose_radius) {
          s.state = 'wander';
        }

        if (s.state === 'chase') {
          const dx = this.player.pos[0] - s.pos[0];
          const dz = this.player.pos[2] - s.pos[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.0001) {
            const moveDist = Math.min(dist, this.tuning.shade_speed * dt);
            const nextX = s.pos[0] + (dx / dist) * moveDist;
            const nextZ = s.pos[2] + (dz / dist) * moveDist;

            // Blocked by safe radius of lit lanterns
            let blocked = false;
            for (const l of litLanterns) {
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
          // Chase player at 7 m/s
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
        // Flee away from player at 7 m/s
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
      // Drifters steal
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

      // Shades hit
      if (this.player.invuln_ticks <= 0) {
        // Sort shades by id ascending
        const sortedShades = [...this.shades].sort((a, b) => a.id.localeCompare(b.id));
        for (const s of sortedShades) {
          if (s.state === 'stunned' || s.safe_push_ticks_left > 0) continue;
          const xzDist = dist2D(this.player.pos, s.pos);
          const yDiff = Math.abs(this.player.pos[1] - s.pos[1]);
          if (xzDist <= this.tuning.shade_hit_radius && yDiff <= this.tuning.shade_hit_height) {
            // Player hit!
            this.player.invuln_ticks = 90; // 1.5s
            this.player.flames--;
            const dropped = Math.floor(this.player.carried * this.tuning.hit_drop_ratio);
            this.player.carried -= dropped;

            // Spawn dropped motes in ring 1.5 - 2.5m around player
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

            // Shade recoil 2m over 60 ticks
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
            break; // max 1 flame lost per tick
          }
        }
      }
    }

    // 10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch
    // Motes: at ticks 240, 480... spawn 1 mote at empty spot if < 30
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

    // Shades spawn
    // 2 at tick 300, then 1 every 480 ticks (Night 1), 420 ticks (Night 2), 360 ticks (Night 3)
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
          push_vel: [0, 0],
          push_ticks_left: 0,
          recoil_ticks_left: 0,
          safe_push_ticks_left: 0
        });
        this.events.push({ type: 'event', tick: this.tick, name: 'shade_spawned', data: { id: sId } });
      }
    }

    // Drifter spawn (Nights 2 & 3 at tick 1200, 2400...)
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

    // 11. Xét thắng/thua do hết giờ
    if (this.time_left_s <= 0 && this.state === 'playing') {
      if (this.lanterns.every((l) => l.lit)) {
        this.state = 'won';
        this.events.push({
          type: 'event',
          tick: this.tick,
          name: 'game_over',
          data: { result: 'won', reason: 'all_lit' }
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
        flames: this.player.flames
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
