// A binary min-heap, because TypeScript does not come with one.
//
// Part of the *given* library.  This is Part 1's heap with one addition: a
// numeric tie-break, so that two states of equal cost always come out in the
// same order.  Determinism matters more here than it did in Part 1, because a
// capstone route is checked against a picture rather than a number, and "either
// of these two equally good answers" is not something a test can assert.
//
// It has the same limitation std::priority_queue has, and it matters:
//
//   **there is no way to lower the priority of something already inside it.**
//
// So when a state turns out to be reachable more cheaply than you thought, you
// push a second entry at the lower cost and ignore the stale one when it
// surfaces.  That works because the first time a state comes out of the heap
// its cost is already final.

interface Entry<T> {
  key: number;
  tie: number;
  value: T;
}

export class MinHeap<T> {
  private readonly items: Array<Entry<T>> = [];

  get size(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  push(key: number, value: T, tie = 0): void {
    this.items.push({ key, tie, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!MinHeap.before(this.items[i]!, this.items[parent]!)) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** The smallest-key entry, or undefined when empty. */
  pop(): { key: number; value: T } | undefined {
    const top = this.items[0];
    if (!top) return undefined;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && MinHeap.before(this.items[left]!, this.items[smallest]!))
          smallest = left;
        if (right < this.items.length && MinHeap.before(this.items[right]!, this.items[smallest]!))
          smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return { key: top.key, value: top.value };
  }

  private static before<U>(a: Entry<U>, b: Entry<U>): boolean {
    return a.key !== b.key ? a.key < b.key : a.tie < b.tie;
  }

  private swap(a: number, b: number): void {
    const t = this.items[a]!;
    this.items[a] = this.items[b]!;
    this.items[b] = t;
  }
}
