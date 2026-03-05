package dev.sim0n.app.test.impl.visitor;

import dev.sim0n.app.test.Test;
import dev.sim0n.app.test.impl.visitor.AppVisitor;
import dev.sim0n.app.test.impl.visitor.VisitableApp;

public class VisitorTest implements Test {
  @Override
  public void run() {
    AppVisitor visitor = new AppVisitor();
    VisitableApp visitable = new VisitableApp();
    visitable.accept(visitor);
  }
}
