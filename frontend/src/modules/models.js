// Simple modal de configuración de modelos para AirIde
export function showModelsModal() {
  let modal = document.getElementById('modelsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modelsModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    // Proveedores válidos según backend
    const providers = [
      'OpenAI',
      'Anthropic',
      'DeepSeek',
      'DeepSeekOpenRoute',
      'Qwen3_32BOpenRoute',
      'MistralNemoOpenRoute'
    ];
    const currentProvider = localStorage.getItem('aiProvider') || 'DeepSeekOpenRoute';
    // Modelos válidos por proveedor
    const modelsByProvider = {
      'OpenAI': [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4o'
      ],
      'Anthropic': [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ],
      'DeepSeek': [
        'deepseek-chat',
        'deepseek-coder'
      ],
      'DeepSeekOpenRoute': [
        'deepseek/deepseek-chat-v3-0324:free'
      ],
      'Qwen3_32BOpenRoute': [
        'qwen/qwen1.5-32b-chat:free'
      ],
      'MistralNemoOpenRoute': [
        'mistralai/mistral-nemo-2-8b:free'
      ]
    };
    const savedModel = localStorage.getItem('aiModel') || 'deepseek/deepseek-chat-v3-0324:free';
    const currentModel = savedModel;
    // Render modal con dropdowns dependientes
    modal.innerHTML = `
      <div class="modal-card" style="background:#232a32;padding:0;border-radius:12px;min-width:340px;max-width:95vw;color:#e6e6e6;box-shadow:0 4px 32px #000;overflow:hidden;">
        <div style="padding:24px 24px 0 24px;">
          <h2 style="margin:0 0 18px 0;font-size:1.3rem;font-weight:600;letter-spacing:0.5px;">Configurar Modelos AI</h2>
          <div class="input-group">
            <label for="aiProviderInput">Proveedor</label>
            <select id="aiProviderInput" class="modal-select">
              ${providers.map(p => `<option value="${p}"${p===currentProvider?' selected':''}>${p}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label for="aiModelInput">Modelo actual</label>
            <select id="aiModelInput" class="modal-select">
              ${modelsByProvider[currentProvider].map(m => `<option value="${m}"${m===currentModel?' selected':''}>${m}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label for="aiKeyInput">API Key</label>
            <input id="aiKeyInput" type="password" class="modal-input" style="width:100%;margin-bottom:12px;" value="${localStorage.getItem('apiKey_'+savedModel)||''}" placeholder="Tu API Key..." autocomplete="off" />
          </div>
        </div>
        <div class="modal-footer" style="background:#20242b;padding:18px 24px 18px 24px;border-top:1px solid #232a32;display:flex;justify-content:flex-end;gap:12px;">
          <button id="saveModelsConfigBtn" class="btn-primary">Guardar</button>
          <button id="closeModelsConfigBtn" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeModelsConfigBtn').onclick = () => modal.remove();
    // Cambio dinámico de modelos según proveedor
    document.getElementById('aiProviderInput').onchange = (e) => {
      const provider = e.target.value;
      const modelSelect = document.getElementById('aiModelInput');
      modelSelect.innerHTML = modelsByProvider[provider].map(m => `<option value="${m}">${m}</option>`).join('');
      // Selecciona el primer modelo por defecto
      modelSelect.value = modelsByProvider[provider][0];
      // Cambia el API key input al cambiar modelo
      document.getElementById('aiKeyInput').value = localStorage.getItem('apiKey_' + modelSelect.value) || '';
    };
    // Cambio de modelo actualiza el API key
    document.getElementById('aiModelInput').onchange = (e) => {
      const model = e.target.value;
      document.getElementById('aiKeyInput').value = localStorage.getItem('apiKey_' + model) || '';
    };
    document.getElementById('saveModelsConfigBtn').onclick = () => {
      const model = document.getElementById('aiModelInput').value;
      const provider = document.getElementById('aiProviderInput').value;
      const key = document.getElementById('aiKeyInput').value;
      localStorage.setItem('aiModel', model);
      localStorage.setItem('aiProvider', provider);
      localStorage.setItem('apiKey_' + model, key);
      // Notificación tipo toast moderna
      const toast = document.createElement('div');
      toast.textContent = '¡Configuración guardada!';
      toast.style.position = 'fixed';
      toast.style.bottom = '32px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.background = 'linear-gradient(90deg,#646cff 60%,#232a32 100%)';
      toast.style.color = '#fff';
      toast.style.padding = '14px 32px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '1rem';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 4px 24px #0008';
      toast.style.zIndex = '10000';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '1'; }, 10);
      setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 1800);
      modal.remove();
    };
  }
}
