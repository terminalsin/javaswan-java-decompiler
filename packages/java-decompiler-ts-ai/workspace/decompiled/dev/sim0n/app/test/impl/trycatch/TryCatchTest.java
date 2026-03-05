package dev.sim0n.app.test.impl.trycatch;

public class TryCatchTest implements dev.sim0n.app.test.Test {
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