package dev.sim0n.app.test.impl.visitor;

public class VisitorTest implements dev.sim0n.app.test.Test {
  public void run() {
    Visitor visitor = new AppVisitor();
    Visitable visitable = new VisitableApp();
    visitable.accept(visitor);
  }
}