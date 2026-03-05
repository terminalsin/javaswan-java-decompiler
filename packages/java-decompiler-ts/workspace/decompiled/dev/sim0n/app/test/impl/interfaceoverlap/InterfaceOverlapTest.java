package dev.sim0n.app.test.impl.interfaceoverlap;

import dev.sim0n.app.test.Test;

public class InterfaceOverlapTest implements Test {
  public void run() {
    System.out.println("Running interface overlap test...");
    InterfaceOverlap interfaceOverlap = new InterfaceOverlap();
    interfaceOverlap.methodA();
    interfaceOverlap.methodB();
    System.out.println("Finished interface overlap test!");
  }
}