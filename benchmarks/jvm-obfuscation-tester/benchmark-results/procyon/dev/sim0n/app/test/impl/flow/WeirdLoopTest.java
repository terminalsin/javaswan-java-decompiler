package dev.sim0n.app.test.impl.flow;

import java.util.Random;
import dev.sim0n.app.test.Test;

public class WeirdLoopTest implements Test {
  private int index;

  @Override
  public void run() {
    System.out.println("Starting weird loop test...");
    final int[] targets = new int[1 + new Random().nextInt(99)];
    if (targets.length >= 100) {
      throw new IllegalStateException("Targets must be less than 100 in size!");
    }
    for (int i = 0; i < targets.length; ++i) {
      targets[i] = new Random().nextInt();
    }
    final int old = this.index;
    int depth = 0;
    while (targets[this.index] == targets[old]) {
      this.index = new Random().nextInt(targets.length);
      if (depth > 100) {
        throw new IllegalStateException("Depth overflow");
      }
      ++depth;
    }
    if (old == this.index) {
      throw new IllegalStateException("Index cannot be duplicated!");
    }
    System.out.println("Finished weird loop test!");
  }
}
