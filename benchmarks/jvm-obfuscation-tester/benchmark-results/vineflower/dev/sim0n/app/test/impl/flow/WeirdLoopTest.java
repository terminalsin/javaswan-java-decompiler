package dev.sim0n.app.test.impl.flow;

import dev.sim0n.app.test.Test;
import java.util.Random;

public class WeirdLoopTest implements Test {
  private int index;

  @Override
  public void run() {
    System.out.println("Starting weird loop test...");
    int[] targets = new int[1 + new Random().nextInt(99)];
    if (targets.length >= 100) {
      throw new IllegalStateException("Targets must be less than 100 in size!");
    } else {
      for (int i = 0; i < targets.length; i++) {
        targets[i] = new Random().nextInt();
      }

      int old = this.index;

      for (int depth = 0; targets[this.index] == targets[old]; depth++) {
        this.index = new Random().nextInt(targets.length);
        if (depth > 100) {
          throw new IllegalStateException("Depth overflow");
        }
      }

      if (old == this.index) {
        throw new IllegalStateException("Index cannot be duplicated!");
      } else {
        System.out.println("Finished weird loop test!");
      }
    }
  }
}
