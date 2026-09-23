// A binary min-heap, because TypeScript does not come with one.
//
// Part of the *given* library.  This is the direct equivalent of C++'s
// std::priority_queue, and it has the same limitation, which matters:
//
//   **there is no way to lower the priority of something already inside it.**
//
// So when a point turns out to be reachable more cheaply than you thought, you
// do not reach in and fix it -- you push a second entry at the lower cost, and
// ignore the stale one when it surfaces.  That works because the first time a
// point comes out of the heap its cost is already final, so every later copy of
// it can only be worse.  Problem 02 is where that argument gets made properly,
// and it is worth making before you rely on it.

export class MinHeap<T> {
  private readonly items: Array<{ key: number; value: T }> = [];

  get size(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  push(key: number, value: T): void {
    this.items.push({ key, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.key <= this.items[i]!.key) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** The smallest-key entry, or undefined when empty. */
  pop(): { key: number; value: T } | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.items[left]!.key < this.items[smallest]!.key)
          smallest = left;
        if (right < this.items.length && this.items[right]!.key < this.items[smallest]!.key)
          smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const t = this.items[a]!;
    this.items[a] = this.items[b]!;
    this.items[b] = t;
  }
}
