class QueueManager {
  constructor(maxParallel = 2) {
    this.maxParallel = maxParallel;
    this.running = 0;
    this.queue = [];
  }

  setMaxParallel(max) {
    this.maxParallel = max;
  }

  clear() {
    for (const item of this.queue) {
      if (item.reject) item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxParallel || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

module.exports = QueueManager;
