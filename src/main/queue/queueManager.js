class QueueManager {
  constructor(maxParallel = 2) {
    this.queue = [];
    this.activeCount = 0;
    this.maxParallel = maxParallel;
  }

  enqueue(task) {
    this.queue.push(task);
    this.next();
  }

  async next() {
    if (this.activeCount >= this.maxParallel || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift();
    
    try {
      await task();
    } catch (error) {
      console.error('Queue task error:', error);
    } finally {
      this.activeCount--;
      this.next();
    }
  }

  setMaxParallel(count) {
    this.maxParallel = count;
    this.next();
  }
}

module.exports = QueueManager;
