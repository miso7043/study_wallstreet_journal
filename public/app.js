import { Player } from './player.mjs';
const $ = id => document.getElementById(id);
let articles = [], previousIndex = -1;
const player = new Player(window.speechSynthesis, text => new SpeechSynthesisUtterance(text), (p, message) => {
  $('play').textContent = p.state === 'playing' ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', p.state === 'playing' ? '일시정지' : p.state === 'paused' ? '이어 듣기' : '재생');
  $('all').setAttribute('aria-pressed', String(p.mode === 'all'));
  $('one').setAttribute('aria-pressed', String(p.mode === 'one'));
  document.querySelectorAll('.sentence').forEach((row, i) => {
    row.classList.toggle('current', i === p.index);
    row.querySelector('button').setAttribute('aria-current', String(i === p.index));
  });
  if (p.state === 'playing' && previousIndex !== p.index) {
    const current = document.querySelector('.sentence.current');
    if (current) { const bounds = current.getBoundingClientRect(); if (bounds.top < 0 || bounds.bottom > innerHeight - $('status').parentElement.offsetHeight) current.scrollIntoView({block: 'center'}); }
  }
  previousIndex = p.index;
  $('status').textContent = message;
});
function loadArticle(index) {
  const article = articles[index];
  $('title').textContent = article.title;
  $('subtitle').textContent = article.subtitle;
  $('count').textContent = `${article.sentences.length} SENTENCES`;
  $('sentences').replaceChildren(...article.sentences.map((sentence, i) => {
    const row = document.createElement('section'); row.className = 'sentence';
    const num = document.createElement('span'); num.className = 'number'; num.textContent = String(i + 1).padStart(2, '0'); num.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div');
    const en = document.createElement('button'); en.className = 'english'; en.lang = 'en'; en.textContent = sentence.en; en.title = '여기부터 순차 재생'; en.addEventListener('click', () => player.click(i));
    const ko = document.createElement('p'); ko.className = 'korean'; ko.lang = 'ko'; ko.textContent = sentence.ko;
    content.append(en, ko); row.append(num, content); return row;
  }));
  previousIndex = -1; player.load(article.sentences);
  $('play').disabled = $('stop').disabled = !article.sentences.length;
}
$('play').onclick = () => player.toggle();
$('stop').onclick = () => player.stop();
$('all').onclick = () => player.setMode('all');
$('one').onclick = () => player.setMode('one');
$('translation').onclick = () => {
  const visible = $('translation').getAttribute('aria-pressed') !== 'true';
  $('translation').setAttribute('aria-pressed', String(visible));
  $('sentences').classList.toggle('hide-translations', !visible);
};
$('rate').oninput = () => { player.rate = Number($('rate').value); $('rateValue').textContent = `${player.rate.toFixed(1)}×`; };
$('articles').onchange = () => loadArticle(Number($('articles').value));
window.addEventListener('pagehide', () => player.stop());
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && event.target === document.body && !event.repeat) { event.preventDefault(); player.toggle(); }
});
try {
  const response = await fetch('./api/articles');
  if (!response.ok) throw Error('자료를 불러올 수 없습니다.');
  articles = await response.json();
  if (!articles.length) throw Error('DB에 등록된 학습 자료가 없습니다.');
  $('articles').replaceChildren(...articles.map((article, i) => new Option(article.title, String(i))));
  $('articles').disabled = false; loadArticle(0);
} catch (error) { $('title').textContent = '자료를 불러오지 못했습니다.'; $('error').textContent = `${error.message} 새로고침해 주세요.`; $('status').textContent = '자료 불러오기 실패'; }
