console.log('In the Search MVP');

const canvas = document.getElementById('game');
if (canvas instanceof HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eee';
    ctx.font = '16px sans-serif';
    ctx.fillText('In the Search MVP', 20, 40);
  }
}
