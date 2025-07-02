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
      <div style="background:#222;padding:2rem;border-radius:10px;min-width:320px;max-width:90vw;color:#fff;box-shadow:0 2px 16px #000;">
        <h2>Configurar Modelos AI</h2>
        <label>Proveedor:<br>
          <select id="aiProviderInput" style="width:100%">
            ${providers.map(p => `<option value="${p}"${p===currentProvider?' selected':''}>${p}</option>`).join('')}
          </select>
        </label><br><br>
        <label>Modelo actual:<br>
          <select id="aiModelInput" style="width:100%">
            ${modelsByProvider[currentProvider].map(m => `<option value="${m}"${m===currentModel?' selected':''}>${m}</option>`).join('')}
          </select>
        </label><br><br>
        <label>API Key:<br><input id="aiKeyInput" style="width:100%" value="${localStorage.getItem('apiKey_'+savedModel)||''}" /></label><br><br>
        <button id="saveModelsConfigBtn">Guardar</button>
        <button id="closeModelsConfigBtn">Cerrar</button>
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
      alert('Configuración guardada');
      modal.remove();
    };
  }
}
