package dev.sim0n.app.test.impl.visitor;

import dev.sim0n.app.test.Test;

public class VisitorTest implements Test {
  public void run() {
    Visitor visitor = new AppVisitor();
    Visitable visitable = new VisitableApp();
    visitable.accept(visitor);
  }
}