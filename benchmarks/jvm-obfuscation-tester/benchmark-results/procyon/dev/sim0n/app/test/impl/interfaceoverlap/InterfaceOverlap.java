package dev.sim0n.app.test.impl.interfaceoverlap;

public class InterfaceOverlap implements InterfaceA, InterfaceB {
  @Override
  public void methodA() {
    System.out.println("Hello world from method A");
  }

  @Override
  public void methodB() {
    System.out.println("Hello world from method B");
  }
}
