require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.33.0/min/vs' }});
require(['vs/editor/editor.main'], function () {
  const editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Escribe tu código aquí\n',
    language: 'javascript'
  });
});

async function askAI() {
  const editor = monaco.editor.getEditors()[0];
  const prompt = editor.getValue();

  const response = await fetch("http://localhost:8080/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const code = await response.text();
  editor.setValue(code);
}