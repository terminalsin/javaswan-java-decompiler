package dev.sim0n.app.test.impl.visitor;

import dev.sim0n.app.test.Test;

public class VisitorTest implements Test {
  @Override
  public void run() {
    final Visitor visitor = new AppVisitor();
    final Visitable visitable = new VisitableApp();
    visitable.accept(visitor);
  }
}
