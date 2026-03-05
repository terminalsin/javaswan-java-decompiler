package dev.sim0n.app.test.impl.visitor;

import dev.sim0n.app.test.impl.visitor.Visitable;
import dev.sim0n.app.test.impl.visitor.Visitor;

public class VisitableApp implements Visitable {
  @Override
  public void accept(Visitor visitor) {
    visitor.visit(System.out);
  }
}
