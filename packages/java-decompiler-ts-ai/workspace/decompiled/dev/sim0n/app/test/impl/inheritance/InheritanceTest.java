package dev.sim0n.app.test.impl.inheritance;

public class InheritanceTest implements dev.sim0n.app.test.Test {
  public void run() {
    ClassA classA = new ClassB();
    classA.methodA();
  }
}