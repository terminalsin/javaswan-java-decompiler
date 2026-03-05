package dev.sim0n.app.test.impl.interfaceoverlap;

public class InterfaceOverlapTest implements dev.sim0n.app.test.Test {
  public void run() {
    System.out.println("Running interface overlap test...");
    InterfaceOverlap interfaceOverlap = new InterfaceOverlap();
    interfaceOverlap.methodA();
    interfaceOverlap.methodB();
    System.out.println("Finished interface overlap test!");
  }
}