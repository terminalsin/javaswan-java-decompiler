package dev.sim0n.app.test.impl.flow;

import dev.sim0n.app.test.Test;
import java.util.Random;

public class WeirdLoopTest implements Test {
  private int index;

  public void run() {
    System.out.println("Starting weird loop test...");
    int[] targets = new int[1 + new Random().nextInt(99)];
    if (targets.length >= 100) {
      throw new IllegalStateException("Targets must be less than 100 in size!");
    }
    int i = 0;
    while (i < targets.length) {
      targets[i] = new Random().nextInt();
      i++;
    }
    i = this.index;
    for (int depth = 0; targets[this.index] == targets[i]; depth++) {
      this.index = new Random().nextInt(targets.length);
      if (depth > 100) {
        throw new IllegalStateException("Depth overflow");
      }
    }
    if (i == this.index) {
      throw new IllegalStateException("Index cannot be duplicated!");
    }
    System.out.println("Finished weird loop test!");
  }
}
