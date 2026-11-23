// A small physics world for falling words (shared by the home page's entrance,
// home.js, and the next-project words at the bottom of the project pages, project.js).
// The words are solid bodies: they fall with gravity, hit each other, turn,
// and pile up without going into one another.

// Each body is a box made of 4 corner points held together by 6 sticks
// (the 4 sides and the 2 diagonals), so it keeps its shape but can turn.
// Points move by "Verlet" steps: where it was, where it is, and gravity.

function makeBody(width, height, x, y, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const dx = sx * width / 2, dy = sy * height / 2;
    const px = x + dx * cos - dy * sin, py = y + dx * sin + dy * cos;
    return { x: px, y: py, oldX: px, oldY: py };
  });
  const sticks = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]].map(([i, j]) => ({
    a: corners[i], b: corners[j], length: Math.hypot(corners[j].x - corners[i].x, corners[j].y - corners[i].y)
  }));
  return { corners, sticks, active: false };
}

function bodyCenter(body) {
  let x = 0, y = 0;
  body.corners.forEach(c => { x += c.x / 4; y += c.y / 4; });
  return { x, y };
}

// Pushes two bodies apart if they overlap (the "separating axis" test:
// two boxes overlap only if they overlap seen from every side's direction)
function separate(one, two) {
  let depth = Infinity, normal = null, edge = null, edgeBody = null;
  for (const body of [one, two]) {
    for (let i = 0; i < 4; i++) {
      const a = body.corners[i], b = body.corners[(i + 1) % 4];
      let nx = a.y - b.y, ny = b.x - a.x;
      const length = Math.hypot(nx, ny); nx /= length; ny /= length;
      const project = c => c.x * nx + c.y * ny;
      const p1 = one.corners.map(project), p2 = two.corners.map(project);
      const overlap = Math.min(Math.max(...p1), Math.max(...p2)) - Math.max(Math.min(...p1), Math.min(...p2));
      if (overlap <= 0) return; // a gap: no touch
      if (overlap < depth) { depth = overlap; normal = { x: nx, y: ny }; edge = [a, b]; edgeBody = body; }
    }
  }
  const pointBody = edgeBody === one ? two : one;
  const ce = bodyCenter(edgeBody), cp = bodyCenter(pointBody);
  if ((cp.x - ce.x) * normal.x + (cp.y - ce.y) * normal.y < 0) { normal.x *= -1; normal.y *= -1; }
  // The corner of the other body that went deepest into this side
  let point = null, smallest = Infinity;
  pointBody.corners.forEach(c => {
    const d = (c.x - ce.x) * normal.x + (c.y - ce.y) * normal.y;
    if (d < smallest) { smallest = d; point = c; }
  });
  // Push the corner out half the way, and the side back the other half
  const [e1, e2] = edge;
  const pushX = normal.x * depth, pushY = normal.y * depth;
  const t = Math.abs(e1.x - e2.x) > Math.abs(e1.y - e2.y)
    ? (point.x - pushX - e1.x) / (e2.x - e1.x)
    : (point.y - pushY - e1.y) / (e2.y - e1.y);
  const lambda = 1 / (t * t + (1 - t) * (1 - t));
  e1.x -= pushX * (1 - t) * 0.5 * lambda; e1.y -= pushY * (1 - t) * 0.5 * lambda;
  e2.x -= pushX * t * 0.5 * lambda;       e2.y -= pushY * t * 0.5 * lambda;
  point.x += pushX * 0.5; point.y += pushY * 0.5;
}

function stepWorld(bodies, gravity, floor, width) {
  const live = bodies.filter(b => b.active);
  // 1. Move every corner (with a little air friction) and pull it down
  live.forEach(body => body.corners.forEach(c => {
    const vx = (c.x - c.oldX) * 0.99, vy = (c.y - c.oldY) * 0.99;
    c.oldX = c.x; c.oldY = c.y;
    c.x += vx; c.y += vy + gravity;
  }));
  // 2. Several rounds: keep the shapes, the floor, the walls, and no overlaps
  for (let round = 0; round < 12; round++) {
    live.forEach(body => body.sticks.forEach(({ a, b, length }) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const k = (d - length) / d * 0.5;
      a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
    }));
    live.forEach(body => body.corners.forEach(c => {
      if (c.y > floor) { c.y = floor; c.oldX = c.x - (c.x - c.oldX) * 0.6; } // the floor, with friction
      if (c.x < 0) c.x = 0;
      if (c.x > width) c.x = width;
    }));
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) separate(live[i], live[j]);
    }
  }
}

