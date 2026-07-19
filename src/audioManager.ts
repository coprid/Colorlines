// Класс для управления звуками через Web Audio API
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMatchPlaying = false;
  // Инициализация контекста (браузеры блокируют звук до первого клика пользователя)
  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // 1. Клик / Выбор шара (короткий приятный «плинк»)
  playSelect(enabled: boolean) {
    if (!enabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Быстрый переход от высокой частоты к чуть более низкой
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 2. Ход / Перемещение шара (быстрое скольжение звука вверх)
 playMove(enabled: boolean, moveDuration: number = 0.3) {
    if (!enabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const duration = moveDuration;
// 1. Создаем пустой звуковой буфер под длительность нашего звука
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // 2. Заполняем его случайным шумом (это основа для шуршания)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // 3. Создаем источник звука из этого буфера
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
  
    const gain = ctx.createGain();
    // 4. Создаем фильтр, который уберет свист и сделает звук глухим и мягким
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);

    // 5. Настройка громкости шуршания (без стартовых щелчков)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02); // Сделали пик 0.05 для отчетливости
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Плавное затухание строго к концу пути

    // 6. Соединяем узлы: Шум -> Фильтр -> Громкость -> Колонки
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // 7. Запускаем генератор шума
    noiseNode.start(now);
    noiseNode.stop(now + duration);
  }

  // 3. Сгорание линии (сочный мажорный аккорд)
  playMatch(enabled: boolean) {
    if (!enabled) return;
    
    if (this.isMatchPlaying) return;
    this.isMatchPlaying = true;

    const ctx = this.initContext();
    const now = ctx.currentTime;
    const duration = 0.4;

    const frequencies = [523.25, 659.25, 783.99];

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      
      const startTime = now + index * 0.03;

      osc.frequency.setValueAtTime(freq, startTime); 

      // --- УБИРАЕМ ЩЕЛЧОК (АТАКА) ---
      // Стартуем строго с абсолютного нуля громкости
      gain.gain.setValueAtTime(0, startTime);
      // Плавно (за 0.005 сек) поднимаем до целевой громкости 0.03
      gain.gain.linearRampToValueAtTime(0.07, startTime + 0.005);
      
      // --- ПЛАВНОЕ ЗАТУХАНИЕ ---
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Стартуем осциллятор чуть раньше начала атаки, чтобы gain управлял стартом
      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    setTimeout(() => {
      this.isMatchPlaying = false;
    }, 300);
  }

  // 4. Ошибка / Ход невозможен (низкий глухой басовый звук)
  playError(enabled: boolean) {
    if (!enabled) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const duration = 0.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth'; // Пилообразная волна для «жужжания»
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + duration);

    // Добавим простейший фильтр, чтобы звук не был слишком резким
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }
}

export const audioManager = new AudioManager();