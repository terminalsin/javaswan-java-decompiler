package dev.sim0n.app.test.impl.visitor;

public class VisitableApp implements Visitable {
  @Override
  public void accept(final Visitor visitor) {
    visitor.visit(System.out);
  }
}
