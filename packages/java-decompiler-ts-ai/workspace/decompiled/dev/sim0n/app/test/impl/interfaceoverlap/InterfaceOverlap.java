package dev.sim0n.app.test.impl.interfaceoverlap;

public class InterfaceOverlap implements InterfaceA, InterfaceB {
  public void methodA() {
    System.out.println("Hello world from method A");
  }
  
  public void methodB() {
    System.out.println("Hello world from method B");
  }
}