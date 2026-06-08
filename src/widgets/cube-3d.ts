import { BaexElement, defineComponent, html } from '../framework/index.js';

export class Cube3D extends BaexElement {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _animationId: number = 0;
  private _angleX = 0;
  private _angleY = 0;
  private _angleZ = 0;

  // Cube Vertices (x, y, z)
  private _vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];

  // Edges connecting the vertices
  private _edges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // Back face
    [4, 5], [5, 6], [6, 7], [7, 4], // Front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
  ];

  onConnected() {
    this._updateCanvas();
    this._startAnimation();
  }

  onDisconnected() {
    cancelAnimationFrame(this._animationId);
  }

  private _updateCanvas() {
    this._canvas = this.querySelector('canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      this._canvas.width = 400;
      this._canvas.height = 400;
    }
  }

  private _rotate(x: number, y: number, z: number) {
    // Rotate X
    let ty = y * Math.cos(this._angleX) - z * Math.sin(this._angleX);
    let tz = y * Math.sin(this._angleX) + z * Math.cos(this._angleX);
    y = ty; z = tz;

    // Rotate Y
    let tx = x * Math.cos(this._angleY) + z * Math.sin(this._angleY);
    tz = -x * Math.sin(this._angleY) + z * Math.cos(this._angleY);
    x = tx; z = tz;

    // Rotate Z
    tx = x * Math.cos(this._angleZ) - y * Math.sin(this._angleZ);
    ty = x * Math.sin(this._angleZ) + y * Math.cos(this._angleZ);
    x = tx; y = ty;

    return [x, y, z];
  }

  private _project(v: number[]) {
    const scale = 100;
    const distance = 4;
    const x = (v[0] / distance) * scale + 200;
    const y = (v[1] / distance) * scale + 200;
    return [x, y];
  }

  private _draw() {
    const ctx = this._ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    const transformed = this._vertices.map(v => this._rotate(...v));
    const projected = transformed.map(v => this._project(v));

    ctx.beginPath();
    this._edges.forEach(([start, end]) => {
      const p1 = projected[start];
      const p2 = projected[end];
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
    });
    ctx.stroke();

    this._angleX += 0.01;
    this._angleY += 0.015;
    this._angleZ += 0.005;

    this._animationId = requestAnimationFrame(() => this._draw());
  }

  private _startAnimation() {
    this._draw();
  }

  render() {
    return html`
      <div class="flex flex-col items-center gap-6 p-8 bg-white/[0.02] rounded-2xl border border-white/[0.08]">
        <div class="text-center">
          <h3 class="text-xl font-bold text-white mb-1">Linear Algebra Cube</h3>
          <p class="text-sm text-gray-400">Real-time 3D projection using rotation matrices</p>
        </div>
        <canvas class="rounded-lg bg-black/40 shadow-2xl border border-white/[0.05]"></canvas>
        <div class="grid grid-cols-3 gap-4 text-[10px] font-mono text-gray-500">
          <div class="px-3 py-1 bg-white/[0.05] rounded border border-white/[0.05]">Rotation X: ${this._angleX.toFixed(2)}</div>
          <div class="px-3 py-1 bg-white/[0.05] rounded border border-white/[0.05]">Rotation Y: ${this._angleY.toFixed(2)}</div>
          <div class="px-3 py-1 bg-white/[0.05] rounded border border-white/[0.05]">Rotation Z: ${this._angleZ.toFixed(2)}</div>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-cube-3d', Cube3D);
