package dev.sim0n.app.test.impl.inheritance;

import dev.sim0n.app.test.Test;
import dev.sim0n.app.test.impl.inheritance.ClassB;

public class InheritanceTest implements Test {
  @Override
  public void run() {
    ClassB classA = new ClassB();
    classA.methodA();
  }
}
