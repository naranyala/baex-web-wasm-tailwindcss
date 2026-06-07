import { BaexElement, defineComponent, html } from '../framework/index.js';
import { property } from '../framework/baex-element.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

class LeafletMap extends BaexElement {
  @property({ type: String }) center = '51.505, -0.09';
  @property({ type: Number }) zoom = 13;

  private _map: L.Map | null = null;

  onConnected() {
    this.whenUpdate(() => this._initMap());
  }

  private _initMap() {
    const mapEl = this.querySelector('#map') as HTMLElement;
    if (!mapEl) return;

    const [lat, lng] = this.center.split(',').map(Number);
    this._map = L.map(mapEl).setView([lat, lng], this.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this._map);
  }

  disconnectedCallback() {
    if (this._map) {
      this._map.remove();
    }
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div id="map" class="h-64 w-full rounded-lg border border-white/10"></div>
    `;
  }
}

defineComponent('baex-leaflet-map', LeafletMap);
