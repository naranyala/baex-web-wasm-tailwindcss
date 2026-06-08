import { BaexElement, defineComponent, html, createSignal, Signal } from '../framework/index.js';

interface WizardField {
  label: string;
  type: string;
  name: string;
  placeholder: string;
  required?: boolean;
}

interface WizardStep {
  title: string;
  fields: WizardField[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    title: 'Account Details',
    fields: [
      { label: 'Username', type: 'text', name: 'username', placeholder: 'Enter username', required: true },
      { label: 'Email', type: 'email', name: 'email', placeholder: 'Enter email', required: true },
      { label: 'Password', type: 'password', name: 'password', placeholder: 'Enter password', required: true },
    ],
  },
  {
    title: 'Personal Info',
    fields: [
      { label: 'Full Name', type: 'text', name: 'fullName', placeholder: 'Enter full name', required: true },
      { label: 'Date of Birth', type: 'date', name: 'dob', placeholder: '', required: false },
      { label: 'Country', type: 'text', name: 'country', placeholder: 'Enter country', required: true },
    ],
  },
  {
    title: 'Preferences',
    fields: [
      { label: 'Theme', type: 'text', name: 'theme', placeholder: 'Light/Dark/System', required: false },
      { label: 'Notifications', type: 'text', name: 'notify', placeholder: 'Enabled/Disabled', required: false },
      { label: 'Language', type: 'text', name: 'lang', placeholder: 'English/Spanish/etc', required: true },
    ],
  },
];

export class FormWizard extends BaexElement {
  private _currentStep!: Signal<number>;
  private _formData!: Signal<Record<string, string>>;
  private _errorMsg = createSignal('wizard_error', '');

  constructor() {
    super();
    // We can initialize signals here as _cid is set in super()
    this._currentStep = createSignal('wizard_step', 0, this._cid);
    this._formData = createSignal('wizard_data', {}, this._cid);
  }

  onConnected() {
    this.track(this._currentStep, () => this.requestUpdate());
    this.track(this._formData, () => this.requestUpdate());
    this.track(this._errorMsg, () => this.requestUpdate());
  }

  private _handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this._formData.value = { ...this._formData.value, [target.name]: target.value };
    if (this._errorMsg.value) this._errorMsg.value = '';
  };

  private _validateStep(stepIdx: number): boolean {
    const step = WIZARD_STEPS[stepIdx];
    for (const field of step.fields) {
      if (field.required && !this._formData.value[field.name]) {
        this._errorMsg.value = `Please fill in the ${field.label} field.`;
        return false;
      }
    }
    return true;
  }

  private _next = () => {
    if (this._validateStep(this._currentStep.value)) {
      if (this._currentStep.value < WIZARD_STEPS.length) {
        this._currentStep.value++;
      }
    }
  };

  private _prev = () => {
    if (this._currentStep.value > 0) {
      this._currentStep.value--;
      this._errorMsg.value = '';
    }
  };

  private _submit = () => {
    console.log('Final Submission:', this._formData.value);
    alert('Account created successfully!');
    this._currentStep.value = 0;
    this._formData.value = {};
  };

  render() {
    const stepIdx = this._currentStep.value;
    const isReviewStep = stepIdx === WIZARD_STEPS.length;
    const step = isReviewStep ? null : WIZARD_STEPS[stepIdx];
    const progress = ((stepIdx + 1) / (WIZARD_STEPS.length + 1)) * 100;

    return html`
      <div class="max-w-xl mx-auto bg-white/[0.03] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <!-- Progress Bar -->
        <div class="h-1.5 bg-white/[0.05] w-full">
          <div 
            class="h-full bg-gradient-to-r from-blue-600 to-indigo-400 transition-all duration-500 ease-out" 
            style="width: ${progress}%"
          ></div>
        </div>

        <div class="p-8">
          <div class="flex justify-between items-start mb-10">
            <div>
              <span class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 block">
                ${isReviewStep ? 'Final Step' : `Step ${stepIdx + 1} of ${WIZARD_STEPS.length}`}
              </span>
              <h2 class="text-3xl font-extrabold text-white tracking-tight">
                ${isReviewStep ? 'Review & Submit' : step?.title}
              </h2>
            </div>
            <div class="text-4xl opacity-10 text-white font-black italic">0${stepIdx + 1}</div>
          </div>

          ${isReviewStep 
            ? html`
              <div class="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                ${WIZARD_STEPS.flatMap(s => s.fields).map(f => html`
                  <div class="flex justify-between py-2 border-b border-white/[0.05]">
                    <span class="text-gray-500 text-sm">${f.label}</span>
                    <span class="text-white text-sm font-medium">${this._formData.value[f.name] || '—'}</span>
                  </div>
                `)}
              </div>
            `
            : html`
              <div class="space-y-5 mb-8">
                ${step?.fields.map((field) => html`
                  <div class="flex flex-col gap-2">
                    <label class="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      ${field.label}
                      ${field.required ? html`<span class="text-red-400 text-xs">*</span>` : ''}
                    </label>
                    <input
                      type="${field.type}"
                      name="${field.name}"
                      value="${this._formData.value[field.name] || ''}"
                      @input=${this._handleInput}
                      placeholder="${field.placeholder}"
                      class="bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-gray-600"
                    />
                  </div>
                `)}
              </div>
            `
          }

          ${this._errorMsg.value ? html`
            <div class="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> ${this._errorMsg.value}
            </div>
          ` : ''}

          <div class="flex justify-between pt-8 border-t border-white/[0.05]">
            <button 
              @click=${this._prev}
              ${stepIdx === 0 ? 'disabled' : ''}
              class="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            ${!isReviewStep 
              ? html`<button @click=${this._next} class="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95">Continue</button>`
              : html`<button @click=${this._submit} class="px-8 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95">Submit Application</button>`
            }
          </div>
        </div>
      </div>
    `;
  }
}

defineComponent('baex-form-wizard', FormWizard);
