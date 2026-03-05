package dev.sim0n.app.test.impl.inheritance;

public class ClassB implements ClassA {
  public void methodA() {
    this.methodB();
  }
  
  public void methodB() {
    System.out.println("Hello World from Method B");
  }
}