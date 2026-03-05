package dev.sim0n.app.test.impl.trycatch;

import dev.sim0n.app.test.Test;

public class TryCatchTest implements Test {
  private static final String string = "DO_NOT_ENCRYPT_THIS_STRING";

  public void run() {
    try {
      System.out.println("Hello World from inside try catch ");
    } catch (Exception e) {
      e.printStackTrace();
    }
    System.out.println("Hello World from outside try catch!");
  }
}
