const promptBox = document.getElementById('prompt');
const messages = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const sendBtn = document.getElementById('sendBtn');

// Keep a short conversation history so GLOBAL AI can follow the discussion.
const history = [];
let busy = false;

function addMessage(text, who) {
  const el = document.createElement('div');
  el.className = 'message ' + who;
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = who === 'user' ? 'أنت' : 'GLOBAL AI';
  const body = document.createElement('span');
  body.textContent = text;
  el.append(tag, body);
  messages.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return el;
}

async function send() {
  const value = promptBox.value.trim();
  if (!value || busy) return;

  welcome.style.display = 'none';
  addMessage(value, 'user');
  history.push({ role: 'user', content: value });
  promptBox.value = '';
  promptBox.style.height = '42px';
  busy = true;
  sendBtn.disabled = true;
  sendBtn.textContent = '…';
  const loading = addMessage('GLOBAL AI كايحضّر الجواب…', 'ai');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-20) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'وقع مشكل فالاتصال.');
    const answer = data.reply || 'ما توصلتش بجواب. عاود جرّب.';
    loading.lastChild.textContent = answer;
    history.push({ role: 'assistant', content: answer });
  } catch (error) {
    loading.lastChild.textContent = 'ما قدرتش نتصل بالذكاء الاصطناعي. ' + (error.message || 'تأكد من تشغيل السيرفر ومفتاح API.');
  } finally {
    busy = false;
    sendBtn.disabled = false;
    sendBtn.textContent = '➤';
    promptBox.focus();
  }
}

sendBtn.addEventListener('click', send);
promptBox.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
promptBox.addEventListener('input', () => {
  promptBox.style.height = '42px';
  promptBox.style.height = Math.min(promptBox.scrollHeight, 130) + 'px';
});

document.querySelectorAll('.suggestion').forEach(btn => btn.addEventListener('click', () => {
  promptBox.value = btn.textContent.replace(/^.{1,3}　/, '');
  send();
}));

document.getElementById('newChat').addEventListener('click', () => {
  messages.innerHTML = '';
  history.length = 0;
  welcome.style.display = 'block';
  document.getElementById('sidebar').classList.remove('open');
});

document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
const modal = document.getElementById('modal');
document.getElementById('aboutBtn').addEventListener('click', () => modal.classList.remove('hidden'));
document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
